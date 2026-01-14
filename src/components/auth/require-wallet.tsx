"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { Shield, Wallet, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface RequireWalletProps {
  children: React.ReactNode;
}

/**
 * Composant qui protège le contenu derrière une connexion wallet
 * Recommandation sécurité: Ne jamais exposer le dashboard sans auth
 */
export function RequireWallet({ children }: RequireWalletProps) {
  const { connected, connecting, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [isClient, setIsClient] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show loading during SSR or while connecting
  if (!isClient || connecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-stealth-500 mx-auto" />
          <p className="text-muted-foreground">Connecting...</p>
        </div>
      </div>
    );
  }

  // Not connected - show connect prompt
  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-stealth-950/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stealth-500/10 mb-4">
              <Shield className="w-8 h-8 text-stealth-500" />
            </div>
            <h1 className="text-2xl font-bold">StealthPay</h1>
            <p className="text-muted-foreground mt-2">Private Payroll on Solana</p>
          </div>

          {/* Connect Card */}
          <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stealth-500/10 mb-2">
                <Lock className="w-6 h-6 text-stealth-500" />
              </div>
              <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
              <p className="text-sm text-muted-foreground">
                Connect your Solana wallet to access the dashboard.
                Your wallet is your identity.
              </p>
            </div>

            <Button
              onClick={() => setVisible(true)}
              className="w-full h-12 text-base gap-2"
              size="lg"
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </Button>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Supported: Phantom, Solflare, Ledger, and more
              </p>
            </div>
          </div>

          {/* Security note */}
          <div className="bg-stealth-500/5 border border-stealth-500/20 rounded-xl p-4">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-stealth-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-stealth-600 dark:text-stealth-400">
                  Secure by Design
                </p>
                <p className="text-xs text-muted-foreground">
                  We never store your private keys. Authentication is done via
                  cryptographic signatures. All sensitive data is encrypted.
                </p>
              </div>
            </div>
          </div>

          {/* Back to home */}
          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Connected - render children
  return <>{children}</>;
}
