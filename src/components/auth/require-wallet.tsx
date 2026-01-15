"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { Wallet, Lock, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

interface RequireWalletProps {
  children: React.ReactNode;
}

/**
 * Protects content behind wallet connection
 * Security: Never expose dashboard without auth
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto" />
          <p className="text-muted-foreground">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  // Not connected - show connect prompt
  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {/* Ambient background effect */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-md w-full space-y-6 animate-in">
          {/* Logo & Title */}
          <div className="text-center">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/logo.png"
                alt="StealthPay"
                width={64}
                height={64}
              />
            </Link>
            <h1 className="text-2xl font-display font-bold">Welcome to StealthPay</h1>
            <p className="text-muted-foreground mt-2">Private payroll for modern teams</p>
          </div>

          {/* Connect Card */}
          <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 mb-2">
                <Wallet className="w-7 h-7 text-amber-500" />
              </div>
              <h2 className="text-xl font-display font-semibold">Sign In or Create Account</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Connect your Solana wallet to sign in. New users will be guided through account setup.
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

            {/* Wallet options hint */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-gradient-to-br from-purple-500 to-purple-600" />
                Phantom
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-gradient-to-br from-orange-500 to-orange-600" />
                Solflare
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-gradient-to-br from-gray-600 to-gray-700" />
                Ledger
              </span>
              <span>+ more</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Why connect?
            </div>
            <ul className="space-y-2">
              {[
                "Your wallet is your identity—no passwords needed",
                "One-click sign in across all your devices",
                "All data encrypted with your unique key",
              ].map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Security note */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex gap-3">
              <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Your Security Matters
                </p>
                <p className="text-xs text-muted-foreground">
                  We never access your private keys. You&apos;ll sign a message to prove wallet ownership—no transaction fees, no risk.
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
