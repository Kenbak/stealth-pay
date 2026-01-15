"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useAuth } from "./use-auth";
import { getPoolBalance, fromSmallestUnit } from "@/lib/shadowwire";
import { usePrices } from "./use-prices";
import { getTokenBalances, isHeliusConfigured } from "@/lib/helius";

// USDC mint address
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

interface TreasuryBalance {
  // Wallet balance
  walletSol: number;
  walletUsdc: number;
  // Pool balance (ShadowWire - ready for private payroll)
  poolSol: number;
  poolUsdc: number;
  // Total in USD
  totalUsd: number;
  // Pool total (what matters for payroll)
  poolTotalUsd: number;
}

export function useTreasury() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { isAuthenticated } = useAuth();
  const { getPrice } = usePrices();

  const { data: balance, isLoading, error, refetch } = useQuery({
    queryKey: ["treasury", publicKey?.toBase58()],
    queryFn: async (): Promise<TreasuryBalance> => {
      if (!publicKey) {
        return {
          walletSol: 0, walletUsdc: 0,
          poolSol: 0, poolUsdc: 0,
          totalUsd: 0, poolTotalUsd: 0
        };
      }

      const wallet = publicKey.toBase58();

      try {
        // Get wallet SOL balance
        const solBalance = await connection.getBalance(publicKey);
        const walletSol = solBalance / LAMPORTS_PER_SOL;

        // Get wallet USDC balance using Helius DAS API
        let walletUsdc = 0;
        if (isHeliusConfigured()) {
          try {
            const tokenBalances = await getTokenBalances(wallet);
            const usdcBalance = tokenBalances.find(t => t.mint === USDC_MINT);
            if (usdcBalance) {
              walletUsdc = usdcBalance.amount;
              console.log('[TREASURY] Helius USDC balance:', walletUsdc);
            }
          } catch (err) {
            console.warn('[TREASURY] Helius token balance failed, using fallback:', err);
          }
        }

        // Get pool balances from ShadowWire
        let poolSol = 0;
        let poolUsdc = 0;

        try {
          const [solPoolBalance, usdcPoolBalance] = await Promise.allSettled([
            getPoolBalance(wallet, 'SOL'),
            getPoolBalance(wallet, 'USDC'),
          ]);

          if (solPoolBalance.status === 'fulfilled') {
            poolSol = fromSmallestUnit(solPoolBalance.value.available, 'SOL');
          }
          if (usdcPoolBalance.status === 'fulfilled') {
            poolUsdc = fromSmallestUnit(usdcPoolBalance.value.available, 'USDC');
          }
        } catch (err) {
          console.warn('[TREASURY] Failed to fetch pool balance:', err);
        }

        // Calculate USD values
        const solPrice = getPrice('SOL') || 190; // Fallback price

        const walletTotalUsd = walletSol * solPrice + walletUsdc;
        const poolTotalUsd = poolSol * solPrice + poolUsdc;
        const totalUsd = walletTotalUsd + poolTotalUsd;

        return {
          walletSol,
          walletUsdc,
          poolSol,
          poolUsdc,
          totalUsd,
          poolTotalUsd,
        };
      } catch (err) {
        console.error("[TREASURY] Failed to fetch treasury balance:", err);
        return {
          walletSol: 0, walletUsdc: 0,
          poolSol: 0, poolUsdc: 0,
          totalUsd: 0, poolTotalUsd: 0
        };
      }
    },
    enabled: connected && isAuthenticated && !!publicKey,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  return {
    balance: balance || {
      walletSol: 0, walletUsdc: 0,
      poolSol: 0, poolUsdc: 0,
      totalUsd: 0, poolTotalUsd: 0
    },
    isLoading,
    error,
    refetch,
    walletAddress: publicKey?.toBase58() || null,
  };
}
