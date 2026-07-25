// // app/api/profile/change-password/route.ts

// import { NextRequest, NextResponse } from "next/server";
// import { requireAuth } from "~/lib/auth";
// import { prisma } from "~/lib/db";
// import bcrypt from "bcryptjs";

// export async function POST(request: NextRequest) {
//   try {
//     const sessionUser = await requireAuth("/auth/sign-in");
//     const body = await request.json();
//     const { currentPassword, newPassword } = body;

//     // Validate
//     if (!currentPassword || !newPassword) {
//       return NextResponse.json({
//         success: false,
//         error: "Both current and new password are required",
//       }, { status: 400 });
//     }

//     if (newPassword.length < 8) {
//       return NextResponse.json({
//         success: false,
//         error: "New password must be at least 8 characters",
//       }, { status: 400 });
//     }

//     // Get user with password hash
//     const user = await prisma.user.findUnique({
//       where: { id: sessionUser.id },
//       select: { id: true, passwordHash: true },
//     });

//     if (!user || !user.passwordHash) {
//       return NextResponse.json({
//         success: false,
//         error: "User not found or password not set",
//       }, { status: 404 });
//     }

//     // Verify current password
//     const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
//     if (!isValid) {
//       return NextResponse.json({
//         success: false,
//         error: "Current password is incorrect",
//       }, { status: 401 });
//     }

//     // Hash new password
//     const hashedPassword = await bcrypt.hash(newPassword, 12);

//     // Update password
//     await prisma.user.update({
//       where: { id: sessionUser.id },
//       data: { passwordHash: hashedPassword },
//     });

//     return NextResponse.json({
//       success: true,
//       message: "Password changed successfully",
//     });
//   } catch (error: any) {
//     console.error("❌ Change password error:", error);
//     return NextResponse.json({
//       success: false,
//       error: error.message || "Failed to change password",
//     }, { status: 500 });
//   }
// }