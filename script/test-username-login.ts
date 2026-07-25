// scripts/test-username-login.ts
// import { prisma } from "../lib/db";
import { prisma } from "~/lib/db";
import { compare } from "bcrypt";

async function testUsernameLogin() {
  const username = "mine"; // Replace with actual username
  const password = "2338@Hajara"; // Replace with actual password

  console.log(`🔍 Testing login with username: "${username}"`);

  try {
    // Find user by username
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
        },
      },
    });

    if (!user) {
      console.log(`❌ User not found with username: "${username}"`);
      return;
    }

    console.log("✅ User found:", {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      hasHash: !!user.passwordHash,
    });

    if (!user.passwordHash) {
      console.log("❌ No password hash for user");
      return;
    }

    // Test password
    const isValid = await compare(password, user.passwordHash);
    console.log(`🔐 Password valid: ${isValid}`);

    if (isValid) {
      console.log("✅ Login successful with username!");
    } else {
      console.log("❌ Password incorrect");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testUsernameLogin();