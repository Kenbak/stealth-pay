/**
 * StealthPay Wallet Derivation
 *
 * Creates a deterministic "burner" wallet for employees to receive payroll.
 * The derived wallet is based on:
 * 1. Employee's main wallet (signature)
 * 2. Organization ID (isolation per org)
 *
 * Security properties:
 * - Same main wallet + same org = same StealthPay wallet (deterministic)
 * - Different org = different StealthPay wallet (isolation)
 * - Private key is never stored (derived on-demand)
 * - Only employee can derive (needs main wallet signature)
 * - Employer cannot derive (doesn't have employee's main wallet)
 */

import { Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";

// Version for future-proofing - if we change the derivation, bump this
const DERIVATION_VERSION = 1;

/**
 * Creates the deterministic message that will be signed by the employee's main wallet.
 * This message includes all factors that should make the derived wallet unique.
 */
export function createDerivationMessage(
  mainWalletPublicKey: PublicKey,
  organizationId: string
): Uint8Array {
  const message =
    `StealthPay Employee Wallet Derivation\n` +
    `Main Wallet: ${mainWalletPublicKey.toBase58()}\n` +
    `Organization: ${organizationId}\n` +
    `Version: ${DERIVATION_VERSION}`;

  return new TextEncoder().encode(message);
}

/**
 * Derives a StealthPay Wallet keypair from a signature.
 *
 * The signature must be from signing the message created by createDerivationMessage().
 * This ensures deterministic derivation - same inputs always produce same wallet.
 */
export function deriveKeypairFromSignature(signature: Uint8Array): Keypair {
  // SHA-256 the signature to get exactly 32 bytes (Solana seed requirement)
  const seed = sha256(signature);

  // Create keypair from seed
  return Keypair.fromSeed(seed);
}

/**
 * Full derivation flow - creates a StealthPay Wallet from the employee's main wallet.
 *
 * Usage:
 * ```typescript
 * const { publicKey, signTransaction, signAllTransactions } = await deriveStealthPayWallet(
 *   wallet.publicKey,
 *   wallet.signMessage,
 *   organizationId
 * );
 *
 * // Use publicKey to receive payments
 * // Use signTransaction to sign withdrawals
 * ```
 */
export async function deriveStealthPayWallet(
  mainWalletPublicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  organizationId: string
): Promise<{
  publicKey: PublicKey;
  keypair: Keypair;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => T;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => T[];
}> {
  // 1. Create the deterministic message
  const message = createDerivationMessage(mainWalletPublicKey, organizationId);

  // 2. Sign with main wallet (happens in Phantom/wallet extension - user approval required)
  const signature = await signMessage(message);

  // 3. Derive keypair from signature
  const keypair = deriveKeypairFromSignature(signature);

  // 4. Return wallet interface
  return {
    publicKey: keypair.publicKey,
    keypair, // Needed for some SDK operations
    signTransaction: <T extends Transaction | VersionedTransaction>(tx: T): T => {
      if (tx instanceof Transaction) {
        tx.sign(keypair);
      } else {
        // VersionedTransaction
        tx.sign([keypair]);
      }
      return tx;
    },
    signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]): T[] => {
      return txs.map(tx => {
        if (tx instanceof Transaction) {
          tx.sign(keypair);
        } else {
          tx.sign([keypair]);
        }
        return tx;
      });
    },
  };
}

/**
 * Gets just the public key without keeping the keypair in memory.
 * Useful for display purposes when you don't need signing capability.
 */
export async function getStealthPayWalletAddress(
  mainWalletPublicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  organizationId: string
): Promise<PublicKey> {
  const { publicKey } = await deriveStealthPayWallet(
    mainWalletPublicKey,
    signMessage,
    organizationId
  );
  return publicKey;
}

/**
 * Verifies that a StealthPay wallet address was derived from a specific main wallet.
 *
 * This requires the main wallet to sign the derivation message again,
 * then checks if the derived address matches.
 *
 * Useful for:
 * - Verifying employee owns a StealthPay wallet
 * - Recovering access to StealthPay wallet on new device
 */
export async function verifyStealthPayWallet(
  mainWalletPublicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  organizationId: string,
  expectedStealthPayWallet: PublicKey
): Promise<boolean> {
  try {
    const derivedAddress = await getStealthPayWalletAddress(
      mainWalletPublicKey,
      signMessage,
      organizationId
    );
    return derivedAddress.equals(expectedStealthPayWallet);
  } catch {
    return false;
  }
}
