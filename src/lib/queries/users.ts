import "server-only";

import { prisma } from "../db";

/**
 * Fetches a user from the database by their ID.
 * @param userId - The ID of the user to fetch.
 * @returns The user object or null if not found.
 */



export async function getNumberOfCus(userId: string): Promise<number | null> {
  try {
    const numberCuss = await prisma.customer.count({
      where: {
        userId,
      },
    });
    return numberCuss ?? null; // Return user or null if undefined
  } catch (error) {
    console.error("Failed to fetch user by ID:", error);
    return null;
  }
}


// const activeUsers = await prisma.user.count({
//   where: {
//     isActive: true,
//   },
// });
