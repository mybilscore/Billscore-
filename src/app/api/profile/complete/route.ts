// src/app/api/profile/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { z } from "zod";

// Transaction timeout configuration
const TRANSACTION_TIMEOUT = {
  timeout: 30000,   // 30 seconds timeout
  maxWait: 30000    // Maximum time to wait for transaction
};

// Define schemas here or import them
const individualProfileSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  middle_name: z.string().optional(),
  date_of_birth: z.string().transform(str => new Date(str)),
  gender: z.string().optional(),
  nationality: z.string().default("NIGERIAN"),
  id_type: z.string().optional(),
  id_number: z.string().optional(),
  occupation: z.string().optional(),
  farmer_type: z.string().optional(),
  years_farming: z.number().optional(),
  preferred_contact_method: z.string().optional(),
  primary_language: z.string().default("ENGLISH"),
  address: z.object({
    address_line1: z.string(),
    address_line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    country: z.string().default("NG"),
  }).optional(),
});

const organizationProfileSchema = z.object({
  legal_name: z.string(),
  trading_name: z.string().optional(),
  organization_type: z.string(),
  registration_number: z.string().optional(),
  tax_id: z.string().optional(),
  industry: z.string().optional(),
  year_founded: z.number().optional(),
  employee_count: z.number().optional(),
  website: z.string().url().optional(),
  market: z.string().optional(),
  preferred_currency: z.string().default("USD"),
  address: z.object({
    address_line1: z.string(),
    address_line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    country: z.string().default("NG"),
  }).optional(),
});

const communityProfileSchema = z.object({
  name: z.string(),
  community_type: z.string(),
  population: z.number().optional(),
  household_count: z.number().optional(),
  region: z.string(),
  local_government: z.string(),
  ward: z.string().optional(),
  village: z.string().optional(),
  has_electricity: z.boolean().optional(),
  has_water_supply: z.boolean().optional(),
  has_health_clinic: z.boolean().optional(),
  has_school: z.boolean().optional(),
  address: z.object({
    address_line1: z.string(),
    address_line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    country: z.string().default("NG"),
  }).optional(),
});

// Helper function to create permissions JSON string
function createPermissions(permissionsObj: any = {}): string {
  return JSON.stringify(permissionsObj);
}

// Service functions
async function completeIndividualProfile(
  partyId: number,
  userId: number,
  data: z.infer<typeof individualProfileSchema>
) {
  return await prisma.$transaction(async (tx) => {
    // Update individual party
    await tx.individual_party.update({
      where: { party_id: partyId },
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        nationality: data.nationality,
        id_type: data.id_type,
        id_number: data.id_number,
        occupation: data.occupation,
        farmer_type: data.farmer_type,
        years_farming: data.years_farming,
        preferred_contact_method: data.preferred_contact_method,
        primary_language: data.primary_language,
      },
    });

    // Add address if provided
    if (data.address) {
      await tx.party_addresses.create({
        data: {
          party_id: partyId,
          type: "RESIDENTIAL",
          address_line1: data.address.address_line1,
          address_line2: data.address.address_line2,
          city: data.address.city,
          state: data.address.state,
          country: data.address.country,
          is_primary: true,
          is_active: true,
          created_by: userId,
        },
      });
    }

    // Add farmer role
    await tx.party_roles.create({
      data: {
        party_id: partyId,
        role_name: "FARMER",
        platform: "EMAPS",
        is_active: true,
        assigned_date: new Date(),
        valid_from: new Date(),
        assigned_by: userId,
        permissions: createPermissions({ farmer: true, can_harvest: true }),
      },
    });

    // Update party status
    await tx.parties.update({
      where: { id: partyId },
      data: {
        status: "ACTIVE",
        updated_at: new Date(),
      },
    });

    return { success: true };
  }, TRANSACTION_TIMEOUT);
}

async function completeOrganizationProfile(
  partyId: number,
  userId: number,
  data: z.infer<typeof organizationProfileSchema>
) {
  return await prisma.$transaction(async (tx) => {
    // Check if organization party exists
    const existingOrg = await tx.organization_party.findUnique({
      where: { party_id: partyId }
    });

    if (!existingOrg) {
      await tx.organization_party.create({
        data: {
          party_id: partyId,
          name: data.legal_name,
          legal_name: data.legal_name,
          trading_name: data.trading_name,
          organization_type: data.organization_type,
          registration_number: data.registration_number,
          tax_id: data.tax_id,
          industry: data.industry,
          year_founded: data.year_founded,
          employee_count: data.employee_count,
          website: data.website,
        },
      });
    }

    // Add address if provided
    if (data.address) {
      await tx.party_addresses.create({
        data: {
          party_id: partyId,
          type: "BUSINESS",
          address_line1: data.address.address_line1,
          address_line2: data.address.address_line2,
          city: data.address.city,
          state: data.address.state,
          country: data.address.country,
          is_primary: true,
          is_active: true,
          created_by: userId,
        },
      });
    }

    // Add buyer role
    await tx.party_roles.create({
      data: {
        party_id: partyId,
        role_name: "BUYER",
        platform: "EMMP",
        is_active: true,
        assigned_date: new Date(),
        valid_from: new Date(),
        assigned_by: userId,
        permissions: createPermissions({ buyer: true, can_purchase: true }),
      },
    });

    // Check if buyer profile exists
    const existingBuyer = await tx.emmp_buyers.findUnique({
      where: { party_id: partyId }
    });

    if (!existingBuyer) {
      await tx.emmp_buyers.create({
        data: {
          party_id: partyId,
          buyer_type: "ORGANIZATION",
          buyer_category: "ACTIVE",
          company_name: data.legal_name,
          market: data.market || "DOMESTIC",
          country: data.address?.country || "NIGERIA",
          kyc_status: "PENDING",
          status: "ACTIVE",
          created_by_id: userId,
          preferred_currency: data.preferred_currency,
          preferred_language: "EN",
        },
      });
    }

    // Update party status
    await tx.parties.update({
      where: { id: partyId },
      data: {
        status: "ACTIVE",
        updated_at: new Date(),
      },
    });

    return { success: true };
  }, TRANSACTION_TIMEOUT);
}

async function completeCommunityProfile(
  partyId: number,
  userId: number,
  data: z.infer<typeof communityProfileSchema>
) {
  return await prisma.$transaction(async (tx) => {
    // Check if community party exists
    const existingCommunity = await tx.community_party.findUnique({
      where: { party_id: partyId }
    });

    if (!existingCommunity) {
      await tx.community_party.create({
        data: {
          party_id: partyId,
          name: data.name,
          community_type: data.community_type,
          population: data.population,
          household_count: data.household_count,
          region: data.region,
          local_government: data.local_government,
          ward: data.ward,
          village: data.village,
          has_electricity: data.has_electricity,
          has_water_supply: data.has_water_supply,
          has_health_clinic: data.has_health_clinic,
          has_school: data.has_school,
        },
      });
    }

    // Add address if provided
    if (data.address) {
      await tx.party_addresses.create({
        data: {
          party_id: partyId,
          type: "BUSINESS",
          address_line1: data.address.address_line1,
          address_line2: data.address.address_line2,
          city: data.address.city,
          state: data.address.state,
          country: data.address.country,
          is_primary: true,
          is_active: true,
          created_by: userId,
        },
      });
    }

    // Add community role
    await tx.party_roles.create({
      data: {
        party_id: partyId,
        role_name: "COMMUNITY",
        platform: "EMAPS",
        is_active: true,
        assigned_date: new Date(),
        valid_from: new Date(),
        assigned_by: userId,
        permissions: createPermissions({ community: true, can_manage_members: true }),
      },
    });

    // Update party status
    await tx.parties.update({
      where: { id: partyId },
      data: {
        status: "ACTIVE",
        updated_at: new Date(),
      },
    });

    return { success: true };
  }, TRANSACTION_TIMEOUT);
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    console.log("Profile completion API called");
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Session user:", session.user);

    const body = await request.json();
    console.log("Request body:", body);
    
    const { partyType, ...profileData } = body;

    // Check if party exists
    const party = await prisma.parties.findUnique({
      where: { id: session.user.partyId },
    });

    if (!party) {
      console.log("Party not found for ID:", session.user.partyId);
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    console.log("Found party:", party);

    let result;
    switch (partyType) {
      case "INDIVIDUAL":
        console.log("Processing INDIVIDUAL profile");
        const validatedIndividual = individualProfileSchema.parse(profileData);
        result = await completeIndividualProfile(
          session.user.partyId,
          parseInt(session.user.id),
          validatedIndividual
        );
        break;
      case "ORGANIZATION":
        console.log("Processing ORGANIZATION profile");
        const validatedOrg = organizationProfileSchema.parse(profileData);
        result = await completeOrganizationProfile(
          session.user.partyId,
          parseInt(session.user.id),
          validatedOrg
        );
        break;
      case "COMMUNITY":
        console.log("Processing COMMUNITY profile");
        const validatedCommunity = communityProfileSchema.parse(profileData);
        result = await completeCommunityProfile(
          session.user.partyId,
          parseInt(session.user.id),
          validatedCommunity
        );
        break;
      default:
        console.log("Invalid party type:", partyType);
        return NextResponse.json({ error: "Invalid party type" }, { status: 400 });
    }

    console.log("Profile completed successfully");
    return NextResponse.json({
      success: true,
      message: "Profile completed successfully",
      redirect: "/dashboard",
      data: result,
    });

  } catch (error: any) {
    console.error("Profile completion error:", error);

    if (error.name === "ZodError") {
      return NextResponse.json({
        error: "Validation failed",
        details: error.errors,
      }, { status: 400 });
    }

    if (error.code === 'P2002') {
      return NextResponse.json({
        error: "Some information already exists. Please check your details.",
      }, { status: 400 });
    }

    return NextResponse.json({
      error: "Internal server error",
      message: error.message
    }, { status: 500 });
  }
}

// OPTIONAL: Add GET handler for testing
export async function GET() {
  return NextResponse.json({ 
    message: "Profile completion API is working",
    status: "ready" 
  });
}