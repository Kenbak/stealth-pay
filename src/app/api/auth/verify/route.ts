import { NextRequest, NextResponse } from "next/server";
import { verifySignature, createToken } from "@/lib/auth";
import { authVerifySchema, validateInput } from "@/lib/validation";
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  getRateLimitIdentifier,
} from "@/lib/rate-limit";
import { logAudit, createAuditContext, securityAlert } from "@/lib/audit-log";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const auditContext = createAuditContext(request.headers);

  try {
    // Rate limiting (stricter for verify)
    const rateLimit = checkRateLimit(
      getRateLimitIdentifier(ip),
      RATE_LIMITS.auth
    );

    if (!rateLimit.success) {
      await securityAlert("BRUTE_FORCE", { ip, endpoint: "auth/verify" });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Parse and validate input
    const body = await request.json();
    const validation = validateInput(authVerifySchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { wallet, signature, message, nonce } = validation.data;

    // Verify signature
    const isValid = await verifySignature(wallet, signature, message, nonce);

    if (!isValid) {
      await securityAlert("INVALID_SIGNATURE", { ip, wallet });
      await logAudit({
        action: "AUTH_CHALLENGE_FAILED",
        actorWallet: wallet,
        organizationId: null,
        success: false,
        errorMessage: "Invalid signature",
        ...auditContext,
      });

      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await createToken(wallet);

    // Get organization if exists
    const organization = await prisma.organization.findUnique({
      where: { adminWallet: wallet },
      select: { id: true, name: true },
    });

    await logAudit({
      action: "AUTH_TOKEN_CREATED",
      actorWallet: wallet,
      organizationId: organization?.id || null,
      success: true,
      ...auditContext,
    });

    // Set HTTP-only cookie for security
    const response = NextResponse.json({
      success: true,
      token,
      organization,
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Verification error:", error);

    await logAudit({
      action: "AUTH_CHALLENGE_FAILED",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
