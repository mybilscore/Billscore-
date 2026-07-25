// app/api/auth/[...nextauth]/route.ts - FIXED
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "~/lib/db";
import { compare } from "bcrypt";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email/Username/Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("========================================");
        console.log("🔐 [AUTH] authorize() called");
        console.log("📝 credentials:", credentials);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
          return null; // Return null, don't throw
        }

        const identifier = credentials.email.trim();
        console.log(`🔍 Searching for identifier: "${identifier}"`);

        try {
          // FIX: Search by email, username, OR phone
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: identifier },
                { username: identifier },
                { phone: identifier },
              ],
            },
            include: { wallet: true },
          });

          console.log("📊 User found:", user ? "Yes" : "No");
          
          if (!user) {
            console.log("❌ No user found with identifier:", identifier);
            return null; // Return null, don't throw
          }

          console.log("✅ User found:", {
            id: user.id,
            email: user.email,
            username: user.username,
            phone: user.phone,
            hasPasswordHash: !!user.passwordHash,
          });

          if (!user.passwordHash) {
            console.log("❌ User has no password hash");
            return null; // Return null, don't throw
          }

          const isPasswordValid = await compare(credentials.password, user.passwordHash);
          console.log(`🔐 Password valid: ${isPasswordValid}`);

          if (!isPasswordValid) {
            console.log("❌ Invalid password");
            return null; // Return null, don't throw
          }

          console.log("✅ Authentication successful!");
          
          return {
            id: user.id,
            email: user.email || "",
            username: user.username,
            name: user.fullName,
            fullName: user.fullName,
            phone: user.phone,
            role: user.role,
            referralCode: user.referralCode,
            hasWallet: user.hasWallet,
            walletBalance: user.wallet?.walletBalance || 0,
          };
        } catch (error) {
          console.error("❌ Auth error:", error);
          return null; // Return null on error
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🔐 signIn callback called");
      // Handle social login - check if user exists by email
      if (account?.provider === "google" || account?.provider === "apple") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          // Create new user from social login
          const newUser = await prisma.user.create({
            data: {
              email: user.email!,
              fullName: user.name || "User",
              phone: "",
              isVerified: true,
              hasWallet: true,
              role: "END_USER",
              referralCode: generateReferralCode(),
              wallet: {
                create: {
                  accountNumber: await generateVirtualAccountNumber(),
                  bankName: "PALMPAY",
                  accountName: user.name || "User",
                  walletBalance: 0,
                  ledgerBalance: 0,
                  currency: "NGN",
                  isActive: true,
                  kycLevel: 1,
                },
              },
            },
            include: { wallet: true },
          });

          user.id = newUser.id;
          user.role = newUser.role;
          user.referralCode = newUser.referralCode;
        } else {
          user.id = existingUser.id;
          user.role = existingUser.role;
          user.referralCode = existingUser.referralCode;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.referralCode = user.referralCode;
        token.email = user.email;
        token.name = user.name;
        token.username = user.username;
        token.phone = user.phone;
        token.hasWallet = user.hasWallet;
        token.walletBalance = user.walletBalance;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.referralCode = token.referralCode as string;
        session.user.phone = token.phone as string;
        session.user.hasWallet = token.hasWallet as boolean;
        session.user.walletBalance = token.walletBalance as number;
        session.user.username = token.username as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Helper functions
function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "BIL-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateVirtualAccountNumber(): Promise<string> {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };