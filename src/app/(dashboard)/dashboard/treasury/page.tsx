"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
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
import {
  Wallet,
  Plus,
  ArrowDownToLine,
  ExternalLink,
  Loader2,
  AlertCircle,
  Shield,
  CheckCircle2,
  ArrowRight,
  Info,
} from "lucide-react";
import { useEmployees } from "@/hooks/use-employees";
import { usePrices } from "@/hooks/use-prices";
import { formatCurrency, truncateAddress, TOKENS } from "@/lib/utils";
import { calculateFee, FEES } from "@/lib/fees";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useToast } from "@/components/ui/use-toast";

export default function TreasuryPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { totalSalary, activeEmployees } = useEmployees();
  const { toast } = useToast();
  const { prices, getPrice, toUsd, isLoading: pricesLoading } = usePrices();

  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("USDC");
  const [isDepositing, setIsDepositing] = useState(false);

  // Get current token price
  const tokenPrice = getPrice(selectedToken);
  const isStablecoin = selectedToken === "USDC" || selectedToken === "USDT";

  // Calculate amounts in token and USD
  const tokenAmount = parseFloat(depositAmount) || 0;
  const usdAmount = toUsd(tokenAmount, selectedToken);

  // Calculate fees (always in USD for consistency)
  const { fee, netAmount, feePercentage } = calculateFee(usdAmount);

  // Net amount in tokens (after fee)
  const netTokenAmount = isStablecoin ? netAmount : (tokenPrice > 0 ? netAmount / tokenPrice : 0);

  // Fetch wallet balance
  const fetchBalance = async () => {
    if (!publicKey) return;

    setIsLoadingBalance(true);
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
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
    if (!depositAmount || tokenAmount <= 0) return;

    setIsDepositing(true);

    // TODO: Integrate Privacy Cash SDK here
    // For now, show a placeholder
    setTimeout(() => {
      toast({
        title: "🚧 Privacy Cash Integration",
        description: `Deposit of ${formatCurrency(netAmount)} will be available after SDK integration`,
      });
      setIsDepositing(false);
    }, 1500);
  };

  // Check if deposit covers payroll (compare in USD)
  const coversPayroll = netAmount >= totalSalary;
  const needsMore = totalSalary > 0 && netAmount < totalSalary;
  const monthsCovered = totalSalary > 0 ? Math.floor(netAmount / totalSalary) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Treasury</h1>
        <p className="text-muted-foreground">
          Manage your payroll funds and deposits
        </p>
      </div>

      {/* Wallet Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Connected Wallet
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {publicKey ? (
              <>
                <div className="text-lg font-mono font-semibold">
                  {truncateAddress(publicKey.toBase58(), 6)}
                </div>
                <a
                  href={`https://explorer.solana.com/address/${publicKey.toBase58()}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  View on Explorer <ExternalLink className="h-3 w-3" />
                </a>
              </>
            ) : (
              <p className="text-muted-foreground">Not connected</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              SOL Balance
            </CardTitle>
            <Badge variant="secondary">Devnet</Badge>
          </CardHeader>
          <CardContent>
            {isLoadingBalance ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : balance !== null ? (
              <>
                <div className="text-2xl font-bold">
                  {balance.toFixed(4)} SOL
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchBalance}
                  className="text-xs p-0 h-auto text-muted-foreground hover:text-foreground"
                >
                  Refresh
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={fetchBalance}>
                Load Balance
              </Button>
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

      {/* Deposit Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5" />
            Deposit Funds
          </CardTitle>
          <CardDescription>
            Add funds to your payroll treasury for private distribution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* How it works */}
          <div className="bg-stealth-500/5 border border-stealth-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-stealth-500 mt-0.5" />
              <div>
                <p className="font-medium text-stealth-600 dark:text-stealth-400">
                  How Private Deposits Work
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Funds are deposited into a Privacy Cash pool. When you run
                  payroll, individual payments are made privately using
                  zero-knowledge proofs. The total deposit is visible, but
                  individual payments are completely hidden.
                </p>
              </div>
            </div>
          </div>

          {/* Input Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <select
                id="token"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
              >
                {Object.values(TOKENS).map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.icon} {token.symbol} - {token.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Deposit Amount</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="pr-16 text-lg"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {selectedToken}
                </div>
              </div>
            </div>
          </div>

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
          {tokenAmount > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-muted-foreground" />
                Fee Breakdown
              </div>

              <div className="space-y-2">
                {/* Token Price (only for non-stablecoins) */}
                {!isStablecoin && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Current {selectedToken} price</span>
                    <span className="font-mono">
                      {pricesLoading ? "Loading..." : formatCurrency(tokenPrice)}
                    </span>
                  </div>
                )}

                {/* Deposit Amount */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">You deposit</span>
                  <span className="font-medium">
                    {tokenAmount} {selectedToken}
                    {!isStablecoin && (
                      <span className="text-muted-foreground ml-1">
                        (≈ {formatCurrency(usdAmount)})
                      </span>
                    )}
                  </span>
                </div>

                {/* Fee */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    StealthPay fee ({feePercentage}%)
                  </span>
                  <span className="text-orange-500">-{formatCurrency(fee)}</span>
                </div>

                {/* Divider */}
                <div className="border-t my-2" />

                {/* Net Amount */}
                <div className="flex justify-between items-baseline">
                  <span className="font-medium">Available for payroll</span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-stealth-500">
                      {formatCurrency(netAmount)}
                    </span>
                    {!isStablecoin && (
                      <div className="text-xs text-muted-foreground">
                        ≈ {netTokenAmount.toFixed(4)} {selectedToken}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coverage indicator */}
                {totalSalary > 0 && (
                  <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                    coversPayroll
                      ? "bg-stealth-500/10 text-stealth-600 dark:text-stealth-400"
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
                        Need {formatCurrency(totalSalary - netAmount)} more to cover 1 month
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deposit Flow Visualization */}
          {tokenAmount > 0 && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
                <span className="mt-1">Your Wallet</span>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground/50" />

              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-stealth-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-stealth-500" />
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
            disabled={!depositAmount || tokenAmount <= 0 || isDepositing}
            className="w-full"
            size="lg"
          >
            {isDepositing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Deposit {tokenAmount > 0 ? `${tokenAmount} ${selectedToken}` : ""} to Privacy Pool
              </>
            )}
          </Button>

          {/* Fee explanation */}
          <p className="text-xs text-muted-foreground text-center">
            A {feePercentage}% fee is charged to support StealthPay operations.
            {" "}Minimum fee: ${FEES.MINIMUM_USD.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Recent Deposits */}
      <Card>
        <CardHeader>
          <CardTitle>Deposit History</CardTitle>
          <CardDescription>Your recent deposits to the treasury</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No deposits yet</p>
            <p className="text-sm">Make your first deposit to get started</p>
          </div>
        </CardContent>
      </Card>

      {/* Devnet Notice */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Info className="h-5 w-5 flex-shrink-0" />
            <div>
              <p>
                <strong>Devnet Mode:</strong> For testing, get free tokens from{" "}
                <a
                  href="https://spl-token-faucet.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stealth-500 hover:underline"
                >
                  SPL Token Faucet
                </a>
                {" "}or{" "}
                <a
                  href="https://faucet.solana.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stealth-500 hover:underline"
                >
                  Solana Faucet
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
