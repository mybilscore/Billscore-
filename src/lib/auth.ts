// lib/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcrypt";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// import { prisma } from "./prisma";
import { prisma } from "./db";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
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
      fullName?: string | null;
      phone: string;
      role: string;
      hasWallet: boolean;
    };
  }
}

export type BilscoreUser = {
  id: string;
  email: string;
  fullName?: string | null;
  phone: string;
  role: string;
  hasWallet: boolean;
};

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        phone: { label: "Phone", type: "text" }, // for USSD/phone login
      },
      async authorize(credentials) {
        if (!credentials) return null;

        // Find user by email or phone
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.email },
              { phone: credentials.phone },
            ],
          },
        });

        if (!user) {
          console.log("❌ User not found with email/phone:", credentials.email || credentials.phone);
          return null;
        }

        // Verify password (if provided)
        if (credentials.password) {
          const isValid = await compare(credentials.password, user.passwordHash || "");
          if (!isValid) {
            console.log("❌ Invalid password for user:", user.email);
            return null;
          }
        } else {
          // If no password, maybe it's a phone-only login? (Not implemented yet)
          return null;
        }

        // Return user object (must match User type)
        return {
          id: user.id,
          email: user.email || "",
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          hasWallet: user.hasWallet,
          walletBalance: user.walletBalance,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.fullName = user.fullName;
        token.phone = user.phone;
        token.role = user.role;
        token.hasWallet = user.hasWallet;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.fullName = token.fullName;
        session.user.phone = token.phone;
        session.user.role = token.role;
        session.user.hasWallet = token.hasWallet;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
  },
  secret: process.env.AUTH_SECRET,
};

// Helper functions for server-side session handling

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

export async function requireRole(allowedRoles: string | string[], redirectTo = "/auth/unauthorized") {
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