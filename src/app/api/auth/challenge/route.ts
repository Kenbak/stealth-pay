import { NextRequest, NextResponse } from "next/server";
import { generateChallenge } from "@/lib/auth";
import { authChallengeSchema, validateInput } from "@/lib/validation";
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  getRateLimitIdentifier,
} from "@/lib/rate-limit";
import { logAudit, createAuditContext, securityAlert } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const auditContext = createAuditContext(request.headers);

  try {
    // Rate limiting
    const rateLimit = checkRateLimit(
      getRateLimitIdentifier(ip),
      RATE_LIMITS.auth
    );

    if (!rateLimit.success) {
      await securityAlert("RATE_LIMIT_EXCEEDED", { ip, endpoint: "auth/challenge" });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // Parse and validate input
    const body = await request.json();
    const validation = validateInput(authChallengeSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { wallet } = validation.data;

    // Generate challenge
    const { challenge, nonce, expiresAt } = await generateChallenge(wallet);

    await logAudit({
      action: "AUTH_CHALLENGE_CREATED",
      actorWallet: wallet,
      organizationId: null,
      success: true,
      ...auditContext,
    });

    return NextResponse.json({
      challenge,
      nonce,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Challenge generation error:", error);

    await logAudit({
      action: "AUTH_CHALLENGE_CREATED",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    return NextResponse.json(
      { error: "Failed to generate challenge" },
      { status: 500 }
    );
  }
}
