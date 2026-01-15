import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getTransactionHistory, parseTransactions, isHeliusConfigured } from "@/lib/helius";

/**
 * GET /api/treasury/history - Get wallet transaction history
 *
 * Uses Helius Enhanced Transactions API for better parsing
 * Returns human-readable transaction descriptions
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Helius is configured
    if (!isHeliusConfigured()) {
      return NextResponse.json({
        error: "Helius API not configured",
        message: "Transaction history requires HELIUS_API_KEY",
      }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const before = searchParams.get("before") || undefined;
    const type = searchParams.get("type") || undefined;

    // Get transaction history using Helius
    const transactions = await getTransactionHistory(user.wallet, {
      limit,
      before,
      type,
    });

    // Transform to a cleaner format for the frontend
    const formattedTransactions = transactions.map((tx) => ({
      signature: tx.signature,
      timestamp: tx.timestamp,
      type: tx.type,
      description: tx.description,
      fee: tx.fee,
      // Summarize transfers
      transfers: {
        native: tx.nativeTransfers?.map((t) => ({
          from: t.fromUserAccount,
          to: t.toUserAccount,
          amount: t.amount / 1e9, // Convert lamports to SOL
          token: "SOL",
        })) || [],
        token: tx.tokenTransfers?.map((t) => ({
          from: t.fromUserAccount,
          to: t.toUserAccount,
          amount: t.tokenAmount,
          token: t.tokenSymbol || t.mint,
          mint: t.mint,
        })) || [],
      },
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      hasMore: transactions.length === limit,
      lastSignature: transactions[transactions.length - 1]?.signature,
    });
  } catch (error) {
    console.error("Get transaction history error:", error);
    return NextResponse.json(
      { error: "Failed to get transaction history" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/treasury/history/parse - Parse specific transaction signatures
 *
 * Body: { signatures: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isHeliusConfigured()) {
      return NextResponse.json({
        error: "Helius API not configured",
      }, { status: 503 });
    }

    const body = await request.json();
    const { signatures } = body;

    if (!Array.isArray(signatures) || signatures.length === 0) {
      return NextResponse.json({
        error: "Missing or invalid signatures array",
      }, { status: 400 });
    }

    // Limit to 100 signatures per request
    const limitedSignatures = signatures.slice(0, 100);

    const parsed = await parseTransactions(limitedSignatures);

    return NextResponse.json({
      transactions: parsed.map((tx) => ({
        signature: tx.signature,
        timestamp: tx.timestamp,
        type: tx.type,
        description: tx.description,
        fee: tx.fee,
        success: true,
      })),
    });
  } catch (error) {
    console.error("Parse transactions error:", error);
    return NextResponse.json(
      { error: "Failed to parse transactions" },
      { status: 500 }
    );
  }
}
