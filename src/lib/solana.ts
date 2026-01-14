import { Connection, clusterApiUrl } from "@solana/web3.js";

/**
 * Get Solana RPC connection
 * Uses Helius if configured for enhanced performance, otherwise falls back to public RPC
 */
export function getConnection(): Connection {
  const heliusApiKey = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

  let endpoint: string;

  if (heliusApiKey) {
    // Use Helius RPC (better rate limits, webhooks support)
    const heliusNetwork = network === "mainnet-beta" ? "mainnet" : network;
    endpoint = `https://${heliusNetwork}.helius-rpc.com/?api-key=${heliusApiKey}`;
    console.log("[SOLANA] Using Helius RPC");
  } else {
    // Fallback to public RPC
    endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network as "devnet" | "mainnet-beta");
    console.log("[SOLANA] Using public RPC");
  }

  return new Connection(endpoint, "confirmed");
}

/**
 * Get the RPC endpoint URL (for client-side use)
 */
export function getRpcEndpoint(): string {
  const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

  if (heliusApiKey) {
    const heliusNetwork = network === "mainnet-beta" ? "mainnet" : network;
    return `https://${heliusNetwork}.helius-rpc.com/?api-key=${heliusApiKey}`;
  }

  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network as "devnet" | "mainnet-beta");
}
