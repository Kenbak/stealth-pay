import { createHash } from "crypto";

/**
 * Hash a wallet address for storage.
 * This allows looking up employees by their wallet without storing the actual address.
 *
 * The employer cannot reverse this hash to get the actual wallet address.
 * The employee can still log in because we hash their connected wallet and compare.
 *
 * @param walletAddress - The Solana wallet address to hash
 * @returns A SHA256 hash of the wallet address
 */
export function hashWallet(walletAddress: string): string {
  // Add a salt for extra security (use env var in production)
  const salt = process.env.WALLET_HASH_SALT || "stealthpay-wallet-hash-v1";
  return createHash("sha256")
    .update(`${salt}:${walletAddress}`)
    .digest("hex");
}

/**
 * Verify if a wallet address matches a stored hash.
 *
 * @param walletAddress - The wallet address to check
 * @param storedHash - The stored hash to compare against
 * @returns true if the wallet matches the hash
 */
export function verifyWalletHash(
  walletAddress: string,
  storedHash: string
): boolean {
  return hashWallet(walletAddress) === storedHash;
}
