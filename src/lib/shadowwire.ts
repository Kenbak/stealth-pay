/**
 * ShadowWire SDK Integration for StealthPay
 *
 * Uses the official @radr/shadowwire SDK for private payments
 * https://github.com/Radrdotfun/ShadowWire
 */

import {
  ShadowWireClient,
  TokenUtils,
  SUPPORTED_TOKENS,
  type TokenSymbol,
  type PoolBalance,
  type DepositResponse,
  type WithdrawResponse,
  type TransferResponse,
} from '@radr/shadowwire';

// Re-export types for convenience
export type { TokenSymbol, PoolBalance };
export { SUPPORTED_TOKENS, TokenUtils };

// Token info for UI display
export const TOKEN_INFO: Record<string, { symbol: string; decimals: number }> = {
  SOL: { symbol: 'SOL', decimals: 9 },
  USDC: { symbol: 'USDC', decimals: 6 },
  USD1: { symbol: 'USD1', decimals: 6 },
  RADR: { symbol: 'RADR', decimals: 9 },
};

// Create a singleton client instance
let clientInstance: ShadowWireClient | null = null;

export function getShadowWireClient(): ShadowWireClient {
  if (!clientInstance) {
    // Enable debug mode to see all API calls
    clientInstance = new ShadowWireClient({ debug: true });
  }
  return clientInstance;
}

/**
 * Get balance in the privacy pool
 */
export async function getPoolBalance(
  wallet: string,
  token: TokenSymbol = 'SOL'
): Promise<PoolBalance> {
  const client = getShadowWireClient();
  return client.getBalance(wallet, token);
}

/**
 * Convert human-readable amount to smallest unit (lamports, micro-USDC, etc.)
 */
export function toSmallestUnit(amount: number, token: TokenSymbol): number {
  return TokenUtils.toSmallestUnit(amount, token);
}

/**
 * Convert smallest unit to human-readable amount
 */
export function fromSmallestUnit(amount: number, token: TokenSymbol): number {
  return TokenUtils.fromSmallestUnit(amount, token);
}

/**
 * Get token mint address
 */
export function getTokenMint(token: TokenSymbol): string {
  return TokenUtils.getTokenMint(token);
}

/**
 * Deposit funds into the privacy pool
 * Returns an unsigned transaction that needs to be signed by the user
 */
export async function createDepositTransaction(
  wallet: string,
  amount: number, // in smallest unit (lamports for SOL)
  token: TokenSymbol = 'SOL'
): Promise<DepositResponse> {
  const client = getShadowWireClient();

  // Get token mint for SPL tokens (SOL doesn't need mint)
  const tokenMint = token === 'SOL' ? undefined : TokenUtils.getTokenMint(token);

  return client.deposit({
    wallet,
    amount,
    token_mint: tokenMint,
  });
}

/**
 * Withdraw funds from the privacy pool back to wallet
 * Returns an unsigned transaction that needs to be signed by the user
 */
export async function createWithdrawTransaction(
  wallet: string,
  amount: number, // in smallest unit
  token: TokenSymbol = 'SOL'
): Promise<WithdrawResponse> {
  const client = getShadowWireClient();

  const tokenMint = token === 'SOL' ? undefined : TokenUtils.getTokenMint(token);

  return client.withdraw({
    wallet,
    amount,
    token_mint: tokenMint,
  });
}

/**
 * Execute a private transfer (payroll payment)
 *
 * NOTE: We use the 2-step manual transfer approach because:
 * 1. SDK's transfer() method has a bug where it doesn't pass wallet to sub-methods
 * 2. transferWithClientProofs() requires WASM file to be served
 *
 * This approach manually calls uploadProof() + externalTransfer() with wallet signature.
 * See: https://github.com/Radrdotfun/ShadowWire#2-step-manual-transfer
 *
 * @param sender - Admin wallet address
 * @param recipient - Employee wallet address
 * @param amount - Amount in human-readable units (e.g., 500 for 500 USDC)
 * @param token - Token to transfer
 * @param signMessage - Wallet's signMessage function for authentication
 * @param type - 'internal' for full privacy, 'external' for sender anonymity only
 */
export async function executePrivateTransfer(
  sender: string,
  recipient: string,
  amount: number,
  token: TokenSymbol,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  type: 'internal' | 'external' = 'external'
): Promise<TransferResponse> {
  const client = getShadowWireClient();

  // Convert amount to smallest unit
  const amountSmallestUnit = TokenUtils.toSmallestUnit(amount, token);

  // Generate nonce (timestamp-based)
  const nonce = Math.floor(Date.now() / 1000);

  // Get token mint (for API)
  const tokenMint = TokenUtils.getTokenMint(token);
  const tokenParam = tokenMint === 'Native' ? 'SOL' : tokenMint;

  console.log('[TRANSFER] Step 1: Uploading proof...', { sender, amount, amountSmallestUnit, token: tokenParam });

  // Step 1: Upload proof (backend generates ZK proof)
  const proofResult = await client.uploadProof({
    sender_wallet: sender,
    token: tokenParam,
    amount: amountSmallestUnit,
    nonce,
  });

  console.log('[TRANSFER] Proof uploaded:', proofResult);

  // Calculate relayer fee (1%)
  const relayerFee = Math.floor(amountSmallestUnit * 0.01);

  // Step 2: Execute transfer with wallet signature
  if (type === 'internal') {
    console.log('[TRANSFER] Step 2: Internal transfer with wallet signature...');
    const result = await client.internalTransfer(
      {
        sender_wallet: sender,
        recipient_wallet: recipient,
        token: tokenParam,
        nonce: proofResult.nonce,
        relayer_fee: relayerFee,
      },
      { signMessage } // Pass wallet for signature!
    );

    console.log('[TRANSFER] Internal transfer result:', result);

    // Check if transfer actually succeeded
    if (!result.success) {
      const errorMsg = (result as { error?: string }).error || 'Transfer failed - no transaction signature';
      console.error('[TRANSFER] Internal transfer failed:', errorMsg);
      throw new Error(errorMsg);
    }

    return {
      success: result.success,
      tx_signature: result.tx_signature,
      amount_sent: null,
      amount_hidden: true,
      proof_pda: result.proof_pda,
    };
  } else {
    console.log('[TRANSFER] Step 2: External transfer with wallet signature...');
    const result = await client.externalTransfer(
      {
        sender_wallet: sender,
        recipient_wallet: recipient,
        token: tokenParam,
        nonce: proofResult.nonce,
        relayer_fee: relayerFee,
      },
      { signMessage } // Pass wallet for signature!
    );

    console.log('[TRANSFER] External transfer result:', result);

    // Check if transfer actually succeeded
    if (!result.success) {
      const errorMsg = (result as { error?: string }).error || 'Transfer failed - no transaction signature';
      console.error('[TRANSFER] External transfer failed:', errorMsg);
      throw new Error(errorMsg);
    }

    return {
      success: result.success,
      tx_signature: result.tx_signature,
      amount_sent: result.amount_sent,
      amount_hidden: false,
      proof_pda: result.proof_pda,
    };
  }
}

/**
 * Generate a wallet signature for batch transfers (sign once, use for all)
 * This allows processing many payments with a single wallet signature!
 */
async function generateBatchSignature(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<{ sender_signature: string; signature_message: string }> {
  // Generate nonce (using crypto if available)
  const nonce = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2) + Date.now().toString(36);

  const timestamp = Math.floor(Date.now() / 1000); // Unix seconds

  // Build message: shadowpay:{transferType}:{nonce}:{timestamp}
  const message = `shadowpay:external_transfer:${nonce}:${timestamp}`;

  // Sign message
  const encodedMessage = new TextEncoder().encode(message);
  const signatureBytes = await signMessage(encodedMessage);

  // Encode signature as base58
  const bs58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let signature = '';
  let num = BigInt(0);
  for (const byte of signatureBytes) {
    num = num * BigInt(256) + BigInt(byte);
  }
  while (num > 0) {
    signature = bs58Chars[Number(num % BigInt(58))] + signature;
    num = num / BigInt(58);
  }
  // Add leading zeros
  for (const byte of signatureBytes) {
    if (byte === 0) signature = '1' + signature;
    else break;
  }

  return {
    sender_signature: signature,
    signature_message: message,
  };
}

/**
 * Execute multiple private transfers (batch payroll)
 * OPTIMIZED: Signs ONCE at the beginning, then reuses signature for all transfers!
 * This means the user only needs to approve once in their wallet.
 */
export async function executeBatchPayroll(
  sender: string,
  payments: Array<{
    recipient: string;
    amount: number;
    token: TokenSymbol;
  }>,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  onProgress?: (completed: number, total: number, recipient: string) => void
): Promise<Array<{
  recipient: string;
  txSignature: string;
  success: boolean;
  error?: string;
}>> {
  const client = getShadowWireClient();
  const results: Array<{
    recipient: string;
    txSignature: string;
    success: boolean;
    error?: string;
  }> = [];

  // 🔐 SIGN ONCE - Generate a single signature for all transfers
  console.log('[BATCH] Generating single signature for all transfers...');
  let batchSignature: { sender_signature: string; signature_message: string };

  try {
    batchSignature = await generateBatchSignature(signMessage);
    console.log('[BATCH] Signature generated successfully! Processing', payments.length, 'payments...');
  } catch (error) {
    console.error('[BATCH] Failed to generate signature:', error);
    // Return all failed
    return payments.map(p => ({
      recipient: p.recipient,
      txSignature: '',
      success: false,
      error: 'Failed to sign batch authorization',
    }));
  }

  // Process all payments with the SAME signature
  for (let i = 0; i < payments.length; i++) {
    const payment = payments[i];

    try {
      onProgress?.(i, payments.length, payment.recipient);

      // Get token mint for API
      const tokenMint = TokenUtils.getTokenMint(payment.token);
      const tokenParam = tokenMint === 'Native' ? 'SOL' : tokenMint;

      // Calculate amounts: employee should receive exactly payment.amount
      // ShadowWire charges 1% relayer fee, so we send amount + fee
      const employeeAmount = TokenUtils.toSmallestUnit(payment.amount, payment.token);
      const relayerFee = Math.ceil(employeeAmount * 0.01); // 1% fee (round up to ensure enough)
      const totalAmount = employeeAmount + relayerFee; // Total deducted from treasury

      const nonce = Math.floor(Date.now() / 1000) + i; // Unique nonce per payment

      console.log(`[BATCH] Payment ${i + 1}/${payments.length}: ${payment.amount} ${payment.token} to ${payment.recipient.slice(0, 8)}...`);
      console.log(`[BATCH] Amount breakdown: employee=${employeeAmount}, fee=${relayerFee}, total=${totalAmount}`);

      // Step 1: Upload proof for TOTAL amount (employee amount + fee)
      const proofResult = await client.uploadProof({
        sender_wallet: sender,
        token: tokenParam,
        amount: totalAmount, // Use total amount!
        nonce,
      });

      if (!proofResult.success) {
        throw new Error((proofResult as { error?: string }).error || 'Failed to upload proof');
      }

      // Step 2: External transfer with PRE-SIGNED signature (no wallet interaction!)

      // Call externalTransfer WITHOUT wallet - pass signature directly in request
      const result = await client.externalTransfer({
        sender_wallet: sender,
        recipient_wallet: payment.recipient,
        token: tokenParam,
        nonce: proofResult.nonce,
        relayer_fee: relayerFee,
        // Include pre-generated signature
        ...batchSignature,
      } as Parameters<typeof client.externalTransfer>[0]);

      console.log(`[BATCH] Payment ${i + 1} result:`, result.success ? '✅' : '❌');

      if (!result.success) {
        throw new Error((result as { error?: string }).error || 'Transfer failed');
      }

      results.push({
        recipient: payment.recipient,
        txSignature: result.tx_signature,
        success: true,
      });
    } catch (error) {
      console.error(`[BATCH] Payment ${i + 1} failed:`, error);
      results.push({
        recipient: payment.recipient,
        txSignature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  onProgress?.(payments.length, payments.length, 'Complete');

  console.log(`[BATCH] Complete! ${results.filter(r => r.success).length}/${payments.length} successful`);

  return results;
}
