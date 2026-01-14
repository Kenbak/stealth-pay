/**
 * Jupiter Swap Integration
 *
 * Jupiter is the leading DEX aggregator on Solana.
 * We use it to swap SOL → USDC before depositing to ShadowWire.
 *
 * API Docs: https://dev.jup.ag/docs/swap/get-quote
 *
 * NOTE: Using the new Metis Swap API (v1) as v6 is deprecated
 */

import {
  Connection,
  PublicKey,
  VersionedTransaction,
  Transaction,
} from "@solana/web3.js";

// Jupiter API endpoints (Metis Swap API v1)
// Docs: https://dev.jup.ag/docs/swap/get-quote
const JUPITER_QUOTE_API = "https://api.jup.ag/swap/v1/quote";
const JUPITER_SWAP_API = "https://api.jup.ag/swap/v1/swap";

// API Key - Required for Metis Swap API v1
// Get your key at: https://dev.jup.ag
const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";

// Token mints (mainnet - Jupiter swaps only work on mainnet)
// Note: Jupiter only supports mainnet swaps
export const TOKEN_MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
} as const;

/**
 * Check if Jupiter swaps are available (mainnet only)
 */
export function isJupiterAvailable(): boolean {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
  return network === "mainnet-beta";
}

// Token decimals
export const TOKEN_DECIMALS: Record<string, number> = {
  [TOKEN_MINTS.SOL]: 9,
  [TOKEN_MINTS.USDC]: 6,
  [TOKEN_MINTS.USDT]: 6,
};

// Quote response type
export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: null | {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

export interface SwapResult {
  success: boolean;
  signature?: string;
  inputAmount: number;
  outputAmount: number;
  error?: string;
}

/**
 * Get a swap quote from Jupiter
 *
 * Uses the Metis Swap API v1
 * Docs: https://dev.jup.ag/docs/swap/get-quote
 */
export async function getSwapQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: number; // in smallest units (lamports for SOL, 1e6 for USDC)
  slippageBps?: number; // default 50 = 0.5%
}): Promise<JupiterQuote | null> {
  const { inputMint, outputMint, amount, slippageBps = 50 } = params;

  try {
    const url = new URL(JUPITER_QUOTE_API);
    url.searchParams.set("inputMint", inputMint);
    url.searchParams.set("outputMint", outputMint);
    url.searchParams.set("amount", amount.toString());
    url.searchParams.set("slippageBps", slippageBps.toString());
    // Restrict to liquid intermediate tokens for more stable routes
    url.searchParams.set("restrictIntermediateTokens", "true");

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add API key if available
    if (JUPITER_API_KEY) {
      headers["x-api-key"] = JUPITER_API_KEY;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Jupiter quote error:", response.status, errorText);

      // Specific error for missing API key
      if (response.status === 401 || response.status === 403) {
        console.error("Jupiter API key may be required. Set NEXT_PUBLIC_JUPITER_API_KEY env variable.");
      }

      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to get Jupiter quote:", error);
    return null;
  }
}

/**
 * Get swap transaction from Jupiter
 *
 * Docs: https://dev.jup.ag/docs/swap/build-swap-transaction
 */
export async function getSwapTransaction(params: {
  quote: JupiterQuote;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  feeAccount?: string; // Optional: our fee wallet for referral fees
}): Promise<string | null> {
  const { quote, userPublicKey, wrapAndUnwrapSol = true } = params;

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add API key if available
    if (JUPITER_API_KEY) {
      headers["x-api-key"] = JUPITER_API_KEY;
    }

    const response = await fetch(JUPITER_SWAP_API, {
      method: "POST",
      headers,
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol,
        // Optional: Add our fee
        // feeAccount: params.feeAccount,
      }),
    });

    if (!response.ok) {
      console.error("Jupiter swap error:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.swapTransaction; // base64 encoded transaction
  } catch (error) {
    console.error("Failed to get Jupiter swap transaction:", error);
    return null;
  }
}

/**
 * Decode Jupiter swap transaction
 */
export function decodeSwapTransaction(base64Tx: string): VersionedTransaction {
  const buffer = Buffer.from(base64Tx, "base64");
  return VersionedTransaction.deserialize(buffer);
}

/**
 * Convert human-readable amount to smallest units
 */
export function toSmallestUnit(amount: number, mint: string): number {
  const decimals = TOKEN_DECIMALS[mint] || 9;
  return Math.floor(amount * Math.pow(10, decimals));
}

/**
 * Convert smallest units to human-readable amount
 */
export function fromSmallestUnit(amount: number | string, mint: string): number {
  const decimals = TOKEN_DECIMALS[mint] || 9;
  return Number(amount) / Math.pow(10, decimals);
}

/**
 * Get a quote for swapping SOL to USDC
 */
export async function getSOLtoUSDCQuote(solAmount: number): Promise<{
  quote: JupiterQuote | null;
  usdcAmount: number;
  priceImpact: number;
  rate: number;
}> {
  const inputAmount = toSmallestUnit(solAmount, TOKEN_MINTS.SOL);

  const quote = await getSwapQuote({
    inputMint: TOKEN_MINTS.SOL,
    outputMint: TOKEN_MINTS.USDC,
    amount: inputAmount,
    slippageBps: 50, // 0.5% slippage
  });

  if (!quote) {
    return { quote: null, usdcAmount: 0, priceImpact: 0, rate: 0 };
  }

  const usdcAmount = fromSmallestUnit(quote.outAmount, TOKEN_MINTS.USDC);
  const priceImpact = parseFloat(quote.priceImpactPct);
  const rate = usdcAmount / solAmount;

  return { quote, usdcAmount, priceImpact, rate };
}

/**
 * Get a quote for swapping USDC to SOL (for withdrawals)
 */
export async function getUSDCtoSOLQuote(usdcAmount: number): Promise<{
  quote: JupiterQuote | null;
  solAmount: number;
  priceImpact: number;
  rate: number;
}> {
  const inputAmount = toSmallestUnit(usdcAmount, TOKEN_MINTS.USDC);

  const quote = await getSwapQuote({
    inputMint: TOKEN_MINTS.USDC,
    outputMint: TOKEN_MINTS.SOL,
    amount: inputAmount,
    slippageBps: 50,
  });

  if (!quote) {
    return { quote: null, solAmount: 0, priceImpact: 0, rate: 0 };
  }

  const solAmount = fromSmallestUnit(quote.outAmount, TOKEN_MINTS.SOL);
  const priceImpact = parseFloat(quote.priceImpactPct);
  const rate = solAmount / usdcAmount;

  return { quote, solAmount, priceImpact, rate };
}

export default {
  getSwapQuote,
  getSwapTransaction,
  decodeSwapTransaction,
  getSOLtoUSDCQuote,
  getUSDCtoSOLQuote,
  toSmallestUnit,
  fromSmallestUnit,
  TOKEN_MINTS,
  TOKEN_DECIMALS,
};
