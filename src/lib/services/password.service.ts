// services/password.service.ts
import { prisma } from "@/lib/db";
import { hash, compare } from "bcrypt";
import crypto from "crypto";

export class PasswordService {
  private async generateToken(): Promise<string> {
    return crypto.randomBytes(32).toString("hex");
  }

  async createResetToken(email: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { party: { include: { individual: true } } },
    });

    if (!user?.party?.individual) return null;

    const token = await this.generateToken();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Store token in individual_party or create a reset table
    // For now, we'll use a simple approach - you might want a dedicated reset_tokens table
    await prisma.individual_party.update({
      where: { id: user.party.individual.id },
      data: {
        // Add these fields to your schema if needed
        // reset_token: token,
        // reset_token_expires: expires,
      },
    });

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const individual = await prisma.individual_party.findFirst({
      where: {
        // reset_token: token,
        // reset_token_expires: { gt: new Date() },
      },
    });

    if (!individual) return false;

    const hashedPassword = await hash(newPassword, 12);

    await prisma.individual_party.update({
      where: { id: individual.id },
      data: {
        password_hash: hashedPassword,
        // reset_token: null,
        // reset_token_expires: null,
      },
    });

    // Also update security settings
    await prisma.party_security_settings.update({
      where: { party_id: individual.party_id },
      data: {
        password_last_changed: new Date(),
      },
    });

    return true;
  }

  async changePassword(
    partyId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const individual = await prisma.individual_party.findUnique({
      where: { party_id: partyId },
    });

    if (!individual) return false;

    const isValid = await compare(currentPassword, individual.password_hash || "");
    if (!isValid) return false;

    const hashedPassword = await hash(newPassword, 12);

    await prisma.$transaction([
      prisma.individual_party.update({
        where: { party_id: partyId },
        data: { password_hash: hashedPassword },
      }),
      prisma.party_security_settings.update({
        where: { party_id: partyId },
        data: { password_last_changed: new Date() },
      }),
    ]);

    return true;
  }
}