/**
 * API Endpoint: Get wallet token balances
 *
 * GET /api/balance?wallet=<address>
 *
 * Uses Helius DAS API to fetch token balances
 *
 * Security:
 * - HELIUS_API_KEY is server-side only (never exposed to client)
 * - Wallet balances are public blockchain data
 * - Rate limited to prevent abuse
 * - Response cached for 30 seconds
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokenBalances, isHeliusConfigured } from "@/lib/helius";
import { PublicKey, Connection } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

// USDC Mint on mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Simple in-memory cache (30 second TTL)
const balanceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// Simple rate limiting (10 requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Missing wallet parameter" },
        { status: 400 }
      );
    }

    // Validate wallet address
    try {
      new PublicKey(wallet);
    } catch {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = balanceCache.get(wallet);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log("[Balance API] Cache hit for:", wallet);
      return NextResponse.json({ ...cached.data, cached: true });
    }

    console.log("[Balance API] Fetching balance for:", wallet);

    let responseData: { wallet: string; usdc: number; sol: number; source: string };

    // Try Helius first if configured
    if (isHeliusConfigured()) {
      console.log("[Balance API] Using Helius DAS API");
      const tokenBalances = await getTokenBalances(wallet);

      // Find USDC balance
      const usdcToken = tokenBalances.find(t =>
        t.mint === USDC_MINT.toBase58() ||
        t.symbol === "USDC"
      );

      const solToken = tokenBalances.find(t =>
        t.symbol === "SOL"
      );

      responseData = {
        wallet,
        usdc: usdcToken?.amount || 0,
        sol: solToken?.amount || 0,
        source: "helius",
      };
    } else {
    // Fallback to direct RPC (still using Helius if available)
    console.log("[Balance API] Fallback to RPC");
    const { getRpcUrl } = await import("@/lib/helius");
    const connection = new Connection(getRpcUrl(), "confirmed");

      const walletPubkey = new PublicKey(wallet);
      const ata = await getAssociatedTokenAddress(USDC_MINT, walletPubkey);

      let usdcBalance = 0;
      try {
        const tokenAccount = await connection.getTokenAccountBalance(ata);
        usdcBalance = parseFloat(tokenAccount.value.uiAmountString || "0");
      } catch {
        // Token account doesn't exist
        usdcBalance = 0;
      }

      const solBalance = await connection.getBalance(walletPubkey);

      responseData = {
        wallet,
        usdc: usdcBalance,
        sol: solBalance / 1e9,
        source: "rpc",
      };
    }

    // Cache the result
    balanceCache.set(wallet, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error("[Balance API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
