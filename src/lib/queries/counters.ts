import "server-only";

import { prisma } from "../db";

/**
 * Fetches a user from the database by their ID.
 * @param userId - The ID of the user to fetch.
 * @returns The user object or null if not found.
 */



export async function getNumberOfUsers(): Promise<number | null> {
  try {
    const numberCuss = await prisma.user.count();
    return numberCuss ?? null; // Return user or null if undefined
  } catch (error) {
    console.error("Failed to fetch user by ID:", error);
    return null;
  }
}




// export async function getNumberOfOrder(userId: string): Promise<number | null> {
//   try {
//     const numberOder = await prisma.order.count({
//       where: {
//         userId,
//       },
//     });
//     return numberOder ?? null; // Return user or null if undefined
//   } catch (error) {
//     console.error("Failed to fetch user by ID:", error);
//     return null;
//   }
// }

// const activeUsers = await prisma.user.count({
//   where: {
//     isActive: true,
//   },
// });
