import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/treasury/transactions - Get treasury transaction history
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const transactions = await prisma.treasuryTransaction.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50 transactions
    });

    return NextResponse.json({
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        tokenMint: tx.tokenMint,
        txHash: tx.txHash,
        feeAmount: tx.feeAmount ? Number(tx.feeAmount) : null,
        feeTxHash: tx.feeTxHash,
        payrollId: tx.payrollId,
        createdAt: tx.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get treasury transactions error:", error);
    return NextResponse.json(
      { error: "Failed to get transactions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/treasury/transactions - Record a new treasury transaction
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await request.json();
    const { type, amount, tokenMint, txHash, feeAmount, feeTxHash, payrollId } = body;

    // Validate required fields
    if (!type || !amount || !tokenMint || !txHash) {
      return NextResponse.json(
        { error: "Missing required fields: type, amount, tokenMint, txHash" },
        { status: 400 }
      );
    }

    // Validate type
    if (!["DEPOSIT", "WITHDRAW", "PAYROLL_OUT"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be DEPOSIT, WITHDRAW, or PAYROLL_OUT" },
        { status: 400 }
      );
    }

    // Check for duplicate txHash
    const existing = await prisma.treasuryTransaction.findUnique({
      where: { txHash },
    });

    if (existing) {
      // Already recorded, return success
      return NextResponse.json({ transaction: existing, duplicate: true });
    }

    const transaction = await prisma.treasuryTransaction.create({
      data: {
        organizationId: organization.id,
        type,
        amount,
        tokenMint,
        txHash,
        feeAmount: feeAmount || null,
        feeTxHash: feeTxHash || null,
        payrollId: payrollId || null,
      },
    });

    return NextResponse.json({
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        tokenMint: transaction.tokenMint,
        txHash: transaction.txHash,
        createdAt: transaction.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create treasury transaction error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
