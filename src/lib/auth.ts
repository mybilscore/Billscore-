// lib/auth.ts

import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcrypt";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";

// ✅ Extended User type with username
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
    referralCode?: string | null;
    isVerified?: boolean;
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
      walletBalance?: number;
      referralCode?: string | null;
      isVerified?: boolean;
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
    walletBalance: number;
    referralCode?: string | null;
    isVerified?: boolean;
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
        phone: { label: "Phone", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.email },
              { phone: credentials.phone },
            ],
          },
          include: {
            wallet: true,
          },
        });

        if (!user) {
          console.log("❌ User not found with email/phone:", credentials.email || credentials.phone);
          return null;
        }

        if (credentials.password) {
          const isValid = await compare(credentials.password, user.passwordHash || "");
          if (!isValid) {
            console.log("❌ Invalid password for user:", user.email);
            return null;
          }
        } else {
          return null;
        }

        return {
          id: user.id,
          email: user.email || "",
          username: user.username,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
          hasWallet: !!user.wallet || user.hasWallet,
          walletBalance: user.wallet ? Number(user.wallet.walletBalance) : Number(user.walletBalance || 0),
          referralCode: user.referralCode,
          isVerified: user.isVerified,
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
        token.username = user.username;
        token.fullName = user.fullName;
        token.phone = user.phone;
        token.role = user.role;
        token.hasWallet = user.hasWallet;
        token.walletBalance = user.walletBalance || 0;
        token.referralCode = user.referralCode;
        token.isVerified = user.isVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.username = token.username;
        session.user.fullName = token.fullName;
        session.user.phone = token.phone;
        session.user.role = token.role;
        session.user.hasWallet = token.hasWallet;
        session.user.walletBalance = token.walletBalance;
        session.user.referralCode = token.referralCode;
        session.user.isVerified = token.isVerified;
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

// ✅ Helper functions
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