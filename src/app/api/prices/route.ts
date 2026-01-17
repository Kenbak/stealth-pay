import { NextRequest, NextResponse } from "next/server";
import { TOKENS } from "@/lib/utils";

// Fallback prices (updated periodically for devnet testing)
const FALLBACK_PRICES = {
  SOL: 180,
  USDC: 1,
  USDT: 1,
};

// Token mint addresses
const TOKEN_MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Mainnet USDC
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // Mainnet USDT
};

// Simple rate limiting (60 requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

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

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000);

/**
 * GET /api/prices - Get token prices
 *
 * Uses Jupiter Price API V3 (the new version!)
 * Docs: https://hub.jup.ag/docs/price-api/v3
 *
 * - Lite URL (free): https://lite-api.jup.ag/price/v3
 * - Pro URL (with key): https://api.jup.ag/price/v3
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
             request.headers.get("x-real-ip") ||
             "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait." },
      { status: 429 }
    );
  }
  const prices: Record<string, number> = {
    USDC: 1,
    USDT: 1,
  };

  try {
    // Use Jupiter Price API V3 (Lite - free, no API key needed)
    const mintIds = `${TOKEN_MINTS.SOL}`;
    const jupiterResponse = await fetch(
      `https://lite-api.jup.ag/price/v3?ids=${mintIds}`,
      {
        headers: {
          Accept: "application/json",
        },
        // Cache for 30 seconds
        next: { revalidate: 30 },
      }
    );

    if (jupiterResponse.ok) {
      const data = await jupiterResponse.json();

      // Jupiter V3 response format: { "mint": { "usdPrice": number, ... } }
      if (data[TOKEN_MINTS.SOL]?.usdPrice) {
        prices.SOL = data[TOKEN_MINTS.SOL].usdPrice;
      } else {
        // Fallback to CoinGecko if Jupiter doesn't have the price
        prices.SOL = await fetchSolPriceFromCoinGecko();
      }
    } else {
      console.warn("Jupiter API error:", jupiterResponse.status);
      // Fallback to CoinGecko
      prices.SOL = await fetchSolPriceFromCoinGecko();
    }

    return NextResponse.json({
      prices,
      source: "jupiter-v3",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Price fetch error:", error);

    // Try CoinGecko as fallback
    try {
      prices.SOL = await fetchSolPriceFromCoinGecko();
      return NextResponse.json({
        prices,
        source: "coingecko",
        timestamp: Date.now(),
      });
    } catch {
      return NextResponse.json({
        prices: FALLBACK_PRICES,
        source: "fallback",
        timestamp: Date.now(),
      });
    }
  }
}

/**
 * Fallback: Fetch SOL price from CoinGecko
 */
async function fetchSolPriceFromCoinGecko(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.solana?.usd) {
        return data.solana.usd;
      }
    }
  } catch (error) {
    console.error("CoinGecko fallback error:", error);
  }

  return FALLBACK_PRICES.SOL;
}
