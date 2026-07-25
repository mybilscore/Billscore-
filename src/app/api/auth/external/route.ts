// emap/src/app/api/auth/external/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { compare } from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get("x-api-key");
    const validApiKeys = [
      process.env.EMAPS_API_KEY,
      process.env.EMMP_API_KEY,
    ];
    
    if (!apiKey || !validApiKeys.includes(apiKey)) {
      console.log("❌ EMAP External: Invalid API key");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    console.log("🔐 EMAP External: Login attempt for:", email);

    // Find user with all roles and relationships
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        party: {
          include: {
            individual: true,
            organization: true,
            roles: {
              where: { is_active: true },
              select: {
                role_name: true,
                platform: true,
              }
            },
            // Get incoming MANAGES relationships (who manages this user)
            incoming_relationships: {
              where: {
                relationship_type: "MANAGES",
                is_active: true,
              },
              include: {
                from_party: {
                  select: {
                    id: true,
                    slug: true,
                    type: true,
                    organization: {
                      select: { name: true }
                    }
                  }
                }
              },
              take: 1,
            },
            // Get outgoing REPRESENTS relationships (who this user represents)
            outgoing_relationships: {
              where: {
                relationship_type: "REPRESENTS",
                is_active: true,
              },
              include: {
                to_party: {
                  select: {
                    id: true,
                    slug: true,
                    type: true,
                    organization: {
                      select: { name: true }
                    }
                  }
                }
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!user?.party) {
      console.log("❌ EMAP External: User not found");
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check password
    let isValid = false;
    if (user.party.individual?.password_hash) {
      isValid = await compare(password, user.party.individual.password_hash);
    } else if (user.password) {
      isValid = await compare(password, user.password);
    }

    if (!isValid) {
      console.log("❌ EMAP External: Invalid password");
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ============== CRITICAL: DETERMINE TENANT SLUG ==============
    let tenantSlug: string;
    const userSlug = user.party.slug;
    const userRoles = user.party.roles.map(r => r.role_name);
    const isSuperAdmin = userRoles.includes("SUPER_ADMIN");

    if (isSuperAdmin) {
      // Super admin: use their own slug as tenant slug
      tenantSlug = userSlug;
      console.log("👑 Super admin: tenantSlug =", tenantSlug);
    } 
    else if (user.party.incoming_relationships && user.party.incoming_relationships.length > 0) {
      // User is managed by a tenant (has MANAGES relationship from an organization)
      const managingParty = user.party.incoming_relationships[0].from_party;
      tenantSlug = managingParty.slug;
      console.log("🏢 User managed by tenant via MANAGES relationship:", tenantSlug);
    }
    else if (user.party.outgoing_relationships && user.party.outgoing_relationships.length > 0) {
      // User represents an organization (is a representative)
      const representedParty = user.party.outgoing_relationships[0].to_party;
      tenantSlug = representedParty.slug;
      console.log("🏢 User represents tenant via REPRESENTS relationship:", tenantSlug);
    }
    else if (user.party.type === "ORGANIZATION") {
      // User IS the organization/tenant themselves
      tenantSlug = userSlug;
      console.log("🏢 User is the tenant organization:", tenantSlug);
    }
    else if (user.party.type === "INDIVIDUAL") {
      // Individual user - check if they have a representative relationship via party_representatives
      const representativeRelation = await prisma.party_representatives.findFirst({
        where: {
          individual_id: user.party.individual?.id,
          is_active: true,
        },
        include: {
          represented_party: {
            select: { slug: true, type: true }
          }
        }
      });
      
      if (representativeRelation?.represented_party?.slug) {
        tenantSlug = representativeRelation.represented_party.slug;
        console.log("🏢 Individual is representative of tenant:", tenantSlug);
      } else {
        // Fallback: use own slug (but this shouldn't happen for team members)
        tenantSlug = userSlug;
        console.log("⚠️ Individual with no tenant relationship - using own slug:", tenantSlug);
      }
    }
    else {
      // Default fallback
      tenantSlug = userSlug;
      console.log("⚠️ Default fallback - tenantSlug =", tenantSlug);
    }

    // Get unique platforms from roles
    const platforms = [...new Set(user.party.roles.map(r => r.platform))];
    
    // Get all roles
    const roles = user.party.roles.map(r => ({
      name: r.role_name,
      platform: r.platform
    }));

    // Determine primary role (first role or most important)
    const primaryRole = user.party.roles[0]?.role_name || "USER";

    console.log("✅ EMAP External: Auth successful for:", email);
    console.log("📊 EMAP External: User slug:", userSlug);
    console.log("📊 EMAP External: Tenant slug:", tenantSlug);
    console.log("📊 EMAP External: Platforms:", platforms);
    console.log("📊 EMAP External: Roles:", roles);

    // Return user data with BOTH slug and tenantSlug
    return NextResponse.json({
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      partyId: user.party.id,
      partyType: user.party.type,
      partyStatus: user.party.status,
      role: primaryRole,
      roles: roles,
      platforms: platforms,
      isSuperAdmin: isSuperAdmin,
      slug: userSlug,                    // Individual user slug (e.g., "elmeena-john-doe")
      tenantSlug: tenantSlug,            // Organization tenant slug (e.g., "elmeena") 👈 ADD THIS
    });

  } catch (error) {
    console.error("💥 EMAP External auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}