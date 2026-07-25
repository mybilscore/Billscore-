// lib/auth-utils.ts
import jwt from "jsonwebtoken";
import { compare } from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface TokenPayload {
  userId: string;
  email: string;
  phone: string;
  name: string;
  businessId?: string;
}

// Generate JWT token
export function generateToken(payload: TokenPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    issuer: "qreta-api",
    audience: "qreta-mobile-app",
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

// Verify JWT token
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error("Invalid token");
  }
}

// Password verification
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return compare(plainPassword, hashedPassword);
}

// Extract token from authorization header
export function extractTokenFromHeader(
  authHeader: string | null,
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

// Middleware for protected routes
export async function authenticateToken(
  request: Request,
): Promise<TokenPayload> {
  const authHeader = request.headers.get("authorization");
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new Error("Authorization token required");
  }

  return verifyToken(token);
}
