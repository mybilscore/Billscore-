// emap/src/lib/cors.ts
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = ['http://localhost:3001', 'http://localhost:3000'];
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = ['Content-Type', 'x-api-key', 'Authorization', 'Accept'];

export function handleCORS(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  // Add CORS headers to response
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

export function handleOptions(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(', '),
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}