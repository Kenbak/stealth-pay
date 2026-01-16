"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useShadowWire } from "./use-shadowwire";
import { useToast } from "@/components/ui/use-toast";
import { TokenSymbol } from "@radr/shadowwire";

interface PreparedPayment {
  paymentId: string;
  employeeId: string;
  employeeName: string;
  stealthPayWallet: string;
  amount: number;
}

interface PrepareResponse {
  payrollId: string;
  status: string;
  tokenMint: string;
  totalAmount: number;
  payments: PreparedPayment[];
}

interface PaymentResult {
  paymentId: string;
  signature?: string;
  success: boolean;
  error?: string;
}

interface ExecutionState {
  step: "idle" | "preparing" | "signing" | "submitting" | "finalizing" | "completed" | "failed";
  message: string;
  progress?: number;
}

export function usePayrollExecution() {
  const { publicKey, signMessage } = useWallet();
  const { runPayroll } = useShadowWire();
  const { toast } = useToast();

  const [state, setState] = useState<ExecutionState>({
    step: "idle",
    message: "",
  });
  const [isExecuting, setIsExecuting] = useState(false);

  /**
   * Get auth headers with JWT token
   */
  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth-token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  /**
   * Execute a payroll - full flow
   * 1. Prepare (get decrypted payment data from server)
   * 2. Execute via ShadowWire SDK (client-side with wallet signature)
   * 3. Finalize (record signatures on server)
   */
  const execute = useCallback(async (payrollId: string): Promise<boolean> => {
    if (!publicKey || !signMessage) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return false;
    }

    setIsExecuting(true);

    try {
      // Step 1: Prepare - Get decrypted payment data
      setState({ step: "preparing", message: "Preparing payroll data..." });

      const prepareResponse = await fetch(`/api/payrolls/${payrollId}/prepare`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!prepareResponse.ok) {
        const error = await prepareResponse.json();
        throw new Error(error.error || "Failed to prepare payroll");
      }

      const preparedData: PrepareResponse = await prepareResponse.json();

      if (preparedData.payments.length === 0) {
        toast({
          title: "No payments to process",
          description: "This payroll has no payments",
          variant: "destructive",
        });
        return false;
      }

      // Step 2: Execute via ShadowWire SDK
      setState({
        step: "signing",
        message: `Preparing ${preparedData.payments.length} private payments...`,
      });

      // Determine token from mint address
      // USDC mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
      // SOL is native, represented by "So11111111111111111111111111111111111111112" or empty
      const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
      const token: TokenSymbol = preparedData.tokenMint === USDC_MINT ? "USDC" : "SOL";

      console.log("[PAYROLL] Token detection:", {
        tokenMint: preparedData.tokenMint,
        detectedToken: token,
        payments: preparedData.payments.map(p => ({ recipient: p.stealthPayWallet.slice(0, 8) + "...", amount: p.amount })),
      });

      // Map to ShadowWire SDK format
      const shadowWirePayments = preparedData.payments.map((p) => ({
        recipient: p.stealthPayWallet,
        amount: p.amount,
        token,
      }));

      toast({
        title: "Please sign the authentication message",
        description: `You will authenticate ${preparedData.payments.length} private payments`,
      });

      setState({
        step: "submitting",
        message: "Sign the message in your wallet to authorize payments...",
        progress: 0,
      });

      // Execute payroll with progress tracking
      const executionResults = await runPayroll(
        shadowWirePayments,
        (completed, total, recipient) => {
          setState({
            step: "submitting",
            message: `Processing payment ${completed + 1}/${total}...`,
            progress: Math.round(((completed + 1) / total) * 100),
          });
        }
      );

      if (!executionResults) {
        throw new Error("Payroll execution failed");
      }

      // Step 3: Finalize - Record results on server
      setState({ step: "finalizing", message: "Recording results..." });

      // Map results to payment IDs
      const results: PaymentResult[] = preparedData.payments.map((payment, index) => ({
        paymentId: payment.paymentId,
        signature: executionResults[index]?.txSignature,
        success: executionResults[index]?.success ?? false,
        error: executionResults[index]?.error,
      }));

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      const finalizeResponse = await fetch(`/api/payrolls/${payrollId}/finalize`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ results }),
      });

      if (!finalizeResponse.ok) {
        console.error("Failed to finalize:", await finalizeResponse.text());
        // Don't throw - payments were already sent
      }

      // Success!
      if (failCount === 0) {
        setState({
          step: "completed",
          message: `${successCount} payments sent privately!`,
        });

        toast({
          title: "🎉 Payroll executed!",
          description: `${successCount} employees paid privately via ShadowWire`,
        });

        return true;
      } else {
        setState({
          step: "completed",
          message: `${successCount}/${preparedData.payments.length} payments succeeded`,
        });

        toast({
          title: "⚠️ Partial success",
          description: `${successCount} succeeded, ${failCount} failed`,
          variant: "destructive",
        });

        return false;
      }

    } catch (error) {
      console.error("Payroll execution error:", error);

      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      setState({
        step: "failed",
        message: errorMessage,
      });

      toast({
        title: "Payroll execution failed",
        description: errorMessage,
        variant: "destructive",
      });

      // Try to reset payroll status
      try {
        await fetch(`/api/payrolls/${payrollId}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: "FAILED" }),
        });
      } catch {
        // Ignore
      }

      return false;

    } finally {
      setIsExecuting(false);
    }
  }, [publicKey, signMessage, runPayroll, toast]);

  const reset = useCallback(() => {
    setState({ step: "idle", message: "" });
  }, []);

  return {
    execute,
    reset,
    state,
    isExecuting,
  };
}

export default usePayrollExecution;
