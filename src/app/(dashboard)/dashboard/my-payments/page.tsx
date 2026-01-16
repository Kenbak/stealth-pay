"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Wallet,
  ArrowUpRight,
  Copy,
  Check,
  Lock,
  Building2,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  History,
  ArrowDownRight,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserRoles } from "@/hooks/use-user-roles";
import { truncateAddress, formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { createDerivationMessage } from "@/lib/stealth-wallet";
import { useToast } from "@/components/ui/use-toast";
import {
  downloadEmployeePaymentsCSV,
  downloadEmployeeWithdrawalsCSV,
  downloadEmployeeIncomeReportJSON,
  type EmployeePaymentExport,
  type EmployeeWithdrawalExport,
} from "@/lib/export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WalletBalance {
  usdc: number;
  loading: boolean;
}

export default function MyPaymentsPage() {
  const { publicKey, signMessage } = useWallet();
  const { isEmployee, employments, isLoading, refetch } = useUserRoles();
  const { toast } = useToast();

  const [copied, setCopied] = useState<string | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedEmployment, setSelectedEmployment] = useState<typeof employments[0] | null>(null);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<"input" | "signing" | "processing" | "success" | "error">("input");
  const [withdrawResult, setWithdrawResult] = useState<{ signature?: string; amount?: number; error?: string } | null>(null);
  const [withdrawMode, setWithdrawMode] = useState<"private" | "public">("private");

  // Fee estimation
  const [feeEstimate, setFeeEstimate] = useState<{
    estimatedFee: number;
    estimatedReceived: number;
    feePercentage: number;
    warning?: string;
  } | null>(null);
  const [estimatingFee, setEstimatingFee] = useState(false);

  // Withdrawal history
  const [withdrawalHistory, setWithdrawalHistory] = useState<Array<{
    id: string;
    amount: number;
    feeAmount: number;
    mode: "PRIVATE" | "PUBLIC";
    status: string;
    recipient: string;
    txSignature?: string;
    organizationName: string;
    createdAt: string;
  }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Wallet balances for each employment
  const [balances, setBalances] = useState<Record<string, WalletBalance>>({});
  const [showBalances, setShowBalances] = useState(true);

  // Fetch wallet balances via API (server-side uses Helius)
  useEffect(() => {
    const fetchBalances = async () => {
      if (!employments.length) return;

      for (const emp of employments) {
        if (!emp.stealthPayWallet) continue;

        setBalances(prev => ({
          ...prev,
          [emp.id]: { ...prev[emp.id], loading: true }
        }));

        try {
          const response = await fetch(`/api/balance?wallet=${emp.stealthPayWallet}`);
          const data = await response.json();

          if (response.ok) {
            console.log("[MyPayments] Balance fetched:", data);
            setBalances(prev => ({
              ...prev,
              [emp.id]: { usdc: data.usdc || 0, loading: false }
            }));
          } else {
            console.error("[MyPayments] Balance API error:", data.error);
            setBalances(prev => ({
              ...prev,
              [emp.id]: { usdc: 0, loading: false }
            }));
          }
        } catch (error: any) {
          console.error("[MyPayments] Error fetching balance:", error?.message || error);
          setBalances(prev => ({
            ...prev,
            [emp.id]: { usdc: 0, loading: false }
          }));
        }
      }
    };

    fetchBalances();
  }, [employments]);

  // Fetch withdrawal history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!employments.length) return;
      setLoadingHistory(true);
      try {
        const token = localStorage.getItem("auth-token");
        const response = await fetch("/api/withdrawals", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();
        if (response.ok && data.withdrawals) {
          setWithdrawalHistory(data.withdrawals);
        }
      } catch (error) {
        console.error("[MyPayments] Error fetching history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [employments]);

  // Estimate fee when amount or mode changes
  useEffect(() => {
    const estimateFee = async () => {
      const balance = selectedEmployment ? balances[selectedEmployment.id]?.usdc || 0 : 0;
      const amount = withdrawAmount ? parseFloat(withdrawAmount) : balance;

      if (!amount || amount <= 0) {
        setFeeEstimate(null);
        return;
      }

      setEstimatingFee(true);
      try {
        const response = await fetch("/api/withdrawals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, mode: withdrawMode }),
        });
        const data = await response.json();
        if (response.ok) {
          setFeeEstimate(data);
        }
      } catch (error) {
        console.error("[MyPayments] Error estimating fee:", error);
      } finally {
        setEstimatingFee(false);
      }
    };

    const debounce = setTimeout(estimateFee, 300);
    return () => clearTimeout(debounce);
  }, [withdrawAmount, withdrawMode, selectedEmployment, balances]);

  const copyAddress = (address: string, id: string) => {
    navigator.clipboard.writeText(address);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const openWithdrawDialog = (employment: typeof employments[0]) => {
    setSelectedEmployment(employment);
    setWithdrawAddress(publicKey?.toBase58() || "");
    setWithdrawAmount("");
    setWithdrawStep("input");
    setWithdrawResult(null);
    setWithdrawMode("private");
    setWithdrawDialogOpen(true);
  };

  const handleWithdraw = useCallback(async () => {
    if (!selectedEmployment || !withdrawAddress || !signMessage || !publicKey) return;

    setWithdrawing(true);
    setWithdrawStep("signing");

    try {
      const derivationMessage = createDerivationMessage(
        publicKey,
        selectedEmployment.organizationId
      );

      toast({
        title: "Sign Message",
        description: "Please sign in your wallet to authorize withdrawal"
      });
      const signature = await signMessage(derivationMessage);
      const derivationSignature = Buffer.from(signature).toString("base64");

      setWithdrawStep("processing");

      if (withdrawMode === "private") {
        // Private withdrawal via Privacy Cash
        toast({ title: "Processing", description: "Privacy Cash is routing your funds privately..." });

        const token = localStorage.getItem("auth-token");
        const response = await fetch("/api/withdraw", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            derivationSignature,
            organizationId: selectedEmployment.organizationId,
            recipientAddress: withdrawAddress,
            amount: withdrawAmount ? parseFloat(withdrawAmount) : undefined,
            mode: "private",
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setWithdrawStep("success");
          setWithdrawResult({
            signature: result.signature,
            amount: result.withdrawnAmount,
          });
          toast({ title: "Success!", description: "Private withdrawal complete!" });
        } else {
          throw new Error(result.error || "Withdrawal failed");
        }
      } else {
        // Public withdrawal - direct SPL transfer
        toast({ title: "Processing", description: "Sending direct transfer..." });

        const token = localStorage.getItem("auth-token");
        const response = await fetch("/api/withdraw", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            derivationSignature,
            organizationId: selectedEmployment.organizationId,
            recipientAddress: withdrawAddress,
            amount: withdrawAmount ? parseFloat(withdrawAmount) : undefined,
            mode: "public",
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setWithdrawStep("success");
          setWithdrawResult({
            signature: result.signature,
            amount: result.withdrawnAmount,
          });
          toast({ title: "Success!", description: "Transfer complete!" });
        } else {
          throw new Error(result.error || "Transfer failed");
        }
      }

      // Refresh balances after withdrawal
      setTimeout(() => refetch(), 2000);

    } catch (err: any) {
      console.error("Withdrawal error:", err);
      setWithdrawStep("error");
      setWithdrawResult({ error: err.message || "Withdrawal failed" });
      toast({ title: "Error", description: err.message || "Withdrawal failed", variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  }, [selectedEmployment, withdrawAddress, withdrawAmount, withdrawMode, signMessage, publicKey, refetch, toast]);

  // Calculate total available balance
  const totalAvailable = Object.values(balances).reduce((sum, b) => sum + (b.usdc || 0), 0);
  const isLoadingBalances = Object.values(balances).some(b => b.loading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isEmployee || employments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
          <Wallet className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">No Payments Yet</h1>
        <p className="text-muted-foreground max-w-md">
          You haven&apos;t been registered as an employee in any organization.
          Ask your employer to send you an invite link.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">My Payments</h1>
          <p className="text-muted-foreground">
            Private payroll powered by StealthPay
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Show/Hide Balances */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowBalances(!showBalances)}
            className="text-muted-foreground h-9 w-9"
            title={showBalances ? "Hide balances" : "Show balances"}
          >
            {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>

          {/* Refresh */}
          <Button variant="outline" onClick={() => refetch()} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Export Reports</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const payments: EmployeePaymentExport[] = employments.flatMap(emp =>
                    emp.recentPayments.map(p => ({
                      id: p.id,
                      organizationName: emp.organizationName,
                      amount: p.amount,
                      status: p.status,
                      date: p.paidAt || p.createdAt,
                    }))
                  );
                  downloadEmployeePaymentsCSV(payments);
                  toast({ title: "Exported", description: "Payments exported to CSV" });
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Payments (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const withdrawals: EmployeeWithdrawalExport[] = withdrawalHistory.map(w => ({
                    id: w.id,
                    organizationName: w.organizationName,
                    amount: w.amount,
                    feeAmount: w.feeAmount,
                    netReceived: w.amount - w.feeAmount,
                    mode: w.mode,
                    status: w.status,
                    recipient: w.recipient,
                    date: w.createdAt,
                    txSignature: w.txSignature,
                  }));
                  downloadEmployeeWithdrawalsCSV(withdrawals);
                  toast({ title: "Exported", description: "Withdrawals exported to CSV" });
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Withdrawals (CSV)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const payments: EmployeePaymentExport[] = employments.flatMap(emp =>
                    emp.recentPayments.map(p => ({
                      id: p.id,
                      organizationName: emp.organizationName,
                      amount: p.amount,
                      status: p.status,
                      date: p.paidAt || p.createdAt,
                    }))
                  );
                  const withdrawals: EmployeeWithdrawalExport[] = withdrawalHistory.map(w => ({
                    id: w.id,
                    organizationName: w.organizationName,
                    amount: w.amount,
                    feeAmount: w.feeAmount,
                    netReceived: w.amount - w.feeAmount,
                    mode: w.mode,
                    status: w.status,
                    recipient: w.recipient,
                    date: w.createdAt,
                    txSignature: w.txSignature,
                  }));
                  downloadEmployeeIncomeReportJSON(payments, withdrawals);
                  toast({ title: "Exported", description: "Income report exported to JSON" });
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Full Income Report (JSON)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Total Available Balance Card */}
      <Card className="relative overflow-hidden border-teal-500/30 bg-gradient-to-br from-teal-500/5 via-transparent to-teal-600/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent" />
        <CardContent className="relative pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-500" />
                Total Available to Withdraw
              </p>
              <div className="flex items-baseline gap-3">
                {isLoadingBalances ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : showBalances ? (
                  <>
                    <span className="text-4xl font-display font-bold text-teal-500">
                      {formatCurrency(totalAvailable)}
                    </span>
                    <span className="text-lg text-muted-foreground">USDC</span>
                  </>
                ) : (
                  <span className="text-4xl font-display font-bold text-muted-foreground">
                    ••••••
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Across {employments.length} organization{employments.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-teal-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">Your Employments</h2>

        {employments.map((employment) => {
          const balance = balances[employment.id];
          const hasBalance = balance && balance.usdc > 0;

          return (
            <Card key={employment.id} className="overflow-hidden hover:border-teal-500/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Organization Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-7 h-7 text-teal-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-lg truncate">
                          {employment.organizationName}
                        </h3>
                        <Badge variant="secondary" className="bg-teal-500/10 text-teal-500 text-xs shrink-0">
                          {employment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Salary: {formatCurrency(employment.salary)} USDC/month
                      </p>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="flex items-center gap-6 lg:gap-8">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Available</p>
                      {balance?.loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />
                      ) : showBalances ? (
                        <p className={cn(
                          "text-2xl font-display font-bold",
                          hasBalance ? "text-teal-500" : "text-muted-foreground"
                        )}>
                          {formatCurrency(balance?.usdc || 0)}
                        </p>
                      ) : (
                        <p className="text-2xl font-display font-bold text-muted-foreground">
                          ••••
                        </p>
                      )}
                    </div>

                    {/* Withdraw Button */}
                    <Button
                      onClick={() => openWithdrawDialog(employment)}
                      disabled={!hasBalance}
                      className={cn(
                        "min-w-[140px] transition-all",
                        hasBalance
                          ? "bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <ArrowUpRight className="w-4 h-4 mr-2" />
                      Withdraw
                    </Button>
                  </div>
                </div>

                {/* Wallet Info & Recent Payments - Collapsed */}
                <div className="mt-6 pt-6 border-t border-border/50 grid md:grid-cols-2 gap-6">
                  {/* StealthPay Wallet */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-teal-500" />
                        StealthPay Wallet
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyAddress(employment.stealthPayWallet || "", employment.id)}
                        >
                          {copied === employment.id ? (
                            <Check className="w-3.5 h-3.5 text-teal-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        {employment.stealthPayWallet && (
                          <a
                            href={`https://orbmarkets.io/address/${employment.stealthPayWallet}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-teal-500"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground truncate">
                      {employment.stealthPayWallet || "Not registered"}
                    </p>
                  </div>

                  {/* Recent Payments */}
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Recent Payments</span>
                    {employment.recentPayments.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 italic">No payments yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {employment.recentPayments.slice(0, 3).map((payment) => (
                          <div
                            key={payment.id}
                            className={cn(
                              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs",
                              payment.status === "COMPLETED"
                                ? "bg-teal-500/10 text-teal-500"
                                : "bg-amber-500/10 text-amber-500"
                            )}
                          >
                            <span className="font-medium">+{formatCurrency(payment.amount)}</span>
                            <span className="opacity-60">
                              {format(new Date(payment.paidAt || payment.createdAt), "MMM d")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Withdrawal History */}
      {withdrawalHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              Withdrawal History
            </CardTitle>
            <CardDescription>Your recent withdrawals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {withdrawalHistory.slice(0, 10).map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      withdrawal.mode === "PRIVATE"
                        ? "bg-teal-500/10"
                        : "bg-amber-500/10"
                    )}>
                      {withdrawal.mode === "PRIVATE" ? (
                        <Shield className="w-4 h-4 text-teal-500" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {formatCurrency(withdrawal.amount)} USDC
                        </span>
                        <Badge variant="outline" className={cn(
                          "text-[10px] px-1.5 py-0",
                          withdrawal.mode === "PRIVATE"
                            ? "border-teal-500/30 text-teal-500"
                            : "border-amber-500/30 text-amber-500"
                        )}>
                          {withdrawal.mode}
                        </Badge>
                        {withdrawal.status === "COMPLETED" && (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        )}
                        {withdrawal.status === "FAILED" && (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(withdrawal.createdAt), "MMM d, h:mm a")}</span>
                        <span>→ {withdrawal.recipient}</span>
                        {withdrawal.feeAmount > 0 && (
                          <span className="text-amber-500">
                            (fee: {formatCurrency(withdrawal.feeAmount)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {withdrawal.txSignature && (
                    <a
                      href={`https://orbmarkets.io/tx/${withdrawal.txSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loadingHistory && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Privacy Notice */}
      <Card className="bg-gradient-to-br from-muted/30 to-muted/10 border-border/50">
        <CardContent className="py-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-teal-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">Complete Privacy Protection</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your employer only sees your StealthPay wallet, a temporary receiving address derived from your main wallet.
                When you withdraw via Privacy Cash, the on-chain link between StealthPay and your real wallet is completely broken.
                <span className="text-teal-500 font-medium"> Your balance and transactions stay private.</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {withdrawStep === "input" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-teal-500" />
                  Withdraw Funds
                </DialogTitle>
                <DialogDescription>
                  Choose how you want to withdraw your funds.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Mode Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/30">
                  <button
                    onClick={() => setWithdrawMode("private")}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg transition-all text-sm",
                      withdrawMode === "private"
                        ? "bg-teal-500 text-white shadow-lg"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Private</span>
                    <span className="text-[10px] opacity-80">~5-15% fee</span>
                  </button>
                  <button
                    onClick={() => setWithdrawMode("public")}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg transition-all text-sm",
                      withdrawMode === "public"
                        ? "bg-amber-500 text-white shadow-lg"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Eye className="w-5 h-5" />
                    <span className="font-medium">Public</span>
                    <span className="text-[10px] opacity-80">~$0.002 fee</span>
                  </button>
                </div>

                {/* Mode Description */}
                <div className={cn(
                  "p-3 rounded-xl text-xs",
                  withdrawMode === "private"
                    ? "bg-teal-500/5 border border-teal-500/20 text-teal-600 dark:text-teal-400"
                    : "bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400"
                )}>
                  {withdrawMode === "private" ? (
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Privacy Cash</strong> breaks the on-chain link between your StealthPay wallet and destination.
                        Your employer cannot trace where funds go.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <Eye className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Direct transfer</strong> is visible on-chain. Your employer could potentially
                        see the destination address if they look up the transaction.
                      </span>
                    </div>
                  )}
                </div>

                {/* Available Balance */}
                <div className={cn(
                  "p-4 rounded-2xl",
                  withdrawMode === "private" ? "bg-teal-500/5 border border-teal-500/20" : "bg-amber-500/5 border border-amber-500/20"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available Balance</span>
                    <span className={cn(
                      "text-xl font-display font-bold",
                      withdrawMode === "private" ? "text-teal-500" : "text-amber-500"
                    )}>
                      {formatCurrency(balances[selectedEmployment?.id || ""]?.usdc || 0)} USDC
                    </span>
                  </div>
                </div>

                {/* From */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">From (StealthPay Wallet)</Label>
                  <div className="p-3 rounded-xl bg-muted/30 font-mono text-xs text-muted-foreground truncate">
                    {selectedEmployment?.stealthPayWallet || ""}
                  </div>
                </div>

                {/* To */}
                <div className="space-y-2">
                  <Label htmlFor="withdraw-address">To (Your Wallet)</Label>
                  <Input
                    id="withdraw-address"
                    placeholder="Enter destination wallet address..."
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    className="font-mono text-sm"
                  />
                  {publicKey && withdrawAddress !== publicKey.toBase58() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setWithdrawAddress(publicKey.toBase58())}
                    >
                      Use connected wallet
                    </Button>
                  )}
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Amount (USDC) — Optional</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="Leave empty to withdraw all"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="1"
                    step="0.01"
                  />
                </div>

                {/* Fee Estimation */}
                {feeEstimate && (
                  <div className={cn(
                    "p-4 rounded-xl border space-y-2",
                    withdrawMode === "private"
                      ? "bg-teal-500/5 border-teal-500/20"
                      : "bg-amber-500/5 border-amber-500/20"
                  )}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Estimated Fee</span>
                      <span className={cn(
                        "font-medium",
                        feeEstimate.feePercentage > 10 ? "text-red-500" : "text-muted-foreground"
                      )}>
                        {formatCurrency(feeEstimate.estimatedFee)} USDC ({feeEstimate.feePercentage}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">You&apos;ll Receive</span>
                      <span className={cn(
                        "font-bold text-lg",
                        withdrawMode === "private" ? "text-teal-500" : "text-amber-500"
                      )}>
                        ~{formatCurrency(feeEstimate.estimatedReceived)} USDC
                      </span>
                    </div>
                    {feeEstimate.warning && (
                      <p className="text-xs text-amber-500 mt-2">
                        ⚠️ {feeEstimate.warning}
                      </p>
                    )}
                  </div>
                )}

                {estimatingFee && (
                  <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calculating fees...
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleWithdraw}
                  disabled={!withdrawAddress || withdrawing}
                  className={cn(
                    "text-white",
                    withdrawMode === "private"
                      ? "bg-teal-500 hover:bg-teal-400"
                      : "bg-amber-500 hover:bg-amber-400"
                  )}
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  {withdrawMode === "private" ? "Withdraw Privately" : "Withdraw"}
                </Button>
              </DialogFooter>
            </>
          )}

          {withdrawStep === "signing" && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Sign to Authorize</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please sign the message in your wallet to authorize this withdrawal.
              </p>
              <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
            </div>
          )}

          {withdrawStep === "processing" && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Processing Withdrawal</h3>
              <p className="text-sm text-muted-foreground">
                Privacy Cash is routing your funds through the privacy pool.
                This may take a moment...
              </p>
            </div>
          )}

          {withdrawStep === "success" && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-teal-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Withdrawal Successful!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {withdrawResult?.amount
                  ? `${formatCurrency(withdrawResult.amount)} USDC sent privately to your wallet.`
                  : "Funds sent privately to your wallet."
                }
              </p>
              {withdrawResult?.signature && (
                <a
                  href={`https://orbmarkets.io/tx/${withdrawResult.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-teal-500 hover:text-teal-400 flex items-center justify-center gap-1"
                >
                  View on Solscan
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <Button
                className="mt-6 bg-teal-500 hover:bg-teal-400 text-white"
                onClick={() => setWithdrawDialogOpen(false)}
              >
                Done
              </Button>
            </div>
          )}

          {withdrawStep === "error" && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Withdrawal Failed</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {withdrawResult?.error || "Something went wrong. Please try again."}
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => setWithdrawStep("input")}>
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
