/**
 * Jupiter Swap Hook
 *
 * React hook for swapping tokens via Jupiter before depositing to ShadowWire.
 */

import { useState, useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { toast } from "@/components/ui/use-toast";
import {
  getSOLtoUSDCQuote,
  getSwapTransaction,
  decodeSwapTransaction,
  JupiterQuote,
  TOKEN_MINTS,
} from "@/lib/jupiter";

interface SwapQuote {
  quote: JupiterQuote | null;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  rate: number;
}

export function useJupiterSwap() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<SwapQuote | null>(null);

  /**
   * Get a quote for SOL → USDC swap
   */
  const getQuote = useCallback(async (solAmount: number): Promise<SwapQuote | null> => {
    if (!solAmount || solAmount <= 0) {
      setCurrentQuote(null);
      return null;
    }

    setIsLoadingQuote(true);
    try {
      const result = await getSOLtoUSDCQuote(solAmount);

      const quote: SwapQuote = {
        quote: result.quote,
        inputAmount: solAmount,
        outputAmount: result.usdcAmount,
        priceImpact: result.priceImpact,
        rate: result.rate,
      };

      setCurrentQuote(quote);
      return quote;
    } catch (error) {
      console.error("Failed to get swap quote:", error);
      setCurrentQuote(null);
      return null;
    } finally {
      setIsLoadingQuote(false);
    }
  }, []);

  /**
   * Execute the swap: SOL → USDC
   */
  const executeSwap = useCallback(async (quote: SwapQuote): Promise<{
    success: boolean;
    signature?: string;
    usdcAmount: number;
  }> => {
    if (!publicKey || !signTransaction || !quote.quote) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to swap.",
        variant: "destructive",
      });
      return { success: false, usdcAmount: 0 };
    }

    setIsSwapping(true);
    try {
      // Get the swap transaction from Jupiter
      const swapTxBase64 = await getSwapTransaction({
        quote: quote.quote,
        userPublicKey: publicKey.toString(),
        wrapAndUnwrapSol: true,
      });

      if (!swapTxBase64) {
        throw new Error("Failed to get swap transaction from Jupiter");
      }

      // Decode and sign the transaction
      const transaction = decodeSwapTransaction(swapTxBase64);

      // Sign the transaction
      const signedTx = await signTransaction(transaction as any);

      // Get recent blockhash for confirmation
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

      // Send the transaction with better options
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });

      toast({
        title: "Transaction sent",
        description: "Waiting for confirmation...",
      });

      // Wait for confirmation with blockhash strategy (more reliable)
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      toast({
        title: "Swap Successful! 🎉",
        description: `Swapped ${quote.inputAmount.toFixed(4)} SOL → ${quote.outputAmount.toFixed(2)} USDC`,
      });

      return {
        success: true,
        signature,
        usdcAmount: quote.outputAmount,
      };
    } catch (error: any) {
      console.error("Swap failed:", error);

      // Check if it's a timeout error - transaction might have succeeded
      if (error.name === "TransactionExpiredTimeoutError") {
        toast({
          title: "Transaction may have succeeded",
          description: "Check your wallet balance. The confirmation timed out but the transaction may have gone through.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Swap Failed",
          description: error.message || "An error occurred during the swap",
          variant: "destructive",
        });
      }
      return { success: false, usdcAmount: 0 };
    } finally {
      setIsSwapping(false);
    }
  }, [publicKey, signTransaction, connection]);

  /**
   * Combined: Get quote and swap in one call
   */
  const swapSOLtoUSDC = useCallback(async (solAmount: number): Promise<{
    success: boolean;
    signature?: string;
    usdcAmount: number;
  }> => {
    const quote = await getQuote(solAmount);
    if (!quote || !quote.quote) {
      toast({
        title: "Failed to get quote",
        description: "Could not get a swap quote from Jupiter",
        variant: "destructive",
      });
      return { success: false, usdcAmount: 0 };
    }

    // Warn if price impact is high
    if (quote.priceImpact > 1) {
      const confirmed = window.confirm(
        `Warning: This swap has a price impact of ${quote.priceImpact.toFixed(2)}%. Continue?`
      );
      if (!confirmed) {
        return { success: false, usdcAmount: 0 };
      }
    }

    return executeSwap(quote);
  }, [getQuote, executeSwap]);

  return {
    // State
    isLoadingQuote,
    isSwapping,
    currentQuote,
    isLoading: isLoadingQuote || isSwapping,

    // Actions
    getQuote,
    executeSwap,
    swapSOLtoUSDC,
  };
}
