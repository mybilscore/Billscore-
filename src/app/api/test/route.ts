// emap/src/app/api/test/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS(request: NextRequest) {
  console.log('🔄 Test OPTIONS');
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}

export async function GET(request: NextRequest) {
  console.log('✅ Test GET');
  return NextResponse.json(
    { message: 'CORS test successful' },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      },
    }
  );
}

export async function POST(request: NextRequest) {
  console.log('✅ Test POST');
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(
    { message: 'CORS test successful', received: body },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      },
    }
  );
}