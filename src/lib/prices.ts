/**
 * Price service for getting token prices
 * Uses Jupiter API (free, reliable, Solana-native)
 */

import { TOKENS } from "./utils";

// Cache prices for 30 seconds to avoid rate limiting
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds

/**
 * Known token addresses for price lookups
 */
const TOKEN_IDS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Mainnet USDC
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // Mainnet USDT
} as const;

/**
 * Fetch price from Jupiter API
 */
async function fetchJupiterPrice(tokenId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.jup.ag/price/v2?ids=${tokenId}`
    );

    if (!response.ok) {
      console.error("Jupiter API error:", response.status);
      return null;
    }

    const data = await response.json();
    return data.data?.[tokenId]?.price || null;
  } catch (error) {
    console.error("Failed to fetch Jupiter price:", error);
    return null;
  }
}

/**
 * Fallback: Fetch price from CoinGecko
 */
async function fetchCoinGeckoPrice(symbol: string): Promise<number | null> {
  try {
    const coinIds: Record<string, string> = {
      SOL: "solana",
      USDC: "usd-coin",
      USDT: "tether",
    };

    const coinId = coinIds[symbol];
    if (!coinId) return null;

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data[coinId]?.usd || null;
  } catch (error) {
    console.error("Failed to fetch CoinGecko price:", error);
    return null;
  }
}

/**
 * Get token price in USD
 */
export async function getTokenPrice(symbol: string): Promise<number> {
  // Stablecoins are always $1
  if (symbol === "USDC" || symbol === "USDT") {
    return 1;
  }

  // Check cache
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  // Try Jupiter first
  const tokenId = TOKEN_IDS[symbol as keyof typeof TOKEN_IDS];
  let price: number | null = null;

  if (tokenId) {
    price = await fetchJupiterPrice(tokenId);
  }

  // Fallback to CoinGecko
  if (price === null) {
    price = await fetchCoinGeckoPrice(symbol);
  }

  // Default fallback price (for devnet/testing)
  if (price === null) {
    const fallbackPrices: Record<string, number> = {
      SOL: 150, // Approximate SOL price
    };
    price = fallbackPrices[symbol] || 0;
    console.warn(`Using fallback price for ${symbol}: $${price}`);
  }

  // Cache the price
  priceCache.set(symbol, { price, timestamp: Date.now() });

  return price;
}

/**
 * Convert token amount to USD
 */
export async function tokenToUsd(
  amount: number,
  symbol: string
): Promise<number> {
  const price = await getTokenPrice(symbol);
  return amount * price;
}

/**
 * Convert USD to token amount
 */
export async function usdToToken(
  usdAmount: number,
  symbol: string
): Promise<number> {
  const price = await getTokenPrice(symbol);
  if (price === 0) return 0;
  return usdAmount / price;
}

/**
 * Format token amount with USD equivalent
 */
export async function formatWithUsd(
  amount: number,
  symbol: string
): Promise<string> {
  const usdValue = await tokenToUsd(amount, symbol);
  return `${amount.toFixed(4)} ${symbol} (~$${usdValue.toFixed(2)})`;
}

/**
 * React hook for token prices (client-side)
 */
export function usePriceHook() {
  // This is just a helper for organizing the exports
  // The actual hook implementation is in use-prices.ts
  return { getTokenPrice, tokenToUsd, usdToToken };
}
