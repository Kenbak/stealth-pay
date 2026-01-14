import { PublicKey } from "@solana/web3.js";

/**
 * Fee configuration for StealthPay
 */
export const FEES = {
  // Fee wallet address (StealthPay revenue)
  // TODO: Replace with real wallet before mainnet
  WALLET: new PublicKey("FEE1111111111111111111111111111111111111111"),

  // Fee rates by tier
  RATES: {
    FREE: 0.005,      // 0.5% for free tier
    PRO: 0.003,       // 0.3% for pro
    BUSINESS: 0.001,  // 0.1% for business
    ENTERPRISE: 0,    // 0% for enterprise (custom deal)
  } as const,

  // Default rate for MVP
  DEFAULT_RATE: 0.003, // 0.3%

  // Minimum fee in USD (to cover gas costs)
  MINIMUM_USD: 0.50,
};

export type FeeTier = keyof typeof FEES.RATES;

/**
 * Calculate fee for a given amount
 */
export function calculateFee(
  amount: number,
  tier: FeeTier = "FREE"
): {
  fee: number;
  netAmount: number;
  feePercentage: number;
} {
  const rate = FEES.RATES[tier];
  let fee = amount * rate;

  // Apply minimum fee
  if (fee < FEES.MINIMUM_USD && fee > 0) {
    fee = FEES.MINIMUM_USD;
  }

  const netAmount = Math.max(0, amount - fee);

  return {
    fee: Math.round(fee * 100) / 100, // Round to 2 decimals
    netAmount: Math.round(netAmount * 100) / 100,
    feePercentage: rate * 100,
  };
}

/**
 * Format fee display
 */
export function formatFeeBreakdown(
  amount: number,
  tier: FeeTier = "FREE"
): {
  depositAmount: string;
  feeAmount: string;
  netAmount: string;
  feePercentage: string;
  savings?: string;
} {
  const { fee, netAmount, feePercentage } = calculateFee(amount, tier);

  return {
    depositAmount: `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    feeAmount: `$${fee.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    netAmount: `$${netAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    feePercentage: `${feePercentage}%`,
  };
}
