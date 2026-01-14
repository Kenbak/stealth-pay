/**
 * React hook for ShadowWire SDK integration
 * Provides deposit, withdraw, and transfer functionality with wallet integration
 */

import { useState, useCallback, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { toast } from '@/components/ui/use-toast';
import { TokenSymbol, TokenUtils } from '@radr/shadowwire';
import {
  getPoolBalance,
  createDepositTransaction,
  createWithdrawTransaction,
  executePrivateTransfer,
  executeBatchPayroll,
  toSmallestUnit,
  fromSmallestUnit,
  SUPPORTED_TOKENS,
  TOKEN_INFO,
} from '@/lib/shadowwire';
import { FEES, calculateFee } from '@/lib/fees';

/**
 * Record a treasury transaction in the database
 */
async function recordTreasuryTransaction(data: {
  type: 'DEPOSIT' | 'WITHDRAW' | 'PAYROLL_OUT';
  amount: number;
  tokenMint: string;
  txHash: string;
  feeAmount?: number;
  feeTxHash?: string;
  payrollId?: string;
}) {
  try {
    const token = localStorage.getItem('auth-token');
    if (!token) return;

    await fetch('/api/treasury/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('[TREASURY] Failed to record transaction:', error);
    // Don't throw - this is just for record keeping
  }
}

// ShadowWire minimum deposit amounts (anti-spam)
// Note: These are the amounts BEFORE fee - pool minimum is 5, we add buffer for fee
export const MINIMUM_DEPOSIT = {
  SOL: 0.02,   // Pool needs 0.01 SOL, we add buffer for fee
  USDC: 6,     // Pool needs 5 USDC, we add buffer for 0.3% fee
  RADR: 6,     // Pool needs 5 RADR, we add buffer for fee
} as const;

export interface PoolBalance {
  sol: number;
  usdc: number;
}

export function useShadowWire() {
  const { publicKey, signMessage, signTransaction, signAllTransactions, connected } = useWallet();
  const { connection } = useConnection();

  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<PoolBalance>({ sol: 0, usdc: 0 });
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch balances for SOL and USDC
   */
  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;

    try {
      const wallet = publicKey.toBase58();
      console.log('[BALANCE] Fetching pool balance for:', wallet);

      const [solBalance, usdcBalance] = await Promise.allSettled([
        getPoolBalance(wallet, 'SOL'),
        getPoolBalance(wallet, 'USDC'),
      ]);

      console.log('[BALANCE] SOL result:', solBalance);
      console.log('[BALANCE] USDC result:', usdcBalance);

      const newBalance = {
        sol: solBalance.status === 'fulfilled'
          ? fromSmallestUnit(solBalance.value.available, 'SOL')
          : 0,
        usdc: usdcBalance.status === 'fulfilled'
          ? fromSmallestUnit(usdcBalance.value.available, 'USDC')
          : 0,
      };

      console.log('[BALANCE] Parsed balance:', newBalance);
      setBalance(newBalance);
    } catch (err) {
      console.error('[BALANCE] Failed to fetch pool balance:', err);
    }
  }, [publicKey]);

  // Auto-fetch balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    }
  }, [connected, publicKey, fetchBalance]);

  /**
   * Deposit funds into the privacy pool with StealthPay fee
   * Fee is collected first, then remaining amount is deposited
   */
  const deposit = useCallback(async (
    amount: number,
    token: TokenSymbol = 'SOL',
    skipFee: boolean = false // For testing or special cases
  ): Promise<string | null> => {
    if (!publicKey || !signTransaction) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to deposit',
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const wallet = publicKey.toBase58();

      console.log('[DEPOSIT] Starting deposit:', { amount, token, skipFee });

      // Calculate fee (in USD terms for consistency)
      const tokenDecimals = TokenUtils.getTokenDecimals(token);

      // Check wallet balance first
      if (token === 'SOL') {
        const solBalance = await connection.getBalance(publicKey);
        const solAmount = solBalance / 1e9;
        console.log('[DEPOSIT] SOL balance:', solAmount);
        if (solAmount < amount + 0.01) { // +0.01 for gas
          throw new Error(`Insufficient SOL balance. You have ${solAmount.toFixed(4)} SOL but need ${amount} SOL + gas fees.`);
        }
      } else {
        // Check SPL token balance
        const tokenMint = new PublicKey(TokenUtils.getTokenMint(token));
        const ata = await getAssociatedTokenAddress(tokenMint, publicKey);
        try {
          const tokenAccount = await getAccount(connection, ata);
          const tokenBalance = Number(tokenAccount.amount) / Math.pow(10, tokenDecimals);
          console.log(`[DEPOSIT] ${token} balance:`, tokenBalance);
          if (tokenBalance < amount) {
            throw new Error(`Insufficient ${token} balance. You have ${tokenBalance.toFixed(2)} ${token} but need ${amount} ${token}.`);
          }
        } catch (e: any) {
          if (e.message?.includes('Insufficient')) throw e;
          throw new Error(`You don't have a ${token} token account. Please get some ${token} first.`);
        }
      }

      // For stablecoins, amount = USD value. For SOL, we'd need price conversion
      // For simplicity, we calculate fee on the token amount directly
      const { fee: feeAmount, netAmount } = calculateFee(amount);

      console.log('[DEPOSIT] Fee calculation:', { feeAmount, netAmount });

      // Check minimum deposit (these minimums already include fee buffer)
      const minDeposit = MINIMUM_DEPOSIT[token as keyof typeof MINIMUM_DEPOSIT] || 6;
      if (amount < minDeposit) {
        throw new Error(
          `Minimum deposit is ${minDeposit} ${token}. ` +
          `This ensures enough remains after the 0.3% fee for ShadowWire's pool minimum.`
        );
      }

      // Convert to smallest units
      const feeSmallest = skipFee ? 0 : Math.floor(feeAmount * Math.pow(10, tokenDecimals));
      const depositSmallest = Math.floor(netAmount * Math.pow(10, tokenDecimals));

      console.log('[DEPOSIT] Amounts in smallest units:', { feeSmallest, depositSmallest });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      // Build all transactions first, then batch sign
      const transactionsToSign: Transaction[] = [];
      let feeTx: Transaction | null = null;

      // Build fee transaction (if applicable)
      if (feeSmallest > 0 && !skipFee) {
        feeTx = new Transaction();
        feeTx.recentBlockhash = blockhash;
        feeTx.feePayer = publicKey;

        if (token === 'SOL') {
          feeTx.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: FEES.WALLET,
              lamports: feeSmallest,
            })
          );
        } else {
          // SPL Token transfer (USDC, etc.)
          const tokenMint = new PublicKey(TokenUtils.getTokenMint(token));
          const fromAta = await getAssociatedTokenAddress(tokenMint, publicKey);
          const toAta = await getAssociatedTokenAddress(tokenMint, FEES.WALLET);

          // Check if destination ATA exists, create if needed
          let toAtaExists = false;
          try {
            await getAccount(connection, toAta);
            toAtaExists = true;
          } catch {
            toAtaExists = false;
          }

          if (!toAtaExists) {
            feeTx.add(
              createAssociatedTokenAccountInstruction(
                publicKey,
                toAta,
                FEES.WALLET,
                tokenMint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
              )
            );
          }

          feeTx.add(
            createTransferInstruction(
              fromAta,
              toAta,
              publicKey,
              feeSmallest,
              [],
              TOKEN_PROGRAM_ID
            )
          );
        }

        transactionsToSign.push(feeTx);
      }

      // Build deposit transaction from ShadowWire SDK
      console.log('[DEPOSIT] Calling ShadowWire SDK:', { wallet, depositSmallest, token });

      const response = await createDepositTransaction(wallet, depositSmallest, token);
      console.log('[DEPOSIT] SDK response:', response);

      const txBuffer = Buffer.from(response.unsigned_tx_base64, 'base64');
      const depositTx = Transaction.from(txBuffer);
      depositTx.recentBlockhash = blockhash;
      depositTx.feePayer = publicKey;

      transactionsToSign.push(depositTx);

      // Batch sign all transactions in one wallet popup
      toast({
        title: 'Confirm transaction',
        description: feeSmallest > 0
          ? `Fee: ${feeAmount.toFixed(2)} ${token} + Deposit: ${netAmount.toFixed(2)} ${token}`
          : `Deposit: ${netAmount.toFixed(2)} ${token}`,
      });

      let signedTransactions: Transaction[];
      if (signAllTransactions && transactionsToSign.length > 1) {
        // Batch sign - single wallet popup!
        signedTransactions = await signAllTransactions(transactionsToSign);
      } else {
        // Fallback to single signing
        signedTransactions = [];
        for (const tx of transactionsToSign) {
          signedTransactions.push(await signTransaction(tx));
        }
      }

      // Submit transactions sequentially
      let feeSignature: string | null = null;
      let signature: string;

      if (feeTx && signedTransactions.length > 1) {
        // Submit fee transaction first
        const signedFeeTx = signedTransactions[0];
        feeSignature = await connection.sendRawTransaction(signedFeeTx.serialize());

        await connection.confirmTransaction({
          signature: feeSignature,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');

        console.log('[FEE] Collected:', feeSignature);

        // Submit deposit transaction
        const signedDepositTx = signedTransactions[1];
        signature = await connection.sendRawTransaction(signedDepositTx.serialize());
      } else {
        // No fee, just deposit
        const signedDepositTx = signedTransactions[signedTransactions.length - 1];
        signature = await connection.sendRawTransaction(signedDepositTx.serialize());
      }

      // Confirm deposit
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      console.log('[DEPOSIT] Success! Signature:', signature);

      // Record transaction in database
      const tokenMint = token === 'USDC'
        ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
        : token === 'SOL'
        ? 'So11111111111111111111111111111111111111112'
        : '';

      await recordTreasuryTransaction({
        type: 'DEPOSIT',
        amount: netAmount,
        tokenMint,
        txHash: signature,
        feeAmount: feeAmount > 0 ? feeAmount : undefined,
        feeTxHash: feeSignature || undefined,
      });

      toast({
        title: 'Deposit successful! 🎉',
        description: `${netAmount.toFixed(2)} ${token} deposited to privacy pool`,
      });

      // Refresh balance
      await fetchBalance();

      return signature;
    } catch (err) {
      console.error('[DEPOSIT] Error:', err);

      const message = err instanceof Error ? err.message : 'Deposit failed';
      setError(message);
      toast({
        title: 'Deposit failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, signTransaction, connection, fetchBalance]);

  /**
   * Withdraw funds from the privacy pool
   */
  const withdraw = useCallback(async (
    amount: number,
    token: TokenSymbol = 'SOL'
  ): Promise<string | null> => {
    if (!publicKey || !signTransaction) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to withdraw',
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const wallet = publicKey.toBase58();
      const amountSmallest = toSmallestUnit(amount, token);

      // Get unsigned transaction from SDK
      const response = await createWithdrawTransaction(wallet, amountSmallest, token);

      // Decode and sign
      const txBuffer = Buffer.from(response.unsigned_tx_base64, 'base64');
      const tx = Transaction.from(txBuffer);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signedTx = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      // Record transaction in database
      const tokenMint = token === 'USDC'
        ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
        : token === 'SOL'
        ? 'So11111111111111111111111111111111111111112'
        : '';

      await recordTreasuryTransaction({
        type: 'WITHDRAW',
        amount,
        tokenMint,
        txHash: signature,
      });

      toast({
        title: 'Withdrawal successful',
        description: `${amount} ${token} withdrawn from privacy pool`,
      });

      await fetchBalance();

      return signature;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Withdrawal failed';
      setError(message);
      toast({
        title: 'Withdrawal failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, signTransaction, connection, fetchBalance]);

  /**
   * Execute a single private payment
   */
  const transfer = useCallback(async (
    recipient: string,
    amount: number,
    token: TokenSymbol = 'USDC'
  ): Promise<string | null> => {
    if (!publicKey || !signMessage) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to transfer',
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await executePrivateTransfer(
        publicKey.toBase58(),
        recipient,
        amount,
        token,
        signMessage,
        'external'
      );

      toast({
        title: 'Private transfer complete',
        description: `Sent ${amount} ${token} to ${recipient.slice(0, 8)}...`,
      });

      await fetchBalance();

      return result.tx_signature;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transfer failed';
      setError(message);
      toast({
        title: 'Transfer failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, signMessage, fetchBalance]);

  /**
   * Execute batch payroll (multiple payments)
   * Includes StealthPay fee collection via ShadowWire transfer
   */
  const runPayroll = useCallback(async (
    payments: Array<{
      recipient: string;
      amount: number;
      token: TokenSymbol;
    }>,
    onProgress?: (completed: number, total: number, recipient: string) => void
  ) => {
    if (!publicKey || !signMessage) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to run payroll',
        variant: 'destructive',
      });
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate StealthPay fee (0.3% of total salaries)
      const totalSalaries = payments.reduce((sum, p) => sum + p.amount, 0);
      const stealthPayFee = Math.round(totalSalaries * FEES.PAYROLL.STEALTH_RATE * 100) / 100;

      // Add StealthPay fee as first "payment" in the batch
      // This goes to our fee wallet via ShadowWire (so it's also private!)
      const paymentsWithFee = [
        {
          recipient: FEES.WALLET.toBase58(),
          amount: stealthPayFee,
          token: payments[0]?.token || 'USDC' as TokenSymbol,
        },
        ...payments,
      ];

      console.log('[PAYROLL] Starting batch with StealthPay fee:', {
        totalSalaries,
        stealthPayFee,
        totalPayments: paymentsWithFee.length,
      });

      // Custom progress wrapper to hide fee payment from UI
      const progressWrapper = onProgress ? (completed: number, total: number, recipient: string) => {
        // Skip the first payment (fee) in progress reporting
        if (completed === 0 && recipient === FEES.WALLET.toBase58()) {
          onProgress(0, total - 1, 'Collecting fee...');
        } else {
          onProgress(Math.max(0, completed - 1), total - 1, recipient);
        }
      } : undefined;

      const results = await executeBatchPayroll(
        publicKey.toBase58(),
        paymentsWithFee,
        signMessage,
        progressWrapper
      );

      // Remove fee result from returned results (first item)
      const feeResult = results[0];
      const employeeResults = results.slice(1);

      if (!feeResult.success) {
        console.warn('[PAYROLL] Fee collection failed:', feeResult.error);
        // Continue anyway - don't block payroll for fee collection failure
      } else {
        console.log('[PAYROLL] StealthPay fee collected:', feeResult.txSignature);
      }

      const successCount = employeeResults.filter(r => r.success).length;
      const failCount = employeeResults.filter(r => !r.success).length;

      toast({
        title: 'Payroll complete',
        description: `${successCount} payments successful${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });

      await fetchBalance();

      return employeeResults;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payroll failed';
      setError(message);
      toast({
        title: 'Payroll failed',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, signMessage, fetchBalance]);

  return {
    // State
    isLoading,
    error,
    balance,
    isConnected: connected && !!publicKey,

    // Actions
    deposit,
    withdraw,
    transfer,
    runPayroll,
    fetchBalance,

    // Utilities
    toSmallestUnit,
    fromSmallestUnit,
    supportedTokens: SUPPORTED_TOKENS,
    tokenInfo: TOKEN_INFO,
  };
}
