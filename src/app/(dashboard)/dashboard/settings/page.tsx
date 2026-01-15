"use client";

import { useOrganization } from "@/hooks/use-organization";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRequireOrganization } from "@/hooks/use-require-organization";
import { useEmployees } from "@/hooks/use-employees";
import { usePayrolls } from "@/hooks/use-payrolls";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Wallet,
  Users,
  Clock,
  Shield,
  ExternalLink,
  Copy,
  Check,
  Github,
  Zap,
  Lock,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { truncateAddress } from "@/lib/utils";
import { isHeliusConfigured } from "@/lib/helius";

// Get network from env
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
const isMainnet = NETWORK === "mainnet-beta";

export default function SettingsPage() {
  // Redirect to /dashboard if no organization
  const { isLoading: orgLoading, hasOrganization } = useRequireOrganization();

  const { organization, isLoading } = useOrganization();
  const { publicKey } = useWallet();
  const { employees } = useEmployees();
  const { payrolls } = usePayrolls();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeEmployees = employees.filter((e) => e.status === "ACTIVE").length;
  const completedPayrolls = payrolls.filter((p) => p.status === "COMPLETED").length;

  // Show loading while checking org
  if (orgLoading || !hasOrganization) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization
            </CardTitle>
            <CardDescription>Your organization details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : organization ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium text-lg">{organization.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {format(new Date(organization.createdAt), "MMMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant={isMainnet ? "default" : "secondary"}>
                    {isMainnet ? "Mainnet" : "Devnet"}
                  </Badge>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No organization found</p>
            )}
          </CardContent>
        </Card>

        {/* Wallet Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Admin Wallet
            </CardTitle>
            <CardDescription>Connected wallet address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {publicKey ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-lg font-mono text-sm truncate">
                    {publicKey.toBase58()}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyAddress}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <a
                  href={`https://solscan.io/account/${publicKey.toBase58()}${!isMainnet ? "?cluster=devnet" : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-amber-500 hover:underline"
                >
                  View on Solscan
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            ) : (
              <p className="text-muted-foreground">No wallet connected</p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Statistics
            </CardTitle>
            <CardDescription>Your organization stats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-amber-500">{activeEmployees}</p>
                <p className="text-sm text-muted-foreground">Active Employees</p>
              </div>
              <div className="bg-teal-500/5 border border-teal-500/10 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-teal-500">{completedPayrolls}</p>
                <p className="text-sm text-muted-foreground">Payrolls Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security & Privacy
            </CardTitle>
            <CardDescription>Your data protection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-teal-500" />
                <span className="text-sm font-medium">Data Encryption</span>
              </div>
              <Badge variant="outline" className="border-teal-500/50 text-teal-500">
                AES-256-GCM
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Private Payments</span>
              </div>
              <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                ShadowWire ZK
              </Badge>
            </div>
            {isHeliusConfigured() && (
              <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Enhanced RPC</span>
                </div>
                <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                  Helius
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About StealthPay
          </CardTitle>
          <CardDescription>Private payroll on Solana</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                StealthPay enables organizations to pay employees privately using
                zero-knowledge proofs on Solana. Salaries stay confidential on-chain.
              </p>
              <p className="text-xs text-muted-foreground">
                Powered by Radr ShadowWire
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://github.com/your-repo/stealth-payroll"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://radr.fun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Radr Labs
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devnet Notice */}
      {!isMainnet && (
        <Card className="border-dashed border-amber-500/30 !bg-amber-500/[0.02]">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-sm">
              <Info className="h-5 w-5 flex-shrink-0 text-amber-500" />
              <div>
                <p className="text-amber-700 dark:text-amber-400">
                  <strong>Devnet Mode</strong> — You are using test tokens. No real funds at risk.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
