// src/app/api/mobile/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcrypt";
import { prisma } from "~/lib/db";
import { sign } from "jsonwebtoken";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || "your-secret-key";

function getUserNameFromParty(party: any): string {
  if (party?.individual) {
    return `${party.individual.first_name || ''} ${party.individual.last_name || ''}`.trim() || "User";
  }
  if (party?.organization) {
    return party.organization.name || "User";
  }
  if (party?.community) {
    return party.community.name || "User";
  }
  return "User";
}

async function getUserBusinesses(partyId: number) {
  const farms = await prisma.cluster_farms.findMany({
    where: {
      OR: [
        { owner_party_id: partyId },
        { operator_party_id: partyId },
      ],
    },
    take: 5,
  });

  return farms.map(farm => ({
    bussinesId: farm.id.toString(),
    bussines_name: farm.name,
    link: `/farms/${farm.id}`,
    type: farm.farm_type || "Farm",
    address: "No location",
    aboutBusiness: `Area: ${farm.total_area_ha || 0} ha`,
    link_name: farm.name.toLowerCase().replace(/\s/g, '-'),
    whatsapp: null,
    logo: null,
    logo_public_id: null,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log("📱 [MOBILE AUTH] Login attempt for:", email);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        party: {
          include: {
            individual: true,
            organization: true,
            community: true,
            roles: { where: { is_active: true } },
            contacts: { where: { is_primary: true }, take: 1 },
          },
        },
      },
    });

    if (!user || !user.party) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    let isValid = false;
    if (user.party.individual?.password_hash) {
      isValid = await compare(password, user.party.individual.password_hash);
    } else if (user.password) {
      isValid = await compare(password, user.password);
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const businesses = await getUserBusinesses(user.party.id);

    // Generate token - include the user's slug
    const token = sign(
      {
        userId: user.id,
        partyId: user.party.id,
        email: user.email,
        role: user.party.roles[0]?.role_name || "USER",
        slug: user.party.slug,  // User's tenant slug
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Token generated for user:", email);
    console.log("✅ User slug:", user.party.slug);

    const mobileUser = {
      id: user.id,
      email: user.email,
      name: getUserNameFromParty(user.party),
      phone: user.party.contacts?.[0]?.value || "",
      pkey: user.party.slug,
      slug: user.party.slug,
      role: user.party.roles[0]?.role_name || "USER",
      subs_stat: user.party.status === "ACTIVE" ? 1 : 0,
      bussiness: businesses,
      bussinesId: businesses[0]?.bussinesId || "",
      createdAt: user.created_at.toISOString(),
      updatedAt: user.updated_at.toISOString(),
    };

    return NextResponse.json({
      message: "Login successful",
      token,
      expiresIn: "7d",
      user: mobileUser,
    });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}