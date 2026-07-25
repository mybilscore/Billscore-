// src/lib/services/user-verification.service.ts
import { prisma } from "../db";

export interface VerifyUserResult {
  success: boolean;
  message: string;
  user: {
    id: number;
    email: string | null;
    name: string | null;
    verifiedAt: Date;
  };
}

/**
 * Verify a user by setting emailVerified to current date
 */
export async function verifyUser(userId: number, verifiedBy: number): Promise<VerifyUserResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Find the user
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        party: true,
      },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // 2. Check if user is already verified
    if (user.emailVerified) {
      throw new Error(`User ${user.email} is already verified`);
    }

    // 3. Update user verification status
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        emailVerified: new Date(),
      },
    });

    // 4. Update party verified status if party exists
    if (user.party) {
      await tx.parties.update({
        where: { id: user.party.id },
        data: {
          verified: true,
          verified_at: new Date(),
          verified_by: verifiedBy,
          verification_method: "ADMIN_VERIFICATION",
          // CRITICAL CHANGE: Set status to "PENDING_PROFILE" instead of "ACTIVE"
          // This will trigger the profile completion modal
          status: "PENDING_PROFILE", // ← Changed from "ACTIVE" to "PENDING_PROFILE"
        },
      });

      // Update party tags
      await tx.party_tags.upsert({
        where: {
          party_id_tag_name: {
            party_id: user.party.id,
            tag_name: "VERIFIED",
          },
        },
        update: {},
        create: {
          party_id: user.party.id,
          tag_name: "VERIFIED",
          tag_category: "STATUS",
          applied_by: verifiedBy,
          applied_date: new Date(),
        },
      });

      // Add PENDING_PROFILE tag instead of removing it
      await tx.party_tags.upsert({
        where: {
          party_id_tag_name: {
            party_id: user.party.id,
            tag_name: "PENDING_PROFILE",
          },
        },
        update: {},
        create: {
          party_id: user.party.id,
          tag_name: "PENDING_PROFILE",
          tag_category: "STATUS",
          applied_by: verifiedBy,
          applied_date: new Date(),
        },
      });
    }

    // 5. Create audit log
    await tx.party_audit_logs.create({
      data: {
        party_id: user.party?.id || 0,
        acting_for_id: user.party?.id || 0,
        action: "USER_VERIFIED",
        action_category: "AUTH",
        entity_type: "USER",
        entity_id: user.id.toString(),
        platform: "ADMIN",
        success: true,
        notes: `User ${user.email} verified by admin. Profile completion required.`,
        timestamp: new Date(),
      },
    });

    // 6. Create activity log
    if (user.party) {
      await tx.party_activity_log.create({
        data: {
          party_id: user.party.id,
          activity_type: "USER_VERIFICATION",
          activity_description: `User account verified by admin. Please complete your profile.`,
          created_at: new Date(),
        },
      });
    }

    console.log("✅ User verified and set to PENDING_PROFILE:", {
      userId: user.id,
      email: user.email,
      verifiedBy,
    });

    return {
      success: true,
      message: `User ${user.email} verified successfully. They can now complete their profile.`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        verifiedAt: updatedUser.emailVerified!,
      },
    };
  }, {
    timeout: 60000,   // 60 seconds timeout - prevents "Transaction already closed" error
    maxWait: 60000    // Maximum time to wait for transaction
  });
}

/**
 * Mark user profile as complete (call this after profile completion)
 */
export async function completeUserProfile(partyId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Update party status to ACTIVE
    await tx.parties.update({
      where: { id: partyId },
      data: {
        status: "ACTIVE",
      },
    });

    // Remove PENDING_PROFILE tag
    await tx.party_tags.deleteMany({
      where: {
        party_id: partyId,
        tag_name: "PENDING_PROFILE",
      },
    });

    // Add PROFILE_COMPLETE tag
    await tx.party_tags.upsert({
      where: {
        party_id_tag_name: {
          party_id: partyId,
          tag_name: "PROFILE_COMPLETE",
        },
      },
      update: {},
      create: {
        party_id: partyId,
        tag_name: "PROFILE_COMPLETE",
        tag_category: "STATUS",
        applied_date: new Date(),
      },
    });

    // Create activity log
    await tx.party_activity_log.create({
      data: {
        party_id: partyId,
        activity_type: "PROFILE_COMPLETION",
        activity_description: "User profile completed",
        created_at: new Date(),
      },
    });
  }, {
    timeout: 60000,   // 60 seconds timeout
    maxWait: 60000    // Maximum time to wait for transaction
  });
}

/**
 * Check if a user is verified
 */
export async function isUserVerified(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });
  return !!user?.emailVerified;
}

/**
 * Get verification status for multiple users
 */
export async function getUsersVerificationStatus(userIds: number[]): Promise<Map<number, boolean>> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, emailVerified: true },
  });
  
  const statusMap = new Map<number, boolean>();
  users.forEach(user => {
    statusMap.set(user.id, !!user.emailVerified);
  });
  
  return statusMap;
}

/**
 * Bulk verify users
 */
export async function bulkVerifyUsers(userIds: number[], verifiedBy: number): Promise<{
  success: number;
  failed: number;
  errors: Array<{ userId: number; error: string }>;
}> {
  let success = 0;
  let failed = 0;
  const errors: Array<{ userId: number; error: string }> = [];

  for (const userId of userIds) {
    try {
      await verifyUser(userId, verifiedBy);
      success++;
    } catch (error: any) {
      failed++;
      errors.push({ userId, error: error.message });
    }
  }

  return { success, failed, errors };
}