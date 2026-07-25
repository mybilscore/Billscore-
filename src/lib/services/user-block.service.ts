// src/lib/services/user-block.service.ts
import { prisma } from "../db";

export interface BlockUserResult {
  success: boolean;
  message: string;
  user: {
    id: number;
    email: string | null;
    name: string | null;
    status: string;
    blockedAt?: Date;
    unblockedAt?: Date;
  };
}

/**
 * Block a user by setting party status to BLOCKED
 */
export async function blockUser(userId: number, blockedBy: number): Promise<BlockUserResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Find the user with party
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        party: true,
      },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (!user.party) {
      throw new Error(`User ${user.email} does not have a party associated`);
    }

    // 2. Check if already blocked
    if (user.party.status === "BLOCKED") {
      throw new Error(`User ${user.email} is already blocked`);
    }

    // 3. Update party status to BLOCKED
    const updatedParty = await tx.parties.update({
      where: { id: user.party.id },
      data: {
        status: "BLOCKED",
        updated_at: new Date(),
        updated_by: blockedBy,
      },
    });

    // 4. Add block tag
    await tx.party_tags.upsert({
      where: {
        party_id_tag_name: {
          party_id: user.party.id,
          tag_name: "BLOCKED",
        },
      },
      update: {},
      create: {
        party_id: user.party.id,
        tag_name: "BLOCKED",
        tag_category: "STATUS",
        applied_by: blockedBy,
        applied_date: new Date(),
      },
    });

    // 5. Remove ACTIVE tag if exists
    await tx.party_tags.deleteMany({
      where: {
        party_id: user.party.id,
        tag_name: "ACTIVE",
      },
    });

    // 6. Invalidate all active sessions
    await tx.party_sessions.updateMany({
      where: {
        party_id: user.party.id,
        is_valid: true,
      },
      data: {
        is_valid: false,
        invalidated_at: new Date(),
        invalidated_by: blockedBy,
      },
    });

    // 7. Create audit log
    await tx.party_audit_logs.create({
      data: {
        party_id: user.party.id,
        acting_for_id: user.party.id,
        action: "USER_BLOCKED",
        action_category: "SECURITY",
        entity_type: "USER",
        entity_id: user.id.toString(),
        platform: "ADMIN",
        success: true,
        notes: `User ${user.email} blocked by admin`,
        timestamp: new Date(),
      },
    });

    // 8. Create activity log
    await tx.party_activity_log.create({
      data: {
        party_id: user.party.id,
        activity_type: "USER_BLOCKED",
        activity_description: `User account blocked by admin`,
        created_at: new Date(),
      },
    });

    console.log("✅ User blocked:", {
      userId: user.id,
      email: user.email,
      blockedBy,
    });

    return {
      success: true,
      message: `User ${user.email} blocked successfully`,
      user: {
        id: updatedParty.id,
        email: user.email,
        name: user.name,
        status: "BLOCKED",
        blockedAt: new Date(),
      },
    };
  });
}

/**
 * Unblock a user by setting party status back to ACTIVE
 */
export async function unblockUser(userId: number, unblockedBy: number): Promise<BlockUserResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Find the user with party
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        party: true,
      },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (!user.party) {
      throw new Error(`User ${user.email} does not have a party associated`);
    }

    // 2. Check if not blocked
    if (user.party.status !== "BLOCKED") {
      throw new Error(`User ${user.email} is not blocked`);
    }

    // 3. Determine new status (if profile is complete, set to ACTIVE, else PENDING_PROFILE)
    const newStatus = user.party.verified ? "ACTIVE" : "PENDING_PROFILE";

    // 4. Update party status
    const updatedParty = await tx.parties.update({
      where: { id: user.party.id },
      data: {
        status: newStatus,
        updated_at: new Date(),
        updated_by: unblockedBy,
      },
    });

    // 5. Remove BLOCKED tag
    await tx.party_tags.deleteMany({
      where: {
        party_id: user.party.id,
        tag_name: "BLOCKED",
      },
    });

    // 6. Add ACTIVE tag if applicable
    if (newStatus === "ACTIVE") {
      await tx.party_tags.upsert({
        where: {
          party_id_tag_name: {
            party_id: user.party.id,
            tag_name: "ACTIVE",
          },
        },
        update: {},
        create: {
          party_id: user.party.id,
          tag_name: "ACTIVE",
          tag_category: "STATUS",
          applied_by: unblockedBy,
          applied_date: new Date(),
        },
      });
    }

    // 7. Create audit log
    await tx.party_audit_logs.create({
      data: {
        party_id: user.party.id,
        acting_for_id: user.party.id,
        action: "USER_UNBLOCKED",
        action_category: "SECURITY",
        entity_type: "USER",
        entity_id: user.id.toString(),
        platform: "ADMIN",
        success: true,
        notes: `User ${user.email} unblocked by admin`,
        timestamp: new Date(),
      },
    });

    // 8. Create activity log
    await tx.party_activity_log.create({
      data: {
        party_id: user.party.id,
        activity_type: "USER_UNBLOCKED",
        activity_description: `User account unblocked by admin`,
        created_at: new Date(),
      },
    });

    console.log("✅ User unblocked:", {
      userId: user.id,
      email: user.email,
      unblockedBy,
      newStatus,
    });

    return {
      success: true,
      message: `User ${user.email} unblocked successfully`,
      user: {
        id: updatedParty.id,
        email: user.email,
        name: user.name,
        status: newStatus,
        unblockedAt: new Date(),
      },
    };
  });
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      party: {
        select: { status: true },
      },
    },
  });
  return user?.party?.status === "BLOCKED";
}

/**
 * Get block status for multiple users
 */
export async function getUsersBlockStatus(userIds: number[]): Promise<Map<number, boolean>> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: {
      party: {
        select: { status: true },
      },
    },
  });
  
  const statusMap = new Map<number, boolean>();
  users.forEach(user => {
    statusMap.set(user.id, user.party?.status === "BLOCKED");
  });
  
  return statusMap;
}

/**
 * Bulk block users
 */
export async function bulkBlockUsers(userIds: number[], blockedBy: number): Promise<{
  success: number;
  failed: number;
  errors: Array<{ userId: number; error: string }>;
}> {
  let success = 0;
  let failed = 0;
  const errors: Array<{ userId: number; error: string }> = [];

  for (const userId of userIds) {
    try {
      await blockUser(userId, blockedBy);
      success++;
    } catch (error: any) {
      failed++;
      errors.push({ userId, error: error.message });
    }
  }

  return { success, failed, errors };
}

/**
 * Bulk unblock users
 */
export async function bulkUnblockUsers(userIds: number[], unblockedBy: number): Promise<{
  success: number;
  failed: number;
  errors: Array<{ userId: number; error: string }>;
}> {
  let success = 0;
  let failed = 0;
  const errors: Array<{ userId: number; error: string }> = [];

  for (const userId of userIds) {
    try {
      await unblockUser(userId, unblockedBy);
      success++;
    } catch (error: any) {
      failed++;
      errors.push({ userId, error: error.message });
    }
  }

  return { success, failed, errors };
}