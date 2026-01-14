"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  // SolflareWalletAdapter - removed, now auto-detected as Standard Wallet
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Get RPC URL - prioritize Helius for enhanced performance
  const endpoint = useMemo(() => {
    const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

    // Use Helius if API key is configured
    if (heliusApiKey) {
      const heliusNetwork = network === "mainnet-beta" ? "mainnet" : network;
      console.log("[WALLET] Using Helius RPC");
      return `https://${heliusNetwork}.helius-rpc.com/?api-key=${heliusApiKey}`;
    }

    // Check for custom RPC URL
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (rpcUrl) return rpcUrl;

    // Fallback to public RPC
    return clusterApiUrl(network as "devnet" | "mainnet-beta" | "testnet");
  }, []);

  // Initialize wallets
  // Note: Solflare is now auto-detected as a Standard Wallet, no adapter needed
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
