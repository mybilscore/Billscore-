// app/api/user/route.ts
import type { NextRequest } from "next/server";

import { hash } from "bcrypt";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import * as z from "zod";
import { writeFile, mkdir } from "fs/promises";

import { authOptions } from "~/lib/auth";
import { prisma } from "~/lib/db";
import { join } from "path";
import { uploadImage } from "~/lib/upload-image";

// Remove the deprecated config export and use individual exports instead
export const maxDuration = 30; // Maximum duration for this API route
export const dynamic = "force-dynamic"; // Ensure dynamic rendering

// For handling larger body payloads (10MB), you have two options:

// Option 1: Keep body parsing enabled but increase limit (if you're not uploading files via FormData)
// This needs to be configured in next.config.ts instead:
/*
// In next.config.ts:
export default {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  // ... other config
}
*/

// Option 2: If you're uploading files, disable bodyParser and handle manually (recommended for file uploads)
// Add this if you need to handle raw multipart/form-data:
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// But since you're already using FormData in your POST handler,
// Next.js will automatically handle multipart/form-data correctly.
// The bodyParser config is only needed if you're using JSON body.

// Schemas
const userSchema = z.object({
  address: z.string().min(1, "Address is required"),
  businessName: z.string().min(1, "Business name is required"),
  referal: z.string().optional(),
  storeUrl: z.string().optional(),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  name: z.string().min(1, "Name is required").max(500),
  aboutBusiness: z.string().min(1, "Name is required").max(3000),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters long"),
  phone: z.string().min(1, "Phone number is required").max(20),
  type: z.string().min(1, "Type is required"),
  whatsapp: z.string().min(1, "Type is required"),
});

// Helper function
const cleanPhone = (phone: string) => phone.replace(/\D/g, "");

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const phone = request.nextUrl.searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required as a query parameter" },
        { status: 400 },
      );
    }

    const cleanedPhone = cleanPhone(phone);
    const user = await prisma.user.findFirst({
      include: {
        bussiness: true, // Corrected spelling from 'bussiness' to 'business'
      },
      where: {
        OR: [
          { phone },
          { phone: cleanedPhone },
          { phone: { contains: cleanedPhone } },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    // Since you're using FormData for file uploads, Next.js handles multipart/form-data automatically
    // No need to disable bodyParser for this route

    const formData = await req.formData();
    const formDataObj = Object.fromEntries(formData.entries());

    // Remove the manual password check and let Zod handle all validation
    const {
      address,
      businessName,
      email,
      aboutBusiness,
      name,
      referal,
      password,
      storeUrl,
      phone,
      type,
      whatsapp,
    } = userSchema.parse(formDataObj);

    // Check for existing email first
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }

    // Check for existing phone
    const existingByPhone = await prisma.user.findFirst({
      where: {
        OR: [{ phone }, { phone: cleanPhone(phone) }],
      },
    });
    if (existingByPhone) {
      return NextResponse.json(
        { error: "Phone number already exists" },
        { status: 409 },
      );
    }

    // NEW: Check for existing business name
    const existingBusiness = await prisma.bussiness.findFirst({
      where: {
        OR: [
          { bussines_name: businessName },
          {
            link_name: businessName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, ""),
          },
        ],
      },
    });
    if (existingBusiness) {
      return NextResponse.json(
        { error: "Business name already exists" },
        { status: 409 },
      );
    }

    // NEW: Also check if the generated store URL already exists
    const generatedLinkName =
      storeUrl === ""
        ? businessName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
        : storeUrl;

    const existingLinkName = await prisma.bussiness.findUnique({
      where: { link_name: generatedLinkName },
    });
    if (existingLinkName) {
      return NextResponse.json(
        { error: "Store URL already exists" },
        { status: 409 },
      );
    }

    // Handle single image upload using the Cloudinary logic
    const logoFile = formData.get("logo") as File | null;
    let logoUrl = null;
    let logoPublicId = null;

    if (logoFile && logoFile.size > 0) {
      const uploadResult = await uploadImage(logoFile, "logos"); // Specify the folder

      if (uploadResult?.secure_url && uploadResult?.public_id) {
        logoUrl = uploadResult.secure_url;
        logoPublicId = uploadResult.public_id;
      } else {
        return NextResponse.json(
          { error: "Failed to upload logo" },
          { status: 500 },
        );
      }
    }

    // Generate business data
    const businessId = generateBusinessId();
    const link_name = generatedLinkName; // Use the already generated and validated link_name

    const mproductLink = generateProdLink(businessId);

    const prdkey = generatePRDKey();
    if (!link_name) {
      // Handle the case where link_name is undefined
      throw new Error("link_name is required");
    }
    const businessLink = generateBusinessLink(link_name);
    const referl = generateReferal(prdkey);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 29);

    // Create user and business in transaction
    const [newUser, newBusiness] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email,
          name,
          pkey: prdkey,
          rf_link: referl,
          referal: referal || "",
          password: await hash(password, 10),
          phone: cleanPhone(phone),
        },
      }),
      prisma.bussiness.create({
        data: {
          address,
          bussines_name: businessName,
          bussinesId: businessId,
          link: businessLink,
          aboutBusiness: aboutBusiness,
          link_name: link_name,
          mplink: mproductLink,
          type,
          user: { connect: { phone: cleanPhone(phone) } },
          logo: logoUrl,
          logo_public_id: logoPublicId, // It's a good practice to save the public ID for later deletion/updates
          whatsapp,
        },
      }),

      prisma.subscription.create({
        data: {
          planId: 1,
          userId: cleanPhone(phone),
          planType: "Monthly",
          expiresAt: expiresAt,
        },
      }),

      prisma.subscriptionHistory.create({
        data: {
          planId: 1,
          userId: cleanPhone(phone),
          planType: "Monthly",
          changeReason: "New account",
          expiresAt: expiresAt,
        },
      }),
    ]);

    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(
      {
        business: newBusiness,
        message: "Registration successful",
        user: userWithoutPassword,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);

    // Handle validation errors - IMPROVED: Extract specific error messages
    if (error instanceof z.ZodError) {
      // Extract the first error message for the frontend
      const firstError = error.errors[0];
      const errorMessage = firstError?.message || "Invalid data";

      return NextResponse.json(
        {
          error: errorMessage,
          details: error.errors, // Optional: include all errors for debugging
        },
        { status: 400 },
      );
    }

    // Generic error response
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

// Helper functions
function generateBusinessId(): string {
  return `biz-${Math.random().toString(36).substring(2, 10)}`;
}

function generateBusinessLink(businessId: string): string {
  const slug = businessId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  //  return `http://localhost:3000/${slug}`;
  return `https://www.myqreta.com/${slug}`;
}

function generatePRDKey(): string {
  return `pkv-${Math.random().toString(36).substring(2, 10)}`;
}

function generateProdLink(businessId: string): string {
  const slug = businessId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  //return `http://localhost:3000/mproduct?prod=${slug}`;
  return `https://www.myqreta.com/mproduct?prod=${slug}`;
}

function generateReferal(unique: string): string {
  // const slug = unique
  //   .toLowerCase()
  //   .replace(/[^a-z0-9]+/g, "-")
  //   .replace(/(^-|-$)/g, "");
  return `https://www.myqreta.com/auth/sign-up?ref=${unique}`;
  // return `https://www.myqreta.com/mproduct?prod=${slug}`;
}
