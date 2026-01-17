/**
 * API Endpoint: Get withdrawal history for an employee
 *
 * GET /api/withdrawals?organizationId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashWallet } from "@/lib/wallet-hash";
import { calculateWithdrawalFee, FEES } from "@/lib/fees";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    // Find the employee
    const mainWalletHash = hashWallet(auth.wallet);

    const whereClause: any = {
      employee: {
        mainWalletHash,
        status: "ACTIVE",
      },
    };

    if (organizationId) {
      whereClause.employee.organizationId = organizationId;
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to 50 most recent
      include: {
        employee: {
          select: {
            organizationId: true,
            organization: {
              select: { name: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        feeAmount: Number(w.feeAmount),
        mode: w.mode,
        status: w.status,
        recipient: w.recipient,
        txSignature: w.txSignature,
        organizationName: w.employee.organization.name,
        createdAt: w.createdAt.toISOString(),
        completedAt: w.completedAt?.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[Withdrawals] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch withdrawals" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/withdrawals/estimate?amount=xxx
 *
 * Estimate withdrawal fee
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, mode } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    let estimatedFee: number;
    let estimatedReceived: number;
    let feePercentage: number;

    if (mode === "public") {
      // Public transfer: StealthPay fee (0.3%)
      const result = calculateWithdrawalFee(amount, false);
      estimatedFee = result.fee;
      estimatedReceived = result.netAmount;
      feePercentage = FEES.WITHDRAWAL.PUBLIC_RATE * 100;
    } else {
      // Private withdrawal via Privacy Cash
      // Based on observed fees: ~15% for small amounts
      // Fee decreases with larger amounts
      if (amount < 10) {
        feePercentage = 15; // 15% for < $10
      } else if (amount < 100) {
        feePercentage = 12; // 12% for $10-100
      } else if (amount < 1000) {
        feePercentage = 8; // 8% for $100-1000
      } else {
        feePercentage = 5; // 5% for > $1000
      }

      estimatedFee = amount * (feePercentage / 100);
      estimatedReceived = amount - estimatedFee;
    }

    return NextResponse.json({
      amount,
      mode: mode || "private",
      estimatedFee: Math.round(estimatedFee * 100) / 100,
      estimatedReceived: Math.round(estimatedReceived * 100) / 100,
      feePercentage: Math.round(feePercentage * 10) / 10,
      warning: mode !== "public" && amount < 10
        ? "Small amounts have higher percentage fees. Consider withdrawing larger amounts."
        : undefined,
    });
  } catch (error: any) {
    console.error("[Withdrawals] Estimate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to estimate fee" },
      { status: 500 }
    );
  }
}
