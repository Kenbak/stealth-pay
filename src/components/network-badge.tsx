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
      className={`gap-1.5 ${
        mainnet
          ? "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400"
          : "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
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
      className="gap-1.5 border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400"
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
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-400">
      <div className="flex items-center gap-2">
        <TestTube2 className="h-4 w-4 flex-shrink-0" />
        <div>
          <strong>Devnet Mode</strong> - Using test tokens. No real funds at risk.
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
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 flex-shrink-0" />
        <div>
          <strong>Mainnet Mode</strong> - Using real funds. Proceed with caution.
        </div>
      </div>
    </div>
  );
}
