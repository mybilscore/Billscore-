// app/api/recommended-amounts/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: [
      { label: "₦500", value: 500 },
      { label: "₦1,000", value: 1000 },
      { label: "₦2,000", value: 2000 },
      { label: "₦5,000", value: 5000 },
      { label: "₦10,000", value: 10000 },
      { label: "₦20,000", value: 20000 },
    ],
  });
}