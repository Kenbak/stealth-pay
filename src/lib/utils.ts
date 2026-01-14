import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a Solana amount (lamports to SOL)
 */
export function formatSol(lamports: number): string {
  return (lamports / 1_000_000_000).toFixed(4);
}

/**
 * Truncate a wallet address for display
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Check if we're running on the server
 */
export function isServer(): boolean {
  return typeof window === "undefined";
}

/**
 * Check if we're running in development
 */
export function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Token mint addresses (devnet)
 */
export const TOKENS = {
  SOL: {
    name: "SOL",
    symbol: "SOL",
    decimals: 9,
    mint: "So11111111111111111111111111111111111111112",
    icon: "◎",
  },
  USDC: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // Devnet USDC
    icon: "$",
  },
  USDT: {
    name: "Tether",
    symbol: "USDT",
    decimals: 6,
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // Mainnet, use different for devnet
    icon: "₮",
  },
} as const;

/**
 * Get token info by mint address
 */
export function getTokenByMint(mint: string) {
  return Object.values(TOKENS).find((t) => t.mint === mint);
}
