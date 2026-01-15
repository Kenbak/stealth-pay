"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  CircleDollarSign,
  Wallet,
  ArrowUpRight,
  Copy,
  Check,
  Lock,
  Building2,
  Calendar,
  ExternalLink,
  AlertCircle,
  Loader2,
  RefreshCw,
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

export default function MyPaymentsPage() {
  const { publicKey, signMessage } = useWallet();
  const { isEmployee, employments, isLoading, refetch } = useUserRoles();

  const [copied, setCopied] = useState<string | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedEmployment, setSelectedEmployment] = useState<typeof employments[0] | null>(null);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const copyAddress = (address: string, id: string) => {
    navigator.clipboard.writeText(address);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const openWithdrawDialog = (employment: typeof employments[0]) => {
    setSelectedEmployment(employment);
    setWithdrawDialogOpen(true);
  };

  const handleWithdraw = async () => {
    if (!selectedEmployment || !withdrawAddress || !signMessage || !publicKey) return;

    setWithdrawing(true);
    try {
      // TODO: Implement Privacy Cash withdrawal
      // 1. Derive the StealthPay wallet keypair
      // 2. Use Privacy Cash SDK to withdraw to the destination address
      // 3. Update UI with transaction status

      // For now, show a message that this is coming soon
      alert("Withdrawal via Privacy Cash coming soon!");
    } catch (err) {
      console.error("Withdrawal error:", err);
    } finally {
      setWithdrawing(false);
      setWithdrawDialogOpen(false);
    }
  };

  // Calculate totals
  const totalBalance = employments.reduce((sum, emp) => {
    // In a real implementation, we'd fetch the actual StealthPay wallet balance
    // For now, estimate from payments
    const paidTotal = emp.recentPayments
      .filter(p => p.status === "COMPLETED")
      .reduce((s, p) => s + p.amount, 0);
    return sum + paidTotal;
  }, 0);

  const totalSalary = employments.reduce((sum, emp) => sum + emp.salary, 0);

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
          <CircleDollarSign className="w-8 h-8 text-muted-foreground" />
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
            View and manage your private payroll payments
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Organizations */}
        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{employments.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {employments.map(e => e.organizationName).join(", ")}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Salary */}
        <Card className="bg-gradient-to-br from-teal-500/5 to-teal-500/10 border-teal-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Monthly Salary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-teal-500">
              {formatCurrency(totalSalary)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">USDC</p>
          </CardContent>
        </Card>

        {/* Received (Recent) */}
        <Card className="bg-gradient-to-br from-violet-500/5 to-violet-500/10 border-violet-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4" />
              Recent Received
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-violet-500">
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">From recent payrolls</p>
          </CardContent>
        </Card>
      </div>

      {/* Employment Cards */}
      <div className="space-y-6">
        {employments.map((employment) => (
          <Card key={employment.id} className="overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-teal-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{employment.organizationName}</CardTitle>
                    <CardDescription>
                      Salary: {formatCurrency(employment.salary)} USDC/month
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-teal-500/10 text-teal-500">
                  {employment.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* StealthPay Wallet */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Lock className="w-4 h-4 text-teal-500" />
                        Your StealthPay Wallet
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => copyAddress(employment.stealthPayWallet || "", employment.id)}
                      >
                        {copied === employment.id ? (
                          <Check className="w-4 h-4 text-teal-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="font-mono text-sm break-all">
                      {employment.stealthPayWallet || "Not registered"}
                    </p>
                    {employment.stealthPayWallet && (
                      <a
                        href={`https://solscan.io/account/${employment.stealthPayWallet}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 mt-2"
                      >
                        View on Solscan
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Withdraw Button */}
                  <Button
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white"
                    onClick={() => openWithdrawDialog(employment)}
                  >
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Withdraw to My Wallet
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Powered by Privacy Cash — gas fees paid in USDC
                  </p>
                </div>

                {/* Recent Payments */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Recent Payments</h3>
                  {employment.recentPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No payments yet</p>
                  ) : (
                    <div className="space-y-2">
                      {employment.recentPayments.slice(0, 5).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              payment.status === "COMPLETED" ? "bg-teal-500" : "bg-amber-500"
                            )} />
                            <span className="text-sm">
                              {payment.paidAt
                                ? format(new Date(payment.paidAt), "MMM d, yyyy")
                                : format(new Date(payment.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                          <span className="font-mono text-sm font-medium">
                            +{formatCurrency(payment.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Privacy Notice */}
      <Card className="bg-teal-500/5 border-teal-500/20">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-teal-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Your Privacy is Protected</h3>
              <p className="text-sm text-muted-foreground">
                Your employer only sees your StealthPay wallet address — a temporary receiving address.
                They cannot see your personal wallet, your total balance, or where you send funds after withdrawal.
                When you withdraw, Privacy Cash breaks the on-chain link between your StealthPay wallet and your real wallet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-teal-500" />
              Withdraw Funds
            </DialogTitle>
            <DialogDescription>
              Transfer funds from your StealthPay wallet to your personal wallet using Privacy Cash.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* From */}
            <div className="space-y-2">
              <Label>From (StealthPay Wallet)</Label>
              <div className="p-3 rounded-xl bg-muted/30 font-mono text-sm">
                {truncateAddress(selectedEmployment?.stealthPayWallet || "")}
              </div>
            </div>

            {/* To */}
            <div className="space-y-2">
              <Label htmlFor="withdraw-address">To (Your Personal Wallet)</Label>
              <Input
                id="withdraw-address"
                placeholder="Enter destination wallet address..."
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                className="font-mono"
              />
              {publicKey && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setWithdrawAddress(publicKey.toBase58())}
                >
                  Use connected wallet ({truncateAddress(publicKey.toBase58())})
                </Button>
              )}
            </div>

            {/* Privacy Info */}
            <div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/20">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Privacy Cash will route this transfer through a privacy pool.
                  Gas fees will be paid in USDC (no SOL needed).
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={!withdrawAddress || withdrawing}
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white"
            >
              {withdrawing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Withdraw
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
