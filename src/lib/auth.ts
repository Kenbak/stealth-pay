import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { prisma } from "./db";
import { randomBytes } from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

const JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export interface JWTPayload {
  wallet: string;
  organizationId?: string;
  iat: number;
  exp: number;
}

/**
 * Generate a challenge for wallet authentication
 * Includes nonce, timestamp, and domain to prevent replay attacks
 */
export async function generateChallenge(wallet: string): Promise<{
  challenge: string;
  nonce: string;
  expiresAt: Date;
}> {
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MS);
  const domain = process.env.NEXT_PUBLIC_APP_URL || "localhost";

  // Store challenge in DB for verification
  await prisma.authChallenge.create({
    data: {
      wallet,
      nonce,
      expiresAt,
    },
  });

  // Create human-readable message
  const challenge = [
    `StealthPay Authentication`,
    ``,
    `Wallet: ${wallet}`,
    `Domain: ${domain}`,
    `Nonce: ${nonce}`,
    `Expires: ${expiresAt.toISOString()}`,
    ``,
    `Sign this message to prove you own this wallet.`,
    `This request will not trigger any blockchain transaction.`,
  ].join("\n");

  return { challenge, nonce, expiresAt };
}

/**
 * Verify a wallet signature against a challenge
 */
export async function verifySignature(
  wallet: string,
  signature: string,
  message: string,
  nonce: string
): Promise<boolean> {
  try {
    // Check if challenge exists and is valid
    const challenge = await prisma.authChallenge.findFirst({
      where: {
        wallet,
        nonce,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!challenge) {
      console.error("Invalid or expired challenge");
      return false;
    }

    // Mark challenge as used (prevent replay)
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: new Date() },
    });

    // Verify the signature
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(wallet);

    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    return verified;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Create a JWT token for authenticated user
 */
export async function createToken(wallet: string): Promise<string> {
  // Get or create organization for this wallet
  let org = await prisma.organization.findUnique({
    where: { adminWallet: wallet },
  });

  const payload: Partial<JWTPayload> = {
    wallet,
    organizationId: org?.id,
  };

  const token = await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user from request
 */
export async function getAuthUser(
  request: NextRequest
): Promise<JWTPayload | null> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  return verifyToken(token);
}

/**
 * Get auth from cookies (for server components)
 */
export async function getAuthFromCookies(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

/**
 * Cleanup expired challenges (run periodically)
 */
export async function cleanupExpiredChallenges(): Promise<number> {
  const result = await prisma.authChallenge.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}
