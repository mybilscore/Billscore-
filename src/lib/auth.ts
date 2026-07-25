// lib/auth.ts - With enhanced logging

import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcrypt";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    username?: string | null;
    fullName?: string | null;
    phone: string;
    role: string;
    hasWallet: boolean;
    walletBalance: number;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      username?: string | null;
      fullName?: string | null;
      phone: string;
      role: string;
      hasWallet: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    username?: string | null;
    fullName?: string | null;
    phone: string;
    role: string;
    hasWallet: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email/Username/Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("========================================");
        console.log("🔐 [AUTH] authorize() called");
        console.log("📝 credentials:", JSON.stringify(credentials, null, 2));
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
          console.log("  - email:", credentials?.email);
          console.log("  - password:", credentials?.password ? "present" : "missing");
          return null;
        }

        const identifier = credentials.email.trim();
        const password = credentials.password;
        
        console.log(`🔍 Searching for identifier: "${identifier}"`);
        console.log(`🔑 Password length: ${password.length}`);

        try {
          // Search by email, username, or phone
          console.log("🔍 Executing database query...");
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: identifier },
                { username: identifier },
                { phone: identifier },
              ],
            },
          });

          if (!user) {
            console.log(`❌ No user found with identifier: "${identifier}"`);
            console.log("🔍 Checked fields: email, username, phone");
            
            // Debug: Check if any user exists with similar username
            const similarUsers = await prisma.user.findMany({
              where: {
                username: {
                  contains: identifier,
                },
              },
              select: {
                username: true,
                email: true,
                phone: true,
              },
              take: 5,
            });
            console.log("📋 Similar usernames found:", similarUsers);
            
            return null;
          }

          console.log("✅ User found in database:", {
            id: user.id,
            email: user.email,
            username: user.username,
            phone: user.phone,
            role: user.role,
            hasPasswordHash: !!user.passwordHash,
            passwordHashLength: user.passwordHash?.length || 0,
          });

          if (!user.passwordHash) {
            console.log("❌ User has NO password hash");
            return null;
          }

          console.log(`🔑 Password hash exists (length: ${user.passwordHash.length})`);
          
          // Verify password using bcrypt
          let isValid = false;
          try {
            console.log("🔐 Attempting bcrypt.compare()...");
            isValid = await compare(password, user.passwordHash);
            console.log(`🔐 Password comparison result: ${isValid}`);
          } catch (compareError) {
            console.error("❌ Bcrypt compare error:", compareError);
            console.error("❌ Error details:", {
              name: compareError instanceof Error ? compareError.name : 'Unknown',
              message: compareError instanceof Error ? compareError.message : String(compareError),
            });
            return null;
          }

          if (!isValid) {
            console.log(`❌ Invalid password for user: ${user.email || user.username}`);
            return null;
          }

          console.log("✅ Authentication successful!");
          
          const userResponse = {
            id: user.id,
            email: user.email || "",
            username: user.username,
            fullName: user.fullName,
            phone: user.phone,
            role: user.role,
            hasWallet: user.hasWallet,
            walletBalance: user.walletBalance,
          };
          
          console.log("📤 Returning user:", JSON.stringify(userResponse, null, 2));
          return userResponse;

        } catch (error) {
          console.error("❌ Authentication error:", error);
          console.error("❌ Error details:", {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      console.log("🔐 JWT callback called");
      if (user) {
        console.log("📝 Adding user to token:", {
          id: user.id,
          email: user.email,
          username: user.username,
        });
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
        token.fullName = user.fullName;
        token.phone = user.phone;
        token.role = user.role;
        token.hasWallet = user.hasWallet;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("🔐 Session callback called");
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.username = token.username as string | null | undefined;
        session.user.fullName = token.fullName as string | null | undefined;
        session.user.phone = token.phone as string;
        session.user.role = token.role as string;
        session.user.hasWallet = token.hasWallet as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
  },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Helper functions
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

export async function requireAuth(redirectTo = "/auth/sign-in") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(redirectTo);
  }
  return user;
}

export async function requireRole(allowedRoles: string | string[], redirectTo = "/unauthorized") {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(user.role)) {
    redirect(redirectTo);
  }
  return user;
}