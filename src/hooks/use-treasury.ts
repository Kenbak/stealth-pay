"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useAuth } from "./use-auth";

interface TreasuryBalance {
  sol: number;
  usdc: number; // Will be 0 for now (need SPL token integration)
  totalUsd: number;
}

// USDC devnet mint
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

export function useTreasury() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { isAuthenticated } = useAuth();

  const { data: balance, isLoading, error, refetch } = useQuery({
    queryKey: ["treasury", publicKey?.toBase58()],
    queryFn: async (): Promise<TreasuryBalance> => {
      if (!publicKey) {
        return { sol: 0, usdc: 0, totalUsd: 0 };
      }

      try {
        // Get SOL balance
        const solBalance = await connection.getBalance(publicKey);
        const sol = solBalance / LAMPORTS_PER_SOL;

        // For now, assume 1 SOL = $150 (in production, use price oracle)
        const solPrice = 150;

        // TODO: Get USDC balance from SPL token account
        // For MVP, we'll just use SOL
        const usdc = 0;

        const totalUsd = sol * solPrice + usdc;

        return {
          sol,
          usdc,
          totalUsd,
        };
      } catch (err) {
        console.error("Failed to fetch treasury balance:", err);
        return { sol: 0, usdc: 0, totalUsd: 0 };
      }
    },
    enabled: connected && isAuthenticated && !!publicKey,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  return {
    balance: balance || { sol: 0, usdc: 0, totalUsd: 0 },
    isLoading,
    error,
    refetch,
    walletAddress: publicKey?.toBase58() || null,
  };
}
