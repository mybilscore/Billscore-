// src/lib/services/profile-completion.service.ts
import { prisma } from "../db";
import { z } from "zod";

// Transaction timeout configuration
const TRANSACTION_TIMEOUT = {
  timeout: 60000,   // 60 seconds timeout
  maxWait: 60000    // Maximum time to wait for transaction
};

// Individual profile schema
export const individualProfileSchema = z.object({
  // Personal details
  first_name: z.string(),
  last_name: z.string(),
  middle_name: z.string().optional(),
  date_of_birth: z.string().transform(str => new Date(str)),
  gender: z.string().optional(),
  nationality: z.string().default("NIGERIAN"),
  
  // ID details
  id_type: z.string().optional(),
  id_number: z.string().optional(),
  
  // Occupation
  occupation: z.string().optional(),
  farmer_type: z.string().optional(),
  years_farming: z.number().optional(),
  
  // Address
  address: z.object({
    address_line1: z.string(),
    address_line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    country: z.string().default("NG"),
  }).optional(),
  
  // Contact preferences
  preferred_contact_method: z.string().optional(),
  primary_language: z.string().default("ENGLISH"),
  
  // ✅ NEW: For team members, specify if this is a tenant or not
  is_tenant: z.boolean().optional().default(false),
});

// Organization profile schema
export const organizationProfileSchema = z.object({
  legal_name: z.string(),
  trading_name: z.string().optional(),
  organization_type: z.string(),
  registration_number: z.string().optional(),
  tax_id: z.string().optional(),
  industry: z.string().optional(),
  year_founded: z.number().optional(),
  employee_count: z.number().optional(),
  website: z.string().url().optional(),
  
  // Address
  address: z.object({
    address_line1: z.string(),
    address_line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    country: z.string().default("NG"),
  }).optional(),
  
  // For EMMP buyers
  market: z.string().optional(),
  preferred_currency: z.string().default("USD"),
  
  // ✅ NEW: Organizations are always tenants
  is_tenant: z.boolean().optional().default(true),
});

// Community profile schema
export const communityProfileSchema = z.object({
  name: z.string(),
  community_type: z.string(),
  population: z.number().optional(),
  household_count: z.number().optional(),
  region: z.string(),
  local_government: z.string(),
  ward: z.string().optional(),
  village: z.string().optional(),
  
  // Address
  address: z.object({
    address_line1: z.string(),
    address_line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    country: z.string().default("NG"),
  }).optional(),
  
  // Facilities
  has_electricity: z.boolean().optional(),
  has_water_supply: z.boolean().optional(),
  has_health_clinic: z.boolean().optional(),
  has_school: z.boolean().optional(),
  
  // ✅ NEW: Communities might be tenants if they manage members
  is_tenant: z.boolean().optional().default(false),
});

export async function completeIndividualProfile(
  partyId: number,
  userId: number,
  data: z.infer<typeof individualProfileSchema>
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Get the party to check if it's already a tenant
    const party = await tx.parties.findUnique({
      where: { id: partyId },
      include: {
        incoming_relationships: {
          where: {
            relationship_type: "MANAGES",
            is_active: true,
          },
          take: 1,
        },
      },
    });

    if (!party) {
      throw new Error("Party not found");
    }

    // 2. Update individual party with all details
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

    // 3. Add address if provided
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

    // 4. Add farmer role for EMAPS
    await tx.party_roles.create({
      data: {
        party_id: partyId,
        role_name: "FARMER",
        platform: "EMAPS",
        is_active: true,
        assigned_date: new Date(),
        valid_from: new Date(),
        assigned_by: userId,
        permissions: {},
      },
    });

    // 5. ✅ NEW: If this individual is a tenant, ensure they have ADMIN role
    if (data.is_tenant) {
      const existingAdminRole = await tx.party_roles.findFirst({
        where: {
          party_id: partyId,
          role_name: "ADMIN",
          is_active: true,
        },
      });

      if (!existingAdminRole) {
        await tx.party_roles.create({
          data: {
            party_id: partyId,
            role_name: "ADMIN",
            platform: "EMAP",
            is_active: true,
            assigned_date: new Date(),
            valid_from: new Date(),
            assigned_by: userId,
            permissions: {},
          },
        });
      }
    }

    // 6. Update party status
    await tx.parties.update({
      where: { id: partyId },
      data: {
        status: "ACTIVE",
        updated_at: new Date(),
      },
    });

    // 7. ✅ NEW: Log the profile completion
    await tx.party_audit_logs.create({
      data: {
        party_id: partyId,
        action: "PROFILE_COMPLETED",
        action_category: "PROFILE",
        entity_type: "INDIVIDUAL",
        entity_id: partyId.toString(),
        platform: "EMAP",
        success: true,
        notes: `Individual profile completed. Is tenant: ${data.is_tenant}`,
        acting_for_id: party.incoming_relationships[0]?.from_party_id || null,
      },
    });

    return { 
      success: true,
      isTenant: data.is_tenant,
    };
  }, TRANSACTION_TIMEOUT);
}

export async function completeOrganizationProfile(
  partyId: number,
  userId: number,
  data: z.infer<typeof organizationProfileSchema>
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Get the party
    const party = await tx.parties.findUnique({
      where: { id: partyId },
    });

    if (!party) {
      throw new Error("Party not found");
    }

    // 2. Check if organization party already exists
    const existingOrg = await tx.organization_party.findUnique({
      where: { party_id: partyId }
    });

    if (!existingOrg) {
      // Create organization party with details
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

    // 3. Add address if provided
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

    // 4. Add buyer role for EMMP
    await tx.party_roles.create({
      data: {
        party_id: partyId,
        role_name: "ADMIN",
        platform: "EMMP",
        is_active: true,
        assigned_date: new Date(),
        valid_from: new Date(),
        assigned_by: userId,
        permissions: {},
      },
    });

    // 5. ✅ NEW: Ensure ADMIN role for organizations (they are tenants)
    const existingAdminRole = await tx.party_roles.findFirst({
      where: {
        party_id: partyId,
        role_name: "ADMIN",
        is_active: true,
      },
    });

    if (!existingAdminRole) {
      await tx.party_roles.create({
        data: {
          party_id: partyId,
          role_name: "ADMIN",
          platform: "EMAP",
          is_active: true,
          assigned_date: new Date(),
          valid_from: new Date(),
          assigned_by: userId,
          permissions: {},
        },
      });
    }

    // 6. Check if buyer profile already exists
    const existingBuyer = await tx.emmp_buyers.findUnique({
      where: { party_id: partyId }
    });

    if (!existingBuyer) {
      // Create buyer profile in EMMP
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

    // 7. Update party status
    await tx.parties.update({
      where: { id: partyId },
      data: {
        status: "ACTIVE",
        updated_at: new Date(),
      },
    });

    // 8. ✅ NEW: Log the profile completion
    await tx.party_audit_logs.create({
      data: {
        party_id: partyId,
        action: "PROFILE_COMPLETED",
        action_category: "PROFILE",
        entity_type: "ORGANIZATION",
        entity_id: partyId.toString(),
        platform: "EMAP",
        success: true,
        notes: `Organization profile completed. Is tenant: true`,
      },
    });

    return { 
      success: true,
      isTenant: true, // Organizations are always tenants
    };
  }, TRANSACTION_TIMEOUT);
}

// Updated community profile completion
export async function completeCommunityProfile(
  partyId: number,
  userId: number,
  data: z.infer<typeof communityProfileSchema>
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Get the party
    const party = await tx.parties.findUnique({
      where: { id: partyId },
    });

    if (!party) {
      throw new Error("Party not found");
    }

    // 2. Check if community party already exists
    const existingCommunity = await tx.community_party.findUnique({
      where: { party_id: partyId }
    });

    if (!existingCommunity) {
      // Create community party with details
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

    // 3. Add address if provided
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

    // 4. Add community role
    await tx.party_roles.create({
      data: {
        party_id: partyId,
        role_name: "COMMUNITY",
        platform: "EMAPS",
        is_active: true,
        assigned_date: new Date(),
        valid_from: new Date(),
        assigned_by: userId,
        permissions: {},
      },
    });

    // 5. ✅ NEW: If community is a tenant, add ADMIN role
    if (data.is_tenant) {
      const existingAdminRole = await tx.party_roles.findFirst({
        where: {
          party_id: partyId,
          role_name: "ADMIN",
          is_active: true,
        },
      });

      if (!existingAdminRole) {
        await tx.party_roles.create({
          data: {
            party_id: partyId,
            role_name: "ADMIN",
            platform: "EMAP",
            is_active: true,
            assigned_date: new Date(),
            valid_from: new Date(),
            assigned_by: userId,
            permissions: {},
          },
        });
      }
    }

    // 6. Update party status
    await tx.parties.update({
      where: { id: partyId },
      data: {
        status: "ACTIVE",
        updated_at: new Date(),
      },
    });

    // 7. ✅ NEW: Log the profile completion
    await tx.party_audit_logs.create({
      data: {
        party_id: partyId,
        action: "PROFILE_COMPLETED",
        action_category: "PROFILE",
        entity_type: "COMMUNITY",
        entity_id: partyId.toString(),
        platform: "EMAP",
        success: true,
        notes: `Community profile completed. Is tenant: ${data.is_tenant}`,
      },
    });

    return { 
      success: true,
      isTenant: data.is_tenant || false,
    };
  }, TRANSACTION_TIMEOUT);
}

// ✅ NEW: Helper function to check profile completion status
export async function getProfileCompletionStatus(partyId: number) {
  const party = await prisma.parties.findUnique({
    where: { id: partyId },
    include: {
      individual: true,
      organization: true,
      community: true,
      addresses: true,
      roles: true,
    },
  });

  if (!party) return null;

  const isComplete = party.status === "ACTIVE";
  const missingFields: string[] = [];

  if (party.type === "INDIVIDUAL" && party.individual) {
    if (!party.individual.first_name) missingFields.push("first_name");
    if (!party.individual.last_name) missingFields.push("last_name");
    if (!party.individual.date_of_birth) missingFields.push("date_of_birth");
  } else if (party.type === "ORGANIZATION" && party.organization) {
    if (!party.organization.legal_name) missingFields.push("legal_name");
    if (!party.organization.organization_type) missingFields.push("organization_type");
  } else if (party.type === "COMMUNITY" && party.community) {
    if (!party.community.name) missingFields.push("name");
    if (!party.community.community_type) missingFields.push("community_type");
  }

  if (party.addresses.length === 0) {
    missingFields.push("address");
  }

  return {
    isComplete,
    missingFields,
    completionPercentage: Math.max(0, 100 - (missingFields.length * 20)),
  };
}