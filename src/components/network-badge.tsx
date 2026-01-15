"use client";

import { Badge } from "@/components/ui/badge";
import { getSolanaNetwork, isMainnet } from "@/lib/utils";
import { Globe, TestTube2, Zap } from "lucide-react";

/**
 * Check if Helius is configured (client-side)
 */
function useHeliusConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_HELIUS_API_KEY;
}

/**
 * Network indicator badge
 * Shows the current Solana network (devnet/mainnet)
 */
export function NetworkBadge() {
  const network = getSolanaNetwork();
  const mainnet = isMainnet();

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 rounded-lg ${
        mainnet
          ? "border-teal-500/50 bg-teal-500/10 text-teal-600 dark:text-teal-400"
          : "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      }`}
    >
      {mainnet ? (
        <>
          <Globe className="h-3 w-3" />
          Mainnet
        </>
      ) : (
        <>
          <TestTube2 className="h-3 w-3" />
          Devnet
        </>
      )}
    </Badge>
  );
}

/**
 * Helius RPC badge
 * Shows that Helius enhanced RPC is being used
 */
export function HeliusBadge() {
  const heliusConfigured = useHeliusConfigured();

  if (!heliusConfigured) return null;

  return (
    <Badge
      variant="outline"
      className="gap-1.5 rounded-lg border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      title="Powered by Helius RPC - Enhanced performance & APIs"
    >
      <Zap className="h-3 w-3" />
      Helius
    </Badge>
  );
}

/**
 * Network warning for devnet
 * Shows a warning when on devnet that funds are not real
 */
export function DevnetWarning() {
  if (isMainnet()) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <TestTube2 className="h-4 w-4" />
        </div>
        <div>
          <strong className="font-medium">Devnet Mode</strong> - Using test tokens. No real funds at risk.
          <br />
          <span className="text-xs opacity-80">
            Get test SOL from{" "}
            <a
              href="https://faucet.solana.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Solana Faucet
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Mainnet warning
 * Shows a warning when on mainnet that funds are real
 */
export function MainnetWarning() {
  if (!isMainnet()) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
          <Globe className="h-4 w-4" />
        </div>
        <div>
          <strong className="font-medium">Mainnet Mode</strong> - Using real funds. Proceed with caution.
        </div>
      </div>
    </div>
  );
}
