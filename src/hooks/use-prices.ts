"use client";

import { useQuery } from "@tanstack/react-query";

// Fallback prices for when API fails
const FALLBACK_PRICES: Record<string, number> = {
  SOL: 180,
  USDC: 1,
  USDT: 1,
};

/**
 * Fetch prices from our API route (which uses Jupiter V3 + CoinGecko fallback)
 * This avoids CORS issues and centralizes price logic
 */
async function fetchPrices(): Promise<Record<string, number>> {
  try {
    const response = await fetch("/api/prices");

    if (!response.ok) {
      console.warn("Price API returned error, using fallback prices");
      return FALLBACK_PRICES;
    }

    const data = await response.json();
    return data.prices || FALLBACK_PRICES;
  } catch (error) {
    console.warn("Price fetch error, using fallback:", error);
    return FALLBACK_PRICES;
  }
}

export function usePrices() {
  const query = useQuery({
    queryKey: ["token-prices"],
    queryFn: fetchPrices,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 1, // Only retry once
  });

  const getPrice = (symbol: string): number => {
    return query.data?.[symbol] || FALLBACK_PRICES[symbol] || 0;
  };

  const toUsd = (amount: number, symbol: string): number => {
    const price = getPrice(symbol);
    return amount * price;
  };

  const fromUsd = (usdAmount: number, symbol: string): number => {
    const price = getPrice(symbol);
    if (price === 0) return 0;
    return usdAmount / price;
  };

  return {
    prices: query.data || FALLBACK_PRICES,
    isLoading: query.isLoading,
    error: query.error,
    getPrice,
    toUsd,
    fromUsd,
    refetch: query.refetch,
  };
}
