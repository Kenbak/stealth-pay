"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { Lock, Calendar, CheckCircle2, Loader2, ExternalLink, AlertCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WalletProvider } from "@/components/wallet-provider";
import { Providers } from "@/components/providers";
import { calculateInvoiceFees, FEES } from "@/lib/fees";
import { useShadowWire, MINIMUM_DEPOSIT } from "@/hooks/use-shadowwire";
import { TOKENS } from "@/lib/utils";

interface InvoiceData {
  publicId: string;
  amount: number;
  tokenMint: string;
  description: string;
  dueDate: string | null;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";
  recipientWallet: string;
  organization: {
    name: string;
  };
}

function PayInvoiceContent({ publicId }: { publicId: string }) {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { deposit, transfer, balance, isLoading: shadowWireLoading, fetchBalance } = useShadowWire();

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"idle" | "checking" | "depositing" | "transferring" | "confirming">("idle");
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Fetch wallet USDC balance when connected
  useEffect(() => {
    async function checkWalletBalance() {
      if (!publicKey || !connection) return;
      try {
        const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
        const ata = await getAssociatedTokenAddress(usdcMint, publicKey);
        const account = await getAccount(connection, ata);
        setWalletBalance(Number(account.amount) / 1e6); // USDC has 6 decimals
      } catch {
        setWalletBalance(0);
      }
    }
    if (connected) {
      checkWalletBalance();
      fetchBalance(); // Also fetch ShadowWire pool balance
    }
  }, [publicKey, connected, connection, fetchBalance]);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/invoices/${publicId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Invoice not found");
          } else {
            setError("Failed to load invoice");
          }
          return;
        }
        const data = await res.json();
        setInvoice(data.invoice);
      } catch {
        setError("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [publicId]);

  const handlePay = async () => {
    if (!invoice || !publicKey) return;

    setPaying(true);
    setError(null);

    try {
      const fees = calculateInvoiceFees(invoice.amount);
      const amountNeeded = fees.totalClientPays;

      // Step 1: Check current pool balance
      setPaymentStep("checking");
      await fetchBalance();

      const poolUsdc = balance.usdc;
      console.log("[PAY] Pool balance:", poolUsdc, "Amount needed:", amountNeeded);

      // Step 2: If pool balance is insufficient, deposit first
      if (poolUsdc < amountNeeded) {
        const amountToDeposit = amountNeeded - poolUsdc;
        // Add buffer for ShadowWire minimum and fees
        const depositAmount = Math.max(amountToDeposit + 1, MINIMUM_DEPOSIT.USDC);

        console.log("[PAY] Need to deposit:", depositAmount, "USDC");

        // Check wallet balance
        if (walletBalance < depositAmount) {
          throw new Error(
            `Insufficient USDC in wallet. You have ${walletBalance.toFixed(2)} USDC but need ${depositAmount.toFixed(2)} USDC.`
          );
        }

        setPaymentStep("depositing");
        const depositSig = await deposit(depositAmount, "USDC", true); // skipFee for invoice payments

        if (!depositSig) {
          throw new Error("Deposit failed. Please try again.");
        }

        console.log("[PAY] Deposit successful:", depositSig);

        // Wait a moment for balance to update
        await new Promise(resolve => setTimeout(resolve, 2000));
        await fetchBalance();
      }

      // Step 3: Execute private transfer
      setPaymentStep("transferring");
      console.log("[PAY] Executing transfer to:", invoice.recipientWallet, "Amount:", amountNeeded);

      const signature = await transfer(
        invoice.recipientWallet,
        amountNeeded,
        "USDC"
      );

      if (!signature) {
        throw new Error("Transfer failed. Please try again.");
      }

      console.log("[PAY] Transfer successful:", signature);

      // Step 4: Mark invoice as paid
      setPaymentStep("confirming");
      const payRes = await fetch(`/api/invoices/${publicId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // payerWallet NOT sent for privacy
          txSignature: signature,
        }),
      });

      if (!payRes.ok) {
        const errorData = await payRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to record payment");
      }

      setTxSignature(signature);
      setInvoice((prev) => prev ? { ...prev, status: "PAID" } : null);
    } catch (err) {
      console.error("[PAY] Error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
      setPaymentStep("idle");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full p-8 text-center glass-card">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Invoice Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!invoice) return null;

  const fees = calculateInvoiceFees(invoice.amount);
  const token = Object.values(TOKENS).find((t) => t.mint === invoice.tokenMint) || TOKENS.USDC;
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="orb orb-amber w-[400px] h-[400px] top-[-100px] right-[-100px]" />
        <div className="orb orb-cyan w-[300px] h-[300px] bottom-[-100px] left-[-100px]" style={{ animationDelay: "-5s" }} />
      </div>
      <div className="fixed inset-0 -z-10 noise" />

      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="StealthPay" width={36} height={36} />
            <span className="text-lg font-display font-bold">StealthPay</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Private Payment</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-lg">
        {/* Success State */}
        {invoice.status === "PAID" && txSignature && (
          <Card className="glass-card p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-500" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">Payment Complete!</h1>
            <p className="text-muted-foreground mb-6">
              Your private payment has been sent successfully.
            </p>
            {txSignature !== "success" && (
              <a
                href={`https://orbmarkets.io/tx/${txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 text-sm"
              >
                View on Solscan <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </Card>
        )}

        {/* Already Paid State */}
        {invoice.status === "PAID" && !txSignature && (
          <Card className="glass-card p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-500" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">Invoice Already Paid</h1>
            <p className="text-muted-foreground">
              This invoice has already been paid.
            </p>
          </Card>
        )}

        {/* Cancelled State */}
        {invoice.status === "CANCELLED" && (
          <Card className="glass-card p-8 text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">Invoice Cancelled</h1>
            <p className="text-muted-foreground">
              This invoice has been cancelled by the recipient.
            </p>
          </Card>
        )}

        {/* Pending Invoice */}
        {invoice.status === "PENDING" && (
          <Card className="glass-card overflow-hidden">
            {/* Invoice Header */}
            <div className="p-6 border-b border-white/10">
              <div className="text-sm text-muted-foreground mb-1">Invoice from</div>
              <div className="text-xl font-display font-semibold">{invoice.organization.name}</div>
            </div>

            {/* Amount */}
            <div className="p-8 text-center border-b border-white/10 bg-gradient-to-br from-amber-500/5 to-transparent">
              <div className="text-sm text-muted-foreground mb-2">Amount Due</div>
              <div className="text-5xl font-display font-bold text-gradient-vibrant mb-2">
                {invoice.amount.toLocaleString()} {token.symbol}
              </div>
              <div className="text-sm text-muted-foreground">
                {invoice.description}
              </div>
            </div>

            {/* Due Date */}
            {invoice.dueDate && (
              <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Due Date</div>
                  <div className={`font-medium ${isOverdue ? "text-red-500" : ""}`}>
                    {new Date(invoice.dueDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {isOverdue && (
                      <span className="ml-2 text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded">
                        Overdue
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Fee Breakdown */}
            <div className="px-6 py-4 border-b border-white/10 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Invoice Amount</span>
                <span>{invoice.amount.toLocaleString()} {token.symbol}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Platform Fee ({FEES.INVOICE.STEALTH_RATE * 100}%)</span>
                <span>{fees.stealthFee.toLocaleString()} {token.symbol}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Privacy Fee ({FEES.INVOICE.SHADOWWIRE_RATE * 100}%)</span>
                <span>{fees.shadowwireFee.toLocaleString()} {token.symbol}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-white/5">
                <span>You Pay</span>
                <span className="text-amber-500">{fees.totalClientPays.toLocaleString()} {token.symbol}</span>
              </div>
            </div>

            {/* Action */}
            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {error}
                </div>
              )}

              {/* Wallet balance indicator */}
              {connected && (
                <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wallet className="w-4 h-4" />
                    <span>Your Wallet</span>
                  </div>
                  <span className={walletBalance >= fees.totalClientPays ? "text-teal-500" : "text-red-500"}>
                    {walletBalance.toFixed(2)} USDC
                  </span>
                </div>
              )}

              {!connected ? (
                <Button
                  onClick={() => setVisible(true)}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-semibold py-6 text-lg"
                >
                  Connect Wallet to Pay
                </Button>
              ) : (
                <Button
                  onClick={handlePay}
                  disabled={paying || shadowWireLoading || walletBalance < fees.totalClientPays}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-semibold py-6 text-lg disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      {paymentStep === "checking" && "Checking balance..."}
                      {paymentStep === "depositing" && "Depositing to privacy pool..."}
                      {paymentStep === "transferring" && "Sending private payment..."}
                      {paymentStep === "confirming" && "Confirming..."}
                      {paymentStep === "idle" && "Processing..."}
                    </>
                  ) : walletBalance < fees.totalClientPays ? (
                    <>Insufficient USDC</>
                  ) : (
                    <>Pay {fees.totalClientPays.toLocaleString()} {token.symbol}</>
                  )}
                </Button>
              )}

              <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-2">
                <Lock className="w-3 h-3" />
                Your payment will be private via zero-knowledge proofs
              </p>
            </div>
          </Card>
        )}

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Powered by <span className="text-amber-500">ShadowWire</span> ZK Infrastructure</p>
        </div>
      </main>
    </div>
  );
}

export default function PayInvoicePage({ params }: { params: Promise<{ publicId: string }> }) {
  const resolvedParams = use(params);

  return (
    <Providers>
      <WalletProvider>
        <PayInvoiceContent publicId={resolvedParams.publicId} />
      </WalletProvider>
    </Providers>
  );
}
