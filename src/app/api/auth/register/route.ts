// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/db";
import { hash } from "bcrypt";
import { z } from "zod";
import { 
  registrationBruteForce,
  loginBruteForce 
} from "~/lib/brute-force";
import { 
  auditLogger, 
  AuditActions 
} from "~/lib/audit-log";
import { registrationRateLimiter, withRateLimit } from "~/lib/rate-limt";

// ============================================================
// VALIDATION SCHEMA - SUPPORTS BOTH confirmPassword AND pin
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

type RegistrationData = z.infer<typeof registrationSchema>;

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

async function generateVirtualAccountNumber(): Promise<string> {
  const random = Math.floor(1000000000 + Math.random() * 9000000000);
  return random.toString().padStart(10, "0");
}

async function isUsernameAvailable(username: string): Promise<boolean> {
  const existing = await prisma.user.findUnique({
    where: { username: username.toLowerCase().trim() },
    select: { id: true },
  });
  return !existing;
}

// ============================================================
// RATE LIMITING MIDDLEWARE
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
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,           // 5 attempts
    blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours block
  })(request, key);

  if (!result.allowed) {
    await auditLogger.log({
      action: AuditActions.RATE_LIMIT_EXCEEDED,
      metadata: {
        ip,
        key,
        remaining: result.remaining,
        resetAt: result.resetAt,
      },
      ipAddress: ip as string,
    });
  }

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
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    console.log("📝 Registration request:", {
      username: body.username,
      email: body.email,
      fullName: body.fullName,
      phone: body.phone,
      hasPassword: !!body.password,
      hasConfirmPassword: !!body.confirmPassword,
      hasPin: !!body.pin,
      referralCode: body.referralCode,
    });

    // ============================================================
    // STEP 2: BRUTE FORCE PROTECTION
    // ============================================================
    const emailBlocked = await registrationBruteForce.isBlocked(body.email, ip as string);
    if (emailBlocked.blocked) {
      await auditLogger.log({
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
      });

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

    // Check if password and confirmPassword match
    if (validated.confirmPassword && validated.password !== validated.confirmPassword) {
      await registrationBruteForce.recordFailedAttempt(
        body.email,
        ip as string,
        { reason: 'password_mismatch' }
      );

      return NextResponse.json(
        { 
          success: false, 
          error: "Passwords do not match",
          code: 'PASSWORD_MISMATCH',
        },
        { status: 400 }
      );
    }

    // ============================================================
    // STEP 4: Check if user already exists
    // ============================================================
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validated.email },
          { phone: validated.phone },
          ...(validated.username ? [{ username: validated.username.toLowerCase().trim() }] : []),
        ],
      },
    });

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
        { 
          success: false, 
          error: `${field} already in use`,
          code: 'DUPLICATE_USER',
          field,
        },
        { status: 409 }
      );
    }

    // ============================================================
    // STEP 5: Handle username
    // ============================================================
    let finalUsername = validated.username?.toLowerCase().trim();

    if (finalUsername) {
      const available = await isUsernameAvailable(finalUsername);
      if (!available) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Username is already taken. Please choose another one." 
          },
          { status: 409 }
        );
      }
    } else {
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

    console.log(`🆔 Final username: ${finalUsername}`);

    // ============================================================
    // STEP 6: Hash password and PIN
    // ============================================================
    const hashedPassword = await hash(validated.password, 10);
    
    let pinToUse = validated.pin;
    let hashedPin = null;
    
    if (pinToUse) {
      hashedPin = await hash(pinToUse, 10);
      console.log("🔐 PIN provided and hashed");
    } else {
      const defaultPin = "1234";
      hashedPin = await hash(defaultPin, 10);
      console.log("🔐 No PIN provided, using default: 1234");
    }

    // ============================================================
    // STEP 7: Generate referral code
    // ============================================================
    const referralCode = generateReferralCode();

    // ============================================================
    // STEP 8: Create user
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
        ...(validated.referralCode ? { referredBy: validated.referralCode } : {}),
      },
    });

    console.log(`✅ User created: ${user.id}`);

    // ============================================================
    // STEP 9: LOG AUDIT - USER REGISTERED
    // ============================================================
    await auditLogger.log({
      userId: user.id,
      action: AuditActions.USER_REGISTERED,
      metadata: {
        email: user.email,
        username: user.username,
        role: user.role,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        ip,
        userAgent,
      },
      ipAddress: ip as string,
      userAgent,
    });

    // ============================================================
    // STEP 10: RECORD SUCCESSFUL ATTEMPT
    // ============================================================
    await registrationBruteForce.recordSuccessfulAttempt(body.email, ip as string);

    // ============================================================
    // STEP 11: Create wallet for user WITH WELCOME BONUS
    // ============================================================
    const accountNumber = await generateVirtualAccountNumber();
    
    // ✅ NEW: Define welcome bonus amount
    const WELCOME_BONUS = 20000; // ₦20,000
    
    // ✅ UPDATED: Create wallet with welcome bonus
    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        accountNumber: accountNumber,
        bankName: "PALMPAY",
        accountName: user.fullName,
        walletBalance: WELCOME_BONUS, // ✅ Set welcome bonus
        ledgerBalance: WELCOME_BONUS, // ✅ Set welcome bonus
        currency: "NGN",
        isActive: true,
        kycLevel: 1,
        metadata: {
          createdVia: "registration",
          timestamp: new Date().toISOString(),
          welcomeBonus: WELCOME_BONUS, // ✅ Store welcome bonus in metadata
        },
      },
    });

    console.log(`💰 Wallet created: ${wallet.id} (${wallet.accountNumber})`);
    console.log(`🎉 Welcome bonus of ₦${WELCOME_BONUS.toLocaleString()} credited`);

    // Update user to mark wallet as created and set wallet balance
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        hasWallet: true,
        walletBalance: WELCOME_BONUS, // ✅ Update user's wallet balance
      },
    });

    // ✅ NEW: Create welcome bonus transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: user.id,
        type: "CREDIT",
        amount: WELCOME_BONUS,
        balanceBefore: 0,
        balanceAfter: WELCOME_BONUS,
        reference: `WELCOME_BONUS_${user.id}`,
        description: `🎉 Welcome bonus of ₦${WELCOME_BONUS.toLocaleString()} for joining Bilscore!`,
        status: "SUCCESS",
        category: "SYSTEM",
        metadata: {
          isWelcomeBonus: true,
          amount: WELCOME_BONUS,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // ============================================================
    // STEP 12: Handle referral bonus if applicable
    // ============================================================
    let referralBonus = 0;
    
    if (validated.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: validated.referralCode },
        include: { wallet: true },
      });

      if (referrer && referrer.wallet) {
        referralBonus = 500;
        
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: referrer.wallet.id },
            data: {
              walletBalance: {
                increment: referralBonus,
              },
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: referrer.wallet.id,
              userId: referrer.id,
              type: "CREDIT",
              amount: referralBonus,
              balanceBefore: Number(referrer.wallet.walletBalance),
              balanceAfter: Number(referrer.wallet.walletBalance) + referralBonus,
              reference: `REFERRAL_${user.id}`,
              description: `Referral bonus for ${user.fullName}`,
              status: "SUCCESS",
              category: "SYSTEM",
            },
          }),
        ]);

        console.log(`🎁 Referral bonus awarded: ₦${referralBonus} to ${referrer.username}`);

        await auditLogger.log({
          userId: referrer.id,
          action: AuditActions.REFERRAL_BONUS,
          metadata: {
            referredUser: user.id,
            referredEmail: user.email,
            bonusAmount: referralBonus,
          },
        });
      }
    }

    // ============================================================
    // STEP 13: Return success response - UPDATED
    // ============================================================
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
        walletBalance: WELCOME_BONUS,
      },
      wallet: {
        id: wallet.id,
        accountNumber: wallet.accountNumber,
        bankName: wallet.bankName,
        accountName: wallet.accountName,
        walletBalance: WELCOME_BONUS,
      },
      referralBonus: referralBonus,
      welcomeBonus: WELCOME_BONUS, // ✅ Include welcome bonus in response
    }, { status: 201 });

  } catch (error: any) {
    console.error("❌ Registration error:", error);

    // Record failed attempt on validation or other errors
    if (error.name !== "ZodError" && error.code !== "P2002") {
      try {
        const body = await request.json().catch(() => ({}));
        await registrationBruteForce.recordFailedAttempt(
          body.email || 'unknown',
          request.headers.get('x-forwarded-for') || 'unknown',
          { error: error.message }
        );
      } catch (e) {
        // Ignore - already failing
      }
    }

    // Zod validation errors
    if (error.name === "ZodError") {
      const errors = error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      await auditLogger.log({
        action: 'VALIDATION_ERROR',
        metadata: {
          errors,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        },
      });

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

    // Prisma unique constraint violation
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

    // Log unknown errors
    await auditLogger.log({
      action: 'REGISTRATION_ERROR',
      metadata: {
        error: error.message,
        stack: error.stack,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

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

// ============================================================
// GET: Check username availability
// ============================================================

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
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,     // 30 requests
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