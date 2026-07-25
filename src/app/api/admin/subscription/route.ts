// app/api/admin/subscription-plans/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "~/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "~/lib/auth";
import type { NextRequest } from "next/server";

// Validation schema for subscription plans
const subscriptionPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  price: z.number().min(0, "Price must be a positive number"),
  duration: z.number().min(1, "Duration must be at least 1"),
  //   durationUnit: z.enum(["days", "months", "years"]),
  description: z.string().optional(),
  features: z.array(z.string()),
  isActive: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    // Check authentication

    const body = await req.json();

    const validatedData = subscriptionPlanSchema.parse(body);

    // Check if plan with same name already exists
    const existingPlan = await prisma.plans.findUnique({
      where: { name: validatedData.name },
    });

    if (existingPlan) {
      return NextResponse.json(
        { error: "A subscription plan with this name already exists" },
        { status: 409 },
      );
    }

    // Create new subscription plan
    const newPlan = await prisma.plans.create({
      data: {
        name: validatedData.name,
        price: validatedData.price,
        duration: validatedData.duration,
        description: validatedData.description || "",
        isActive: validatedData.isActive,
      },
    });

    return NextResponse.json(
      {
        plan: newPlan,
        message: "Subscription plan created successfully!",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Subscription plan creation error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          details: error.errors,
          error: "Invalid subscription plan data",
        },
        { status: 400 },
      );
    }

    // Handle other errors
    return NextResponse.json(
      { error: "Failed to create subscription plan" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const subsPlans = await prisma.plans.findMany();

    if (!subsPlans || subsPlans.length === 0) {
      return NextResponse.json([]);
    }

    return NextResponse.json(subsPlans);
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
