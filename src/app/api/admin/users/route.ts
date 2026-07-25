// src/app/api/admin/users/route.ts
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { hash } from "bcrypt";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Only super admins can view users." },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const partyType = searchParams.get("partyType") || "all";
    
    const skip = (page - 1) * limit;

    // Build where clause
    let where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { id: parseInt(search) || 0 },
      ];
    }
    
    if (status === "verified") {
      where.emailVerified = { not: null };
    } else if (status === "unverified") {
      where.emailVerified = null;
    }
    
    if (partyType !== "all") {
      where.party = { type: partyType };
    }

    // Get users with related data
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          party: {
            include: {
              individual: true,
              organization: true,
              community: true,
              roles: {
                select: {
                  role_name: true,
                  platform: true,
                  is_active: true,
                }
              }
            }
          },
          accounts: {
            select: {
              provider: true,
            }
          },
          sessions: {
            select: {
              id: true,
              expires: true,
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    // Get stats
    const stats = {
      total,
      verified: await prisma.user.count({ where: { emailVerified: { not: null } } }),
      unverified: await prisma.user.count({ where: { emailVerified: null } }),
      withParty: await prisma.user.count({ where: { party_id: { not: null } } }),
      withoutParty: await prisma.user.count({ where: { party_id: null } }),
      byProvider: {
        email: await prisma.user.count({ 
          where: { 
            accounts: { 
              none: {} 
            } 
          } 
        }),
        google: await prisma.account.count({ 
          where: { provider: "google" } 
        }),
        github: await prisma.account.count({ 
          where: { provider: "github" } 
        }),
      },
    };

    // Transform users for client
    const transformedUsers = users.map(user => {
      // Get party details
      let partyName = "";
      let partySlug = "";
      let partyStatus = user.party?.status;
      
      if (user.party) {
        if (user.party.individual) {
          partyName = `${user.party.individual.first_name} ${user.party.individual.last_name}`;
          partySlug = user.party.slug;
        } else if (user.party.organization) {
          partyName = user.party.organization.name;
          partySlug = user.party.slug;
        } else if (user.party.community) {
          partyName = user.party.community.name;
          partySlug = user.party.slug;
        }
      }

      // Get user roles
      const roles = user.party?.roles || [];
      const activeRoles = roles.filter(r => r.is_active).map(r => r.role_name);

      // Get auth providers
      const providers = user.accounts?.map(a => a.provider) || [];

      return {
        id: user.id,
        uid: user.uid,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        partyId: user.party_id,
        partyType: user.party?.type,
        partyName,
        partySlug,
        partyStatus,
        roles: activeRoles,
        providers,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        sessionCount: user.sessions?.length || 0,
      };
    });

    return NextResponse.json({
      users: transformedUsers,
      stats,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Only super admins can create users." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      email, 
      password, 
      full_name, 
      phone, 
      party_type, 
      platform,
      registration_source,
      individual,
      organization,
      community,
      role 
    } = body;

    // Validate required fields
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    if (!full_name) return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    if (!platform) return NextResponse.json({ error: "Platform is required" }, { status: 400 });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    // Create user with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate slug
      const baseSlug = full_name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
      let slug = baseSlug;
      let counter = 1;
      while (await tx.parties.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Create user
      const hashedPassword = await hash(password, 10);
      const user = await tx.user.create({
        data: {
          email,
          name: full_name,
        },
      });

      // Create party
      const party = await tx.parties.create({
        data: {
          type: party_type,
          status: "PENDING_PROFILE",
          slug: slug,
          user_id: user.id,
          created_by: session.user.partyId,
        },
      });

      // Update user with party_id
      await tx.user.update({
        where: { id: user.id },
        data: { party_id: party.id },
      });

      // Create party type specific data
      if (party_type === "INDIVIDUAL" && individual) {
        await tx.individual_party.create({
          data: {
            party_id: party.id,
            first_name: individual.first_name,
            last_name: individual.last_name,
            middle_name: individual.middle_name,
            date_of_birth: individual.date_of_birth ? new Date(individual.date_of_birth) : null,
            gender: individual.gender,
            nationality: individual.nationality || "NIGERIAN",
            farmer_type: individual.farmer_type,
            job_title: individual.job_title,
            employee_id: individual.employee_id,
            department: individual.department,
            password_hash: hashedPassword,
            preferred_name: full_name,
            primary_language: "ENGLISH",
            can_read: true,
            can_write: true,
            has_smartphone: true,
          },
        });
      } else if (party_type === "ORGANIZATION" && organization) {
        await tx.organization_party.create({
          data: {
            party_id: party.id,
            name: organization.name,
            legal_name: organization.legal_name,
            registration_number: organization.registration_number,
            tax_id: organization.tax_id,
            industry: organization.industry,
            organization_type: organization.organization_type || "COMPANY",
            country_of_incorporation: "NIGERIA",
            verified: false,
          },
        });
      } else if (party_type === "COMMUNITY" && community) {
        await tx.community_party.create({
          data: {
            party_id: party.id,
            name: community.name,
            community_type: community.community_type || "PASTORALIST",
            region: community.region,
            local_government: community.local_government,
            is_spv_beneficiary: false,
          },
        });
      }

      // Add contact if phone provided
      if (phone) {
        await tx.party_contacts.create({
          data: {
            party_id: party.id,
            type: "MOBILE",
            value: phone,
            is_primary: false,
            is_active: true,
            created_by: session.user.partyId,
          },
        });
      }

      // Add email contact
      await tx.party_contacts.create({
        data: {
          party_id: party.id,
          type: "EMAIL",
          value: email,
          is_primary: true,
          is_active: true,
          created_by: session.user.partyId,
        },
      });

      // Add role
      const roleName = role || (platform === "EMAP" ? "ADMIN" : platform === "EMAPS" ? "MANAGER" : "BUYER");
      await tx.party_roles.create({
        data: {
          party_id: party.id,
          role_name: roleName,
          platform: platform,
          is_active: true,
          assigned_date: new Date(),
          valid_from: new Date(),
          assigned_by: session.user.partyId,
          permissions: {},
        },
      });

      // Create wallet
      const accountNumber = `10${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      const wallet = await tx.wallets.create({
        data: {
          party_id: party.id,
          account_number: accountNumber,
          account_name: full_name,
          account_type: "STANDARD",
          currency: "NGN",
          balance: 0,
          ledger_balance: 0,
          available_balance: 0,
          is_active: true,
          is_locked: false,
          kyc_level: 1,
          created_by: session.user.partyId,
        },
      });

      // Create audit log
      await tx.party_audit_logs.create({
        data: {
          party_id: party.id,
          action: "USER_CREATED",
          action_category: "AUTH",
          entity_type: "USER",
          entity_id: user.id.toString(),
          platform: "ADMIN",
          success: true,
          notes: `User created by admin for ${platform} with role ${roleName}`,
          timestamp: new Date(),
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        party: {
          id: party.id,
          slug: party.slug,
          type: party.type,
          status: "PENDING_PROFILE",
        },
        wallet: {
          id: wallet.id,
          account_number: wallet.account_number,
        },
        role: roleName,
        platform,
      };
    });

    // Invalidate cache if needed
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_users_list_cache" }),
      });
    } catch (error) {
      console.error("Failed to invalidate cache:", error);
    }

    return NextResponse.json({ 
      success: true, 
      message: `${platform} user created successfully`, 
      data: result 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}