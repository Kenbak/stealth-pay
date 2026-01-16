"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useRequireOrganization } from "@/hooks/use-require-organization";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  AlertCircle,
  Shield,
  CheckCircle2,
  ArrowRight,
  Info,
  RefreshCw,
  Zap,
  ExternalLink,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { isHeliusConfigured } from "@/lib/helius";
import { useEmployees } from "@/hooks/use-employees";
import { usePrices } from "@/hooks/use-prices";
import { useShadowWire } from "@/hooks/use-shadowwire";
import { useJupiterSwap } from "@/hooks/use-jupiter";
import { formatCurrency } from "@/lib/utils";
import { calculateFee } from "@/lib/fees";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useToast } from "@/components/ui/use-toast";
import { SolanaIcon, USDCIcon } from "@/components/icons/token-icons";

// Get network from env
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
const isMainnet = NETWORK === "mainnet-beta";

export default function TreasuryPage() {
  // Redirect to /dashboard if no organization
  const { isLoading: orgLoading, hasOrganization } = useRequireOrganization();

  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { totalSalary, activeEmployees } = useEmployees();
  const { toast } = useToast();
  const { prices, getPrice, toUsd, isLoading: pricesLoading } = usePrices();
  const {
    deposit: shadowWireDeposit,
    withdraw: shadowWireWithdraw,
    balance: poolBalance,
    fetchBalance: fetchPoolBalance,
    isLoading: isShadowWireLoading
  } = useShadowWire();

  // Jupiter swap hook for SOL → USDC conversion
  const {
    getQuote,
    executeSwap,
    currentQuote,
    isLoadingQuote,
    isSwapping,
  } = useJupiterSwap();

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState<"usdc" | "sol">("usdc");
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // Minimum amounts
  const MIN_DEPOSIT_USDC = 6;
  const MIN_DEPOSIT_SOL = 0.05;
  const MIN_WITHDRAW = 6;

  // Treasury is always USDC (simplified UX)
  const treasuryBalance = poolBalance.usdc;

  // Fetch on-chain transaction history via Helius
  const { data: onchainData, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["treasury-history", publicKey?.toBase58()],
    queryFn: async () => {
      const token = localStorage.getItem("auth-token");
      if (!token) return { transactions: [] };

      const res = await fetch("/api/treasury/history?limit=30", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { transactions: [] };
      return res.json();
    },
    enabled: connected && isHeliusConfigured(),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  const onchainTransactions = onchainData?.transactions || [];

  // Get SOL price for swap calculations
  const solPrice = getPrice("SOL");

  // Calculate amounts based on deposit method
  const inputAmount = parseFloat(depositAmount) || 0;

  // If depositing SOL, use swap quote; if USDC, use direct amount
  const usdcAmount = depositMethod === "sol" && currentQuote
    ? currentQuote.outputAmount
    : inputAmount;

  // Calculate fees (always on final USDC amount)
  const { fee, netAmount, feePercentage } = calculateFee(usdcAmount);

  // Fetch wallet balances (SOL + USDC)
  const fetchBalance = async () => {
    if (!publicKey) return;

    setIsLoadingBalance(true);
    try {
      // Get native SOL balance
      const solBal = await connection.getBalance(publicKey);
      setSolBalance(solBal / LAMPORTS_PER_SOL);

      // Get USDC balance from wallet
      try {
        const { getAssociatedTokenAddress } = await import("@solana/spl-token");
        const { PublicKey } = await import("@solana/web3.js");

        const USDC_MINT = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
          ? new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
          : new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

        const ata = await getAssociatedTokenAddress(USDC_MINT, publicKey);
        const tokenBalance = await connection.getTokenAccountBalance(ata);
        setUsdcBalance(parseFloat(tokenBalance.value.uiAmountString || "0"));
      } catch {
        // No USDC account or zero balance
        setUsdcBalance(0);
      }

      // Fetch treasury balances
      await fetchPoolBalance();
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Fetch balance when connected
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    }
  }, [connected, publicKey]);

  const handleDeposit = async () => {
    if (!depositAmount || inputAmount <= 0) return;

    // If depositing SOL, swap to USDC first
    if (depositMethod === "sol" && currentQuote) {
      try {
        // 1. Execute swap SOL → USDC
        const swapResult = await executeSwap(currentQuote);

        if (!swapResult.success) {
          return; // Error toast is shown by the hook
        }

        // 2. Deposit USDC to treasury
        const signature = await shadowWireDeposit(swapResult.usdcAmount, "USDC");

        if (signature) {
          toast({
            title: "Deposit Complete! 🎉",
            description: `Swapped ${inputAmount} SOL → ${swapResult.usdcAmount.toFixed(2)} USDC and deposited to treasury`,
          });
          setDepositAmount("");
          fetchBalance();
        }
      } catch (error: any) {
        toast({
          title: "Deposit Failed",
          description: error.message || "An error occurred",
          variant: "destructive",
        });
      }
      return;
    }

    // Direct USDC deposit to treasury
    const signature = await shadowWireDeposit(inputAmount, "USDC");

    if (signature) {
      setDepositAmount("");
      fetchBalance();
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;

    // Execute USDC withdrawal from treasury
    const signature = await shadowWireWithdraw(parseFloat(withdrawAmount), "USDC");

    if (signature) {
      setWithdrawAmount("");
      fetchBalance();
    }
  };

  // Check if deposit covers payroll
  const coversPayroll = netAmount >= totalSalary;
  const monthsCovered = totalSalary > 0 ? Math.floor(netAmount / totalSalary) : 0;

  // Get Jupiter quote when SOL is selected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputAmount > 0 && depositMethod === "sol") {
        getQuote(inputAmount);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [inputAmount, depositMethod, getQuote]);

  // Swap info
  const swapRate = currentQuote?.rate || solPrice;

  // Show loading while checking org
  if (orgLoading || !hasOrganization) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Treasury</h1>
          <p className="text-muted-foreground">
            Manage your payroll funds
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchBalance}
          disabled={isLoadingBalance}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Wallet Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wallet Balance
            </CardTitle>
            <Badge variant={isMainnet ? "default" : "secondary"}>
              {isMainnet ? "Mainnet" : "Devnet"}
            </Badge>
          </CardHeader>
          <CardContent>
            {isLoadingBalance ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : solBalance !== null ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SolanaIcon size={18} />
                    <span className="text-muted-foreground text-sm">SOL</span>
                  </div>
                  <span className="font-bold">{solBalance.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <USDCIcon size={18} />
                    <span className="text-muted-foreground text-sm">USDC</span>
                  </div>
                  <span className="font-bold">{(usdcBalance || 0).toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Click Refresh to load</span>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 !bg-amber-500/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Treasury Balance
            </CardTitle>
            <Shield className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoadingBalance ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {treasuryBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready for private payroll
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Payroll Need
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalSalary)}
            </div>
            <p className="text-xs text-muted-foreground">
              for {activeEmployees.length} active employees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deposit / Withdraw + History Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
      {/* Deposit / Withdraw Tabs */}
      <Card>
        <CardHeader className="pb-4">
          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("deposit")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "deposit"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Deposit
            </button>
            <button
              onClick={() => setActiveTab("withdraw")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "withdraw"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Withdraw
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {activeTab === "deposit" ? (
            <>
              {/* How it works */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      How Private Deposits Work
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Funds are deposited into your treasury. When you run
                      payroll, payments are made privately using zero-knowledge proofs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Deposit Method Toggle */}
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setDepositMethod("usdc")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    depositMethod === "usdc"
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <USDCIcon size={16} />
                  USDC
                </button>
                <button
                  onClick={() => setDepositMethod("sol")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    depositMethod === "sol"
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <SolanaIcon size={16} />
                  SOL → USDC
                </button>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount">
                    {depositMethod === "sol" ? "SOL Amount" : "USDC Amount"}
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    Available: {depositMethod === "sol"
                      ? `${(solBalance || 0).toFixed(4)} SOL`
                      : `${(usdcBalance || 0).toFixed(2)} USDC`}
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="pr-24 text-lg"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        const maxAmount = depositMethod === "sol"
                          ? Math.max(0, (solBalance || 0) - 0.01)
                          : (usdcBalance || 0);
                        setDepositAmount(maxAmount.toString());
                      }}
                      className="text-xs text-amber-500 hover:text-amber-600 font-medium"
                    >
                      MAX
                    </button>
                    <span className="text-sm text-muted-foreground">
                      {depositMethod === "sol" ? "SOL" : "USDC"}
                    </span>
                  </div>
                </div>
                {/* Minimum deposit warning */}
                {inputAmount > 0 && inputAmount < (depositMethod === "sol" ? MIN_DEPOSIT_SOL : MIN_DEPOSIT_USDC) && (
                  <p className="text-sm text-orange-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Minimum: {depositMethod === "sol" ? `${MIN_DEPOSIT_SOL} SOL` : `${MIN_DEPOSIT_USDC} USDC`}
                  </p>
                )}
              </div>

          {/* Swap Quote Display (when SOL selected) */}
          {depositMethod === "sol" && inputAmount > 0 && (
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-purple-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-purple-600 dark:text-purple-400">
                    Jupiter Swap Preview
                  </p>

                  <div className="mt-3 p-3 bg-background/50 rounded-md">
                    {isLoadingQuote ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Getting best price...
                      </div>
                    ) : currentQuote ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Rate</span>
                          <span className="font-mono">
                            1 SOL = {swapRate.toFixed(2)} USDC
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">You'll receive</span>
                          <span className="font-bold text-purple-500">
                            ~{usdcAmount.toFixed(2)} USDC
                          </span>
                        </div>
                        {currentQuote.priceImpact > 0.5 && (
                          <div className="flex items-center gap-1 text-xs text-orange-500">
                            <AlertCircle className="h-3 w-3" />
                            Price impact: {currentQuote.priceImpact.toFixed(2)}%
                          </div>
                        )}
                        <button
                          onClick={() => getQuote(inputAmount)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Refresh quote
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-orange-500">
                        Could not get quote. Try again.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDepositAmount(totalSalary.toString())}
              disabled={totalSalary === 0}
            >
              1 Month ({formatCurrency(totalSalary)})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDepositAmount((totalSalary * 3).toString())}
              disabled={totalSalary === 0}
            >
              3 Months ({formatCurrency(totalSalary * 3)})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDepositAmount((totalSalary * 6).toString())}
              disabled={totalSalary === 0}
            >
              6 Months ({formatCurrency(totalSalary * 6)})
            </Button>
          </div>

          {/* Fee Breakdown - Only show when amount > 0 */}
          {inputAmount > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-muted-foreground" />
                Deposit Summary
              </div>

              <div className="space-y-2">
                {/* Input Amount */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">You deposit</span>
                  <span className="font-medium">
                    {inputAmount} {depositMethod === "sol" ? "SOL" : "USDC"}
                  </span>
                </div>

                {/* Swap Arrow (if SOL) */}
                {depositMethod === "sol" && currentQuote && (
                  <>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      <span>Jupiter Swap (1 SOL = {swapRate.toFixed(2)} USDC)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">After swap</span>
                      <span className="font-medium text-purple-500">
                        {usdcAmount.toFixed(2)} USDC
                      </span>
                    </div>
                  </>
                )}

                {/* Fee */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    StealthPay fee ({feePercentage}%)
                  </span>
                  <span className="text-orange-500">-${fee.toFixed(2)}</span>
                </div>

                <div className="border-t my-2" />

                {/* Net Amount */}
                <div className="flex justify-between items-baseline">
                  <span className="font-medium">Available for payroll</span>
                  <span className="text-xl font-bold text-amber-500">
                    {netAmount.toFixed(2)} USDC
                  </span>
                </div>

                {/* Coverage indicator */}
                {totalSalary > 0 && (
                  <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                    coversPayroll
                      ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                      : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  }`}>
                    {coversPayroll ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Covers {monthsCovered} month(s) of payroll
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        Need ${(totalSalary - netAmount).toFixed(2)} more to cover 1 month
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deposit Flow Visualization */}
          {inputAmount > 0 && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
                <span className="mt-1">Your Wallet</span>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground/50" />

              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-amber-500" />
                </div>
                <span className="mt-1">Privacy Pool</span>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground/50" />

              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  🔒
                </div>
                <span className="mt-1">Private Payroll</span>
              </div>
            </div>
          )}

              {/* Deposit Button */}
              <Button
                onClick={handleDeposit}
                disabled={
                  !depositAmount ||
                  inputAmount <= 0 ||
                  inputAmount < (depositMethod === "sol" ? MIN_DEPOSIT_SOL : MIN_DEPOSIT_USDC) ||
                  isShadowWireLoading ||
                  isSwapping ||
                  (depositMethod === "sol" && (!currentQuote || isLoadingQuote))
                }
                className={`w-full ${depositMethod === "sol" ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" : ""}`}
                size="lg"
              >
                {isShadowWireLoading || isSwapping ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isSwapping ? "Swapping..." : "Depositing..."}
                  </>
                ) : depositMethod === "sol" ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Swap & Deposit {inputAmount > 0 ? `${inputAmount} SOL` : ""}
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="h-4 w-4 mr-2" />
                    Deposit {inputAmount > 0 ? `${inputAmount} USDC` : ""}
                  </>
                )}
              </Button>

              {/* Fee explanation */}
              <p className="text-xs text-muted-foreground text-center">
                {feePercentage}% fee • Min: {depositMethod === "sol" ? `${MIN_DEPOSIT_SOL} SOL` : `${MIN_DEPOSIT_USDC} USDC`}
              </p>
            </>
          ) : (
            /* WITHDRAW TAB */
            <>
              {/* Available Balance */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-500" />
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      Available in Treasury
                    </span>
                  </div>
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {treasuryBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
                  </span>
                </div>
              </div>

              {/* Withdraw Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="withdrawAmount">Withdraw Amount</Label>
                </div>
                <div className="relative">
                  <Input
                    id="withdrawAmount"
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    max={treasuryBalance}
                    className="pr-24 text-lg"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => setWithdrawAmount(treasuryBalance.toString())}
                      className="text-xs text-amber-500 hover:text-amber-600 font-medium"
                    >
                      MAX
                    </button>
                    <span className="text-sm text-muted-foreground">USDC</span>
                  </div>
                </div>
                {/* Minimum withdraw warning */}
                {parseFloat(withdrawAmount) > 0 && parseFloat(withdrawAmount) < MIN_WITHDRAW && (
                  <p className="text-sm text-orange-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Minimum withdraw: {MIN_WITHDRAW} USDC
                  </p>
                )}
                {parseFloat(withdrawAmount) > treasuryBalance && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Insufficient balance
                  </p>
                )}
              </div>

              {/* Withdraw Flow Visualization */}
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-amber-500" />
                </div>
                <span className="mt-1">Treasury</span>
              </div>

                <ArrowRight className="h-5 w-5 text-muted-foreground/50" />

                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <span className="mt-1">Your Wallet</span>
                </div>
              </div>

              {/* Withdraw Button */}
              <Button
                onClick={handleWithdraw}
                disabled={
                  !withdrawAmount ||
                  parseFloat(withdrawAmount) <= 0 ||
                  parseFloat(withdrawAmount) < MIN_WITHDRAW ||
                  parseFloat(withdrawAmount) > treasuryBalance ||
                  isShadowWireLoading
                }
                variant="outline"
                className="w-full"
                size="lg"
              >
                {isShadowWireLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Withdrawing...
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine className="h-4 w-4 mr-2" />
                    Withdraw {withdrawAmount ? `${withdrawAmount} USDC` : ""}
                  </>
                )}
              </Button>

              {/* Fee explanation */}
              <p className="text-xs text-muted-foreground text-center">
                Minimum withdraw: {MIN_WITHDRAW} USDC
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                History
              </CardTitle>
              <CardDescription>Recent transactions</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchHistory()}
              disabled={isLoadingHistory}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(
            /* ON-CHAIN HISTORY - From Helius */
            (() => {
              // USDC mint addresses
              const USDC_MINTS = [
                "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Mainnet
                "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // Devnet
              ];

              const walletAddr = publicKey?.toBase58() || "";

              // Filter to only show Treasury Deposits (UNKNOWN type with outgoing USDC)
              // These are the ShadowWire escrow deposits
              const usdcTransactions = onchainTransactions.filter((tx: {
                type: string;
                transfers: {
                  token: Array<{ mint: string; from: string; amount: number }>;
                };
              }) => {
                // Must have USDC transfers
                const hasUsdc = tx.transfers?.token?.some(t => USDC_MINTS.includes(t.mint));
                if (!hasUsdc) return false;

                // Must be UNKNOWN type (ShadowWire deposits show as UNKNOWN)
                // and have outgoing USDC from our wallet
                const isDeposit = tx.type === "UNKNOWN" &&
                  tx.transfers?.token?.some(t =>
                    USDC_MINTS.includes(t.mint) &&
                    t.from === walletAddr &&
                    t.amount > 1 // Filter out small amounts (fees)
                  );

                return isDeposit;
              });

              if (isLoadingHistory) {
                return (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                    <span className="ml-2 text-muted-foreground">Loading deposits...</span>
                  </div>
                );
              }

              if (usdcTransactions.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No deposits found</p>
                    <p className="text-sm">Treasury deposits will appear here</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {usdcTransactions.map((tx: {
                    signature: string;
                    timestamp: number;
                    type: string;
                    transfers: {
                      token: Array<{ from: string; to: string; amount: number; mint: string }>;
                    };
                  }) => {
                    // Find the main USDC transfer (the deposit amount)
                    const usdcTransfer = tx.transfers.token.find(t =>
                      USDC_MINTS.includes(t.mint) &&
                      t.from === walletAddr &&
                      t.amount > 1
                    );

                    const depositAmount = usdcTransfer?.amount || 0;

                    return (
                      <div
                        key={tx.signature}
                        className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 hover:bg-amber-500/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-500">
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              Deposit
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Funded privacy pool
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tx.timestamp ? formatDistanceToNow(new Date(tx.timestamp * 1000), { addSuffix: true }) : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium text-amber-500">
                              {depositAmount.toFixed(2)} USDC
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tx.signature.slice(0, 8)}...
                            </p>
                          </div>
                          <a
                            href={`https://orbmarkets.io/tx/${tx.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-500 hover:text-amber-600"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })}

                  {/* Helius attribution */}
                  <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3 text-amber-500" />
                    Powered by Helius
                  </div>
                </div>
              );
            })()
          )}
        </CardContent>
      </Card>
      </div>

      {/* Devnet Notice - only show on devnet */}
      {!isMainnet && (
        <Card className="border-dashed border-amber-500/30 !bg-amber-500/[0.02]">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Info className="h-5 w-5 flex-shrink-0 text-orange-500" />
              <div>
                <p>
                  <strong className="text-amber-600 dark:text-amber-400">Devnet Mode:</strong> Get free test tokens from{" "}
                  <a
                    href="https://spl-token-faucet.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-500 hover:underline"
                  >
                    SPL Token Faucet
                  </a>
                  {" "}or{" "}
                  <a
                    href="https://faucet.solana.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-500 hover:underline"
                  >
                    Solana Faucet
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
