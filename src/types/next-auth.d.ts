// types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    phone: string | null;
    partyId: number;
    partyType: string;
    role: string;
    individualId?: number | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      phone: string | null;
      partyId: number;
      partyType: string;
      role: string;
      individualId?: number | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name?: string | null;
    phone: string | null;
    partyId: number;
    partyType: string;
    role: string;
    individualId?: number | null;
  }
}