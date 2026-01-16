/**
 * Helius API Integration
 *
 * Enhanced Solana APIs for better UX:
 * - Priority fee estimation (faster tx confirmation)
 * - Enhanced transaction parsing
 * - Token balances (DAS API)
 *
 * Docs: https://docs.helius.dev/
 */

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

// Helius API base URL
function getHeliusApiUrl(): string {
  return `https://api.helius.xyz/v0`;
}

function getHeliusRpcUrl(): string {
  const network = NETWORK === "mainnet-beta" ? "mainnet" : NETWORK;
  return `https://${network}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
}

/**
 * Get recommended priority fees for faster transaction confirmation
 * Returns fees in microlamports per compute unit
 *
 * @see https://docs.helius.dev/solana-rpc-nodes/priority-fee-api
 */
export async function getPriorityFee(
  accountKeys?: string[],
  options?: { percentile?: number }
): Promise<{
  min: number;
  low: number;
  medium: number;
  high: number;
  veryHigh: number;
  recommended: number;
}> {
  if (!HELIUS_API_KEY) {
    console.warn("[HELIUS] No API key, returning default fees");
    return {
      min: 0,
      low: 1000,
      medium: 10000,
      high: 100000,
      veryHigh: 1000000,
      recommended: 10000,
    };
  }

  try {
    const response = await fetch(getHeliusRpcUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "priority-fee",
        method: "getPriorityFeeEstimate",
        params: [
          {
            accountKeys: accountKeys || [],
            options: {
              includeAllPriorityFeeLevels: true,
              ...options,
            },
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("[HELIUS] Priority fee error:", data.error);
      throw new Error(data.error.message);
    }

    const levels = data.result?.priorityFeeLevels || {};

    return {
      min: levels.min || 0,
      low: levels.low || 1000,
      medium: levels.medium || 10000,
      high: levels.high || 100000,
      veryHigh: levels.veryHigh || 1000000,
      recommended: levels.medium || 10000,
    };
  } catch (error) {
    console.error("[HELIUS] Failed to get priority fees:", error);
    // Return sensible defaults
    return {
      min: 0,
      low: 1000,
      medium: 10000,
      high: 100000,
      veryHigh: 1000000,
      recommended: 10000,
    };
  }
}

/**
 * Parse transaction with enhanced Helius parsing
 * Returns human-readable transaction data
 *
 * @see https://docs.helius.dev/solana-apis/enhanced-transactions-api/parse-transaction-s
 */
export interface ParsedTransaction {
  signature: string;
  timestamp: number;
  type: string;
  description: string;
  source: string;
  fee: number;
  feePayer: string;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    tokenAmount: number;
    mint: string;
    tokenName?: string;
    tokenSymbol?: string;
  }>;
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
    }>;
  }>;
}

export async function parseTransaction(signature: string): Promise<ParsedTransaction | null> {
  if (!HELIUS_API_KEY) {
    console.warn("[HELIUS] No API key, cannot parse transaction");
    return null;
  }

  try {
    const response = await fetch(
      `${getHeliusApiUrl()}/transactions?api-key=${HELIUS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: [signature],
        }),
      }
    );

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    return data[0] as ParsedTransaction;
  } catch (error) {
    console.error("[HELIUS] Failed to parse transaction:", error);
    return null;
  }
}

/**
 * Parse multiple transactions in batch
 */
export async function parseTransactions(
  signatures: string[]
): Promise<ParsedTransaction[]> {
  if (!HELIUS_API_KEY || signatures.length === 0) {
    return [];
  }

  try {
    const response = await fetch(
      `${getHeliusApiUrl()}/transactions?api-key=${HELIUS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: signatures,
        }),
      }
    );

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data as ParsedTransaction[];
  } catch (error) {
    console.error("[HELIUS] Failed to parse transactions:", error);
    return [];
  }
}

/**
 * Get all token balances for a wallet using DAS API
 *
 * @see https://docs.helius.dev/solana-apis/digital-asset-standard-das-api
 */
export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  tokenAccount: string;
  // Metadata (if available)
  name?: string;
  symbol?: string;
  logoUri?: string;
}

export async function getTokenBalances(wallet: string): Promise<TokenBalance[]> {
  if (!HELIUS_API_KEY) {
    console.warn("[HELIUS] No API key, cannot fetch token balances");
    return [];
  }

  try {
    const response = await fetch(getHeliusRpcUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "token-balances",
        method: "getAssetsByOwner",
        params: {
          ownerAddress: wallet,
          page: 1,
          limit: 100,
          displayOptions: {
            showFungible: true,
            showNativeBalance: true,
          },
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("[HELIUS] Token balance error:", data.error);
      return [];
    }

    const items = data.result?.items || [];
    const nativeBalance = data.result?.nativeBalance;

    const balances: TokenBalance[] = [];

    // Add native SOL balance
    if (nativeBalance) {
      balances.push({
        mint: "So11111111111111111111111111111111111111112", // Native SOL "mint"
        amount: nativeBalance.lamports / 1e9,
        decimals: 9,
        tokenAccount: wallet,
        name: "Solana",
        symbol: "SOL",
        logoUri: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      });
    }

    // Add fungible tokens
    for (const item of items) {
      if (item.interface === "FungibleToken" || item.interface === "FungibleAsset") {
        const tokenInfo = item.token_info || {};
        const content = item.content || {};
        const metadata = content.metadata || {};
        const links = content.links || {};

        balances.push({
          mint: item.id,
          amount: (tokenInfo.balance || 0) / Math.pow(10, tokenInfo.decimals || 0),
          decimals: tokenInfo.decimals || 0,
          tokenAccount: item.token_info?.associated_token_address || wallet,
          name: metadata.name || tokenInfo.symbol,
          symbol: tokenInfo.symbol,
          logoUri: links.image || content.json_uri,
        });
      }
    }

    return balances;
  } catch (error) {
    console.error("[HELIUS] Failed to get token balances:", error);
    return [];
  }
}

/**
 * Get recent transaction history for a wallet
 * Enhanced with Helius parsing for better readability
 *
 * @see https://docs.helius.dev/solana-apis/enhanced-transactions-api/parsed-transaction-history
 */
export async function getTransactionHistory(
  wallet: string,
  options?: {
    limit?: number;
    before?: string;
    type?: string;
  }
): Promise<ParsedTransaction[]> {
  if (!HELIUS_API_KEY) {
    console.warn("[HELIUS] No API key, cannot fetch history");
    return [];
  }

  try {
    const params = new URLSearchParams({
      "api-key": HELIUS_API_KEY,
    });

    if (options?.before) params.set("before", options.before);
    if (options?.type) params.set("type", options.type);

    const response = await fetch(
      `${getHeliusApiUrl()}/addresses/${wallet}/transactions?${params}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    // Limit results
    const limit = options?.limit || 20;
    return data.slice(0, limit) as ParsedTransaction[];
  } catch (error) {
    console.error("[HELIUS] Failed to get transaction history:", error);
    return [];
  }
}

/**
 * Utility to check if Helius is configured
 */
export function isHeliusConfigured(): boolean {
  return !!HELIUS_API_KEY;
}

/**
 * Get network being used
 */
export function getHeliusNetwork(): string {
  return NETWORK;
}

/**
 * Get the best available RPC URL
 * Uses Helius if configured, otherwise falls back to env or public RPC
 */
export function getRpcUrl(): string {
  if (HELIUS_API_KEY) {
    return getHeliusRpcUrl();
  }
  return process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
}

/**
 * Orb Explorer URL utilities
 * @see https://orbmarkets.io
 */
export function getExplorerTxUrl(signature: string): string {
  return `https://orbmarkets.io/tx/${signature}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `https://orbmarkets.io/address/${address}`;
}

export function getExplorerTokenUrl(mint: string): string {
  return `https://orbmarkets.io/token/${mint}`;
}
