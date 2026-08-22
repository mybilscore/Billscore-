// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { hash } from "bcrypt";
import { z } from "zod";
import { registrationBruteForce } from "~/lib/brute-force";
import { auditLogger, AuditActions } from "~/lib/audit-log";
import { withRateLimit } from "~/lib/rate-limt";
import { 
  createPalmPayVirtualAccountForUser, 
  isPalmPaySimulationMode 
} from "~/lib/palmpay/palmpay-wallet.service";

// ============================================================
// VALIDATION SCHEMA
// ============================================================

const registrationSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscore, dot, and hyphen")
    .optional(),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password is required").optional(),
  pin: z.string().min(4, "PIN must be at least 4 digits").max(6, "PIN must be at most 6 digits").optional(),
  role: z.enum(["END_USER", "RETAILER", "AGENT", "ADMIN", "SUPER_ADMIN", "DEVELOPER"]).default("END_USER"),
  referralCode: z.string().optional(),
  userType: z.string().optional(),
  preferredChannel: z.string().optional(),
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "BIL-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function isUsernameAvailable(username: string): Promise<boolean> {
  const existing = await prisma.user.findUnique({
    where: { username: username.toLowerCase().trim() },
    select: { id: true },
  });
  return !existing;
}

// ============================================================
// RATE LIMITING
// ============================================================

async function checkRateLimit(request: NextRequest): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  error?: string;
}> {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const key = `register:${ip}`;
  
  const result = await withRateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    blockDurationMs: 24 * 60 * 60 * 1000,
  })(request, key);

  return result;
}

// ============================================================
// MAIN REGISTRATION API ROUTE
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // STEP 1: RATE LIMITING
    // ============================================================
    const rateLimit = await checkRateLimit(request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many registration attempts. Please try again after ${rateLimit.resetAt.toLocaleString()}`,
          code: 'RATE_LIMIT_EXCEEDED',
          resetAt: rateLimit.resetAt,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // ============================================================
    // STEP 2: BRUTE FORCE PROTECTION
    // ============================================================
    const emailBlocked = await registrationBruteForce.isBlocked(body.email, ip as string);
    if (emailBlocked.blocked) {
      auditLogger.log({
        action: AuditActions.BRUTE_FORCE_ATTEMPT,
        userId: body.email,
        metadata: {
          email: body.email,
          ip,
          blockedUntil: emailBlocked.blockExpiresAt,
          attempts: emailBlocked.attempts,
        },
        ipAddress: ip as string,
        userAgent,
      }).catch(() => {});

      return NextResponse.json(
        {
          success: false,
          error: `Account temporarily locked due to multiple failed attempts. Try again after ${emailBlocked.blockExpiresAt?.toLocaleString()}`,
          code: 'ACCOUNT_LOCKED',
          blockedUntil: emailBlocked.blockExpiresAt,
        },
        { status: 429 }
      );
    }

    // ============================================================
    // STEP 3: Validate input
    // ============================================================
    const validated = registrationSchema.parse(body);

    // Check passwords match
    if (validated.confirmPassword && validated.password !== validated.confirmPassword) {
      await registrationBruteForce.recordFailedAttempt(
        body.email,
        ip as string,
        { reason: 'password_mismatch' }
      );
      return NextResponse.json(
        { success: false, error: "Passwords do not match", code: 'PASSWORD_MISMATCH' },
        { status: 400 }
      );
    }

    // ============================================================
    // STEP 4: PARALLEL CHECKS
    // ============================================================
    const checks: Promise<any>[] = [
      prisma.user.findFirst({
        where: {
          OR: [
            { email: validated.email },
            { phone: validated.phone },
            ...(validated.username ? [{ username: validated.username.toLowerCase().trim() }] : []),
          ],
        },
        select: { id: true, email: true, phone: true, username: true },
      }),
    ];

    if (validated.username) {
      checks.push(isUsernameAvailable(validated.username));
    }

    const [existingUser, usernameAvailable] = await Promise.all(checks);

    if (existingUser) {
      let field = "";
      if (existingUser.email === validated.email) field = "Email";
      else if (existingUser.phone === validated.phone) field = "Phone number";
      else if (existingUser.username === validated.username?.toLowerCase().trim()) field = "Username";

      await registrationBruteForce.recordFailedAttempt(
        body.email,
        ip as string,
        { reason: 'user_exists', field }
      );

      return NextResponse.json(
        { success: false, error: `${field} already in use`, code: 'DUPLICATE_USER', field },
        { status: 409 }
      );
    }

    if (validated.username && !usernameAvailable) {
      return NextResponse.json(
        { success: false, error: "Username is already taken. Please choose another one." },
        { status: 409 }
      );
    }

    // ============================================================
    // STEP 5: Generate username if not provided
    // ============================================================
    let finalUsername = validated.username?.toLowerCase().trim();

    if (!finalUsername) {
      const base = validated.fullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
      
      let attempts = 0;
      finalUsername = base || `user${Date.now().toString(36)}`;
      
      while (!(await isUsernameAvailable(finalUsername)) && attempts < 10) {
        const random = Math.random().toString(36).substring(2, 8);
        finalUsername = `${base.substring(0, 15)}${random}`;
        attempts++;
      }
      
      if (!(await isUsernameAvailable(finalUsername))) {
        finalUsername = `user${Date.now().toString(36)}`;
      }
    }

    // ============================================================
    // STEP 6: Hash password and PIN
    // ============================================================
    const hashedPassword = await hash(validated.password, 10);
    const defaultPin = "1234";
    const pinToUse = validated.pin || defaultPin;
    const hashedPin = await hash(pinToUse, 10);

    const referralCode = generateReferralCode();

    // ============================================================
    // STEP 7: GET REFERRER INFO (if referral code provided)
    // ============================================================
    let referrerId = null;

    if (validated.referralCode) {
      const code = validated.referralCode.toUpperCase();
      const referrer = await prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
      });

      if (referrer) {
        referrerId = referrer.id;
        console.log(`✅ Referrer found: ${referrerId}`);
      } else {
        console.log(`⚠️ Invalid referral code: ${code}`);
      }
    }

    // ============================================================
    // STEP 8: CREATE USER
    // ============================================================
    const user = await prisma.user.create({
      data: {
        username: finalUsername,
        email: validated.email,
        fullName: validated.fullName,
        phone: validated.phone,
        passwordHash: hashedPassword,
        pinHash: hashedPin,
        role: validated.role as any,
        referralCode: referralCode,
        hasWallet: false,
        isVerified: true,
        walletBalance: 0,
        preferredLanguage: "EN",
        pinAttempts: 0,
        pinLockedUntil: null,
        kycStatus: "PENDING",
        ...(referrerId ? { referredBy: referrerId } : {}),
      },
    });

    console.log(`✅ User created: ${user.id}`);

    // ============================================================
    // STEP 9: CREATE REFERRAL RECORD (if referral code was valid)
    // ============================================================
    if (referrerId) {
      try {
        await prisma.referral.create({
          data: {
            referrerId: referrerId,
            refereeId: user.id,
            referralCode: validated.referralCode.toUpperCase(),
            status: "PENDING",
            rewardAmount: 0, // Will be calculated on first deposit
            channel: validated.preferredChannel as ChannelType || "MOBILE_APP",
          },
        });
        console.log(`✅ Referral record created: ${referrerId} -> ${user.id}`);
      } catch (error) {
        console.error("❌ Failed to create referral record:", error);
        // Continue with registration even if referral record fails
      }
    }

    // ============================================================
    // STEP 10: RECORD SUCCESSFUL ATTEMPT
    // ============================================================
    try {
      await registrationBruteForce.recordSuccessfulAttempt(body.email, ip as string);
    } catch (e) {
      console.log('⚠️ Registration attempt record not found, skipping');
    }

    // ============================================================
    // STEP 11: CREATE PALMPAY WALLET
    // ============================================================
    let wallet: any = null;
    let virtualAccountNo: string | null = null;
    let isSimulation = false;
    let palmpayError: string | null = null;

    try {
      console.log(`📤 Creating PalmPay virtual account for user ${user.id}...`);
      
      const result = await createPalmPayVirtualAccountForUser(
        user.id,
        {
          fullName: validated.fullName,
          email: validated.email,
          phone: validated.phone,
          role: validated.role,
        }
      );

      wallet = result.wallet;
      virtualAccountNo = result.virtualAccount.virtualAccountNo;
      isSimulation = isPalmPaySimulationMode();

      console.log(`✅ PalmPay virtual account created: ${virtualAccountNo}`);
      console.log(`💰 Wallet created: ${wallet.id}, Balance: ${wallet.walletBalance}`);
      
    } catch (error: any) {
      console.error('❌ PalmPay virtual account creation failed:', error);
      palmpayError = error.message;
      
      // Create a fallback wallet
      const accountNumber = `BIL${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      
      wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          accountNumber: accountNumber,
          bankName: "BILSCORE",
          accountName: user.fullName,
          walletBalance: 0,
          ledgerBalance: 0,
          currency: "NGN",
          isActive: true,
          kycLevel: 1,
          metadata: {
            createdVia: "registration_fallback",
            palmpayError: palmpayError,
            timestamp: new Date().toISOString(),
          },
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { hasWallet: true },
      });

      console.log(`⚠️ Fallback wallet created: ${wallet.accountNumber}`);
    }

    // ============================================================
    // STEP 12: CREDIT WELCOME BONUS
    // ============================================================
    const WELCOME_BONUS = parseInt(process.env.WELCOME_BONUS_AMOUNT || '20000');

    if (wallet) {
      const existingBonus = await prisma.walletTransaction.findFirst({
        where: {
          walletId: wallet.id,
          reference: { startsWith: 'WELCOME_BONUS_' },
        },
      });

      if (!existingBonus) {
        const currentBalance = Number(wallet.walletBalance || 0);

        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              walletBalance: { increment: WELCOME_BONUS },
              ledgerBalance: { increment: WELCOME_BONUS },
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId: user.id,
              type: "CREDIT",
              amount: WELCOME_BONUS,
              balanceBefore: currentBalance,
              balanceAfter: currentBalance + WELCOME_BONUS,
              reference: `WELCOME_BONUS_${user.id}`,
              description: `Welcome bonus of ₦${WELCOME_BONUS.toLocaleString()} for joining Bilscore!`,
              status: "SUCCESS",
              category: "SYSTEM",
              metadata: {
                isWelcomeBonus: true,
                amount: WELCOME_BONUS,
                timestamp: new Date().toISOString(),
              },
            },
          }),
        ]);

        await prisma.user.update({
          where: { id: user.id },
          data: { 
            walletBalance: currentBalance + WELCOME_BONUS,
          },
        });

        console.log(`🎉 Welcome bonus of ₦${WELCOME_BONUS.toLocaleString()} credited`);
      }
    }

    // ============================================================
    // STEP 13: AUDIT LOG
    // ============================================================
    auditLogger.log({
      userId: user.id,
      action: AuditActions.USER_REGISTERED,
      metadata: {
        email: user.email,
        username: user.username,
        role: user.role,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        referrerId: referrerId,
        ip,
        userAgent,
      },
      ipAddress: ip as string,
      userAgent,
    }).catch(() => {});

    // ============================================================
    // STEP 14: Return success response
    // ============================================================
    const finalWalletBalance = wallet ? Number(wallet.walletBalance) + WELCOME_BONUS : 0;

    return NextResponse.json({
      success: true,
      message: `Registration successful! Your wallet has been created with a ₦${WELCOME_BONUS.toLocaleString()} welcome bonus.`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        referralCode: user.referralCode,
        hasWallet: true,
        walletBalance: finalWalletBalance,
        referredBy: !!referrerId,
      },
      wallet: wallet ? {
        id: wallet.id,
        accountNumber: wallet.accountNumber,
        bankName: wallet.bankName,
        accountName: wallet.accountName,
        walletBalance: finalWalletBalance,
        isPalmPay: wallet.bankName === 'PALMPAY',
      } : null,
      virtualAccount: virtualAccountNo ? {
        accountNumber: virtualAccountNo,
        isSimulation: isSimulation,
      } : null,
      welcomeBonus: WELCOME_BONUS,
      palmpayError: palmpayError,
      isSimulationMode: isSimulation,
    }, { status: 201 });

  } catch (error: any) {
    console.error("❌ Registration error:", error);

    try {
      const body = await request.json().catch(() => ({}));
      await registrationBruteForce.recordFailedAttempt(
        body.email || 'unknown',
        request.headers.get('x-forwarded-for') || 'unknown',
        { error: error.message }
      );
    } catch (e) {}

    if (error.name === "ZodError") {
      const errors = error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: errors[0]?.message || "Validation failed",
          code: 'VALIDATION_ERROR',
          details: errors,
        },
        { status: 400 }
      );
    }

    if (error.code === "P2002") {
      const target = error.meta?.target || [];
      let field = "User";
      
      if (target.includes("email")) field = "Email";
      else if (target.includes("phone")) field = "Phone number";
      else if (target.includes("username")) field = "Username";
      
      return NextResponse.json(
        {
          success: false,
          error: `${field} already in use`,
          code: 'DUPLICATE_USER',
          field,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Registration failed. Please try again.",
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { success: false, error: "Username parameter is required" },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const result = await withRateLimit({
      windowMs: 60 * 1000,
      maxRequests: 30,
    })(request, `username:${ip}`);

    if (!result.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many username checks. Please slow down.",
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }

    const available = await isUsernameAvailable(username);
    
    return NextResponse.json({
      success: true,
      data: {
        username,
        available,
      },
    });
  } catch (error: any) {
    console.error("❌ Username check error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check username availability" },
      { status: 500 }
    );
  }
}