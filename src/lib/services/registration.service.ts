import { prisma } from "~/lib/db";
import { hash } from "bcrypt";
import { z } from "zod";
import { createPalmPayVirtualAccountForUser, isPalmPaySimulationMode } from "./palmpay-wallet.service";

// ============================================================
// VALIDATION SCHEMA - UPDATED WITH USERNAME
// ============================================================

export const bilscoreRegistrationSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscore, dot, and hyphen")
    .refine((val) => !val.startsWith('_') && !val.startsWith('-') && !val.startsWith('.'), {
      message: "Username cannot start with underscore, dot, or hyphen"
    })
    .refine((val) => !val.endsWith('_') && !val.endsWith('-') && !val.endsWith('.'), {
      message: "Username cannot end with underscore, dot, or hyphen"
    }),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  pin: z.string().min(4, "PIN must be at least 4 digits").max(6, "PIN must be at most 6 digits").optional(),
  role: z.enum(["USER", "END_USER", "RETAILER", "AGENT", "ADMIN", "SUPER_ADMIN", "DEVELOPER"]).default("END_USER"),
  referralCode: z.string().optional(),
  userType: z.enum(["individual", "business", "END_USER", "END_USER_BUSINESS"]).optional().default("individual"),
  companyName: z.string().optional(),
  businessType: z.string().optional(),
  preferredChannel: z.string().optional(),
});

export type BilscoreRegistrationData = z.infer<typeof bilscoreRegistrationSchema>;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Map frontend role to database enum
 */
function mapRoleToDatabase(role: string): string {
  switch (role) {
    case 'USER':
      return 'END_USER';
    default:
      return role;
  }
}

/**
 * Generate a unique username if not provided
 */
function generateUsername(fullName: string): string {
  const base = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  
  const random = Math.random().toString(36).substring(2, 6);
  return `${base}${random}`;
}

/**
 * Check if username is available
 */
async function isUsernameAvailable(username: string): Promise<boolean> {
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  return !existing;
}

/**
 * Generate a unique username with retry
 */
async function generateUniqueUsername(baseName: string): Promise<string> {
  let username = generateUsername(baseName);
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!(await isUsernameAvailable(username)) && attempts < maxAttempts) {
    const random = Math.random().toString(36).substring(2, 8);
    username = `${baseName.substring(0, 15)}${random}`;
    attempts++;
  }
  
  if (!(await isUsernameAvailable(username))) {
    const timestamp = Date.now().toString(36);
    username = `user${timestamp}`;
  }
  
  return username;
}

// ============================================================
// MAIN REGISTRATION FUNCTION
// ============================================================

export async function registerBilscoreUser(data: BilscoreRegistrationData) {
  // Hash password and PIN
  const hashedPassword = await hash(data.password, 10);
  const hashedPin = data.pin ? await hash(data.pin, 10) : null;

  // Generate referral code
  const referralCode = `BIL${Math.random().toString(36).substring(2, 7).toUpperCase()}${Date.now().toString(36).substring(4, 7).toUpperCase()}`;

  let referredBy: string | null = null;
  let referralBonus = 0;

  // Check referral code if provided
  if (data.referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: data.referralCode },
    });

    if (!referrer) {
      throw new Error("Invalid referral code");
    }

    referredBy = referrer.id;
    referralBonus = 500; // ₦500 bonus for referral
  }

  // 🔍 Check if username is provided and available
  let finalUsername = data.username?.trim().toLowerCase();
  
  if (finalUsername) {
    // Username was provided - validate it's available
    const available = await isUsernameAvailable(finalUsername);
    if (!available) {
      throw new Error("Username is already taken. Please choose another one.");
    }
  } else {
    // No username provided - generate one
    finalUsername = await generateUniqueUsername(data.fullName);
    console.log(`🆔 Generated username: ${finalUsername}`);
  }

  // Create user with transaction
  const user = await prisma.$transaction(async (tx) => {
    // Map role from frontend to database enum
    const roleEnum = mapRoleToDatabase(data.role);

    // Determine if user is a developer based on role or userType
    const isDeveloper = data.role === 'DEVELOPER' || data.userType === 'business';

    // ✅ Create the user with username
    const newUser = await tx.user.create({
      data: {
        username: finalUsername, // ✅ NEW FIELD
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        passwordHash: hashedPassword,
        pinHash: hashedPin,
        role: roleEnum as any,
        referralCode,
        referredBy,
        companyName: data.companyName || null,
        isDeveloper: isDeveloper,
        ...(isDeveloper && {
          developerAccountType: "BASIC",
          developerStatus: "PENDING",
        }),
        isVerified: false,
        isWalletFrozen: false,
        hasWallet: false,
        walletBalance: 0,
        preferredLanguage: "EN",
        pinAttempts: 0,
        pinLockedUntil: null,
        kycStatus: "PENDING",
      },
    });

    console.log(`✅ User created: ${newUser.id}`);
    console.log(`🆔 Username: ${newUser.username}`);
    console.log(`📋 Role mapped: ${data.role} → ${roleEnum}`);
    console.log(`📋 Is Developer: ${isDeveloper}`);
    console.log(`📋 Company Name: ${data.companyName || 'N/A'}`);

    // Create PalmPay virtual account and wallet
    try {
      const { wallet, virtualAccount } = await createPalmPayVirtualAccountForUser(
        newUser.id,
        {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          role: roleEnum,
        }
      );

      console.log(`✅ PalmPay virtual account created: ${virtualAccount.virtualAccountNo}`);
      console.log(`💰 Wallet created: ${wallet.id}, Balance: ${wallet.walletBalance}`);
    } catch (error: any) {
      console.error('❌ Failed to create PalmPay virtual account:', error);
      // Create a fallback wallet without PalmPay
      const fallbackWallet = await tx.wallet.create({
        data: {
          userId: newUser.id,
          accountNumber: `BIL${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          bankName: 'BILSCORE',
          accountName: newUser.fullName,
          walletBalance: 0,
          ledgerBalance: 0,
          currency: 'NGN',
          isActive: true,
          kycLevel: 1,
          metadata: {
            palmpayError: error.message,
            createdAt: new Date().toISOString(),
          },
        },
      });

      await tx.user.update({
        where: { id: newUser.id },
        data: { hasWallet: true },
      });

      console.log(`⚠️ Fallback wallet created: ${fallbackWallet.accountNumber}`);
    }

    // Handle referral bonus
    if (referredBy) {
      const referrerWallet = await tx.wallet.findUnique({
        where: { userId: referredBy },
      });

      if (referrerWallet) {
        await tx.wallet.update({
          where: { id: referrerWallet.id },
          data: {
            walletBalance: {
              increment: referralBonus,
            },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: referrerWallet.id,
            userId: referredBy,
            type: 'CREDIT',
            amount: referralBonus,
            balanceBefore: Number(referrerWallet.walletBalance),
            balanceAfter: Number(referrerWallet.walletBalance) + referralBonus,
            reference: `REFERRAL_${newUser.id}`,
            description: `Referral bonus for ${newUser.fullName}`,
            status: 'SUCCESS',
            category: 'REFERRAL_BONUS',
          },
        });
      }
    }

    return newUser;
  });

  // Get the user with wallet for response
  const userWithWallet = await prisma.user.findUnique({
    where: { id: user.id },
    include: { wallet: true },
  });

  return {
    user: userWithWallet!,
    referralBonus,
    isSimulationMode: isPalmPaySimulationMode(),
  };
}

// ============================================================
// ADDITIONAL UTILITY FUNCTIONS
// ============================================================

/**
 * Check if a username is available (public API)
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  return isUsernameAvailable(username.toLowerCase().trim());
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username: username.toLowerCase().trim() },
    include: {
      wallet: true,
    },
  });
}

/**
 * Validate username format
 */
export function validateUsernameFormat(username: string): { valid: boolean; error?: string } {
  if (!username || username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }
  if (username.length > 30) {
    return { valid: false, error: "Username must be at most 30 characters" };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return { valid: false, error: "Username can only contain letters, numbers, underscore, dot, and hyphen" };
  }
  if (/^[_.-]/.test(username)) {
    return { valid: false, error: "Username cannot start with underscore, dot, or hyphen" };
  }
  if (/[_.-]$/.test(username)) {
    return { valid: false, error: "Username cannot end with underscore, dot, or hyphen" };
  }
  if (username.includes('..') || username.includes('__') || username.includes('--')) {
    return { valid: false, error: "Username cannot contain consecutive special characters" };
  }
  return { valid: true };
}