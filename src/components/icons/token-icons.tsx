"use client";

import { cn } from "@/lib/utils";

interface TokenIconProps {
  className?: string;
  size?: number;
}

/**
 * Solana (SOL) Token Icon
 */
export function SolanaIcon({ className, size = 24 }: TokenIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
    >
      <defs>
        <linearGradient id="solana-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFA3" />
          <stop offset="50%" stopColor="#03E1FF" />
          <stop offset="100%" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="64" fill="url(#solana-gradient)" />
      <path
        d="M40.5 82.3L48.1 74.7C48.5 74.3 49 74.1 49.6 74.1H91.4C92.4 74.1 92.9 75.3 92.2 76L84.6 83.6C84.2 84 83.7 84.2 83.1 84.2H41.3C40.3 84.2 39.8 83 40.5 82.3Z"
        fill="white"
      />
      <path
        d="M40.5 45.6L48.1 38C48.5 37.6 49 37.4 49.6 37.4H91.4C92.4 37.4 92.9 38.6 92.2 39.3L84.6 46.9C84.2 47.3 83.7 47.5 83.1 47.5H41.3C40.3 47.5 39.8 46.3 40.5 45.6Z"
        fill="white"
      />
      <path
        d="M84.6 63.7L92.2 56.1C92.9 55.4 92.4 54.2 91.4 54.2H49.6C49 54.2 48.5 54.4 48.1 54.8L40.5 62.4C39.8 63.1 40.3 64.3 41.3 64.3H83.1C83.7 64.3 84.2 64.1 84.6 63.7Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * USDC Token Icon
 */
export function USDCIcon({ className, size = 24 }: TokenIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
    >
      <circle cx="64" cy="64" r="64" fill="#2775CA" />
      <path
        d="M64 112C90.5097 112 112 90.5097 112 64C112 37.4903 90.5097 16 64 16C37.4903 16 16 37.4903 16 64C16 90.5097 37.4903 112 64 112Z"
        fill="#2775CA"
      />
      <path
        d="M80.8 73.6C80.8 64.4 75.2 61.2 64 59.6C55.6 58.4 54 56 54 52.4C54 48.8 56.8 46.4 62.4 46.4C67.6 46.4 70.4 48 71.6 52C72 53.2 73.2 54 74.4 54H78.4C80 54 81.2 52.8 81.2 51.2V50.8C80 44.4 75.2 39.6 68 38.4V32.8C68 31.2 66.8 30 65.2 30H62.8C61.2 30 60 31.2 60 32.8V38.4C51.6 39.6 46 45.6 46 53.2C46 62 51.6 65.2 62.8 66.8C70.4 68 73.2 70 73.2 74C73.2 78 69.6 81.2 64 81.2C56.4 81.2 53.6 78 52.8 74C52.4 72.8 51.2 72 50 72H45.6C44 72 42.8 73.2 42.8 74.8V75.2C44 82.4 49.2 88 60 89.6V95.2C60 96.8 61.2 98 62.8 98H65.2C66.8 98 68 96.8 68 95.2V89.6C76.4 88.4 82 82 80.8 73.6Z"
        fill="white"
      />
      <path
        d="M51.2 102.4C31.2 95.6 20.4 73.6 27.2 53.6C31.2 42 40.8 32.8 52.4 28.8C54 28.4 55.2 26.8 55.2 25.2V21.6C55.2 20 54 18.8 52.4 19.2C51.6 19.2 51.2 19.6 50.8 20C26.8 28.4 14 54.4 22.4 78.4C27.6 93.2 39.2 104.8 54 110C55.2 110.4 56.4 109.6 56.8 108.4C57.2 108 57.2 107.6 57.2 106.8V103.2C55.2 101.6 53.6 102.8 51.2 102.4ZM77.6 20C76.4 19.6 75.2 20.4 74.8 21.6C74.4 22 74.4 22.4 74.4 23.2V26.8C74.4 28.8 76 30 77.6 30.4C97.6 37.2 108.4 59.2 101.6 79.2C97.6 90.8 88 100 76.4 104C74.8 104.4 73.6 106 73.6 107.6V111.2C73.6 112.8 74.8 114 76.4 113.6C77.2 113.6 77.6 113.2 78 112.8C102 104.4 114.8 78.4 106.4 54.4C101.2 39.6 89.6 28 77.6 20Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Generic token icon with symbol
 */
export function TokenIcon({
  symbol,
  className,
  size = 24
}: TokenIconProps & { symbol: string }) {
  if (symbol === "SOL") {
    return <SolanaIcon className={className} size={size} />;
  }
  if (symbol === "USDC") {
    return <USDCIcon className={className} size={size} />;
  }

  // Fallback for unknown tokens
  return (
    <div
      className={cn(
        "rounded-full bg-muted flex items-center justify-center text-xs font-bold",
        className
      )}
      style={{ width: size, height: size }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
