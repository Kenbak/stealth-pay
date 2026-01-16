/**
 * Privacy Cash SDK Integration
 *
 * Provides private withdrawals from StealthPay wallets to employee's real wallets.
 * Uses ZK proofs and relayers for gasless transactions (fees paid in USDC).
 *
 * Flow:
 * 1. Employee signs derivation message → derives StealthPay keypair
 * 2. Server uses keypair with Privacy Cash SDK
 * 3. SDK creates ZK proof and submits to relayer
 * 4. Relayer executes transaction (pays gas)
 * 5. Funds arrive at employee's private wallet
 *
 * GASLESS DEPOSIT:
 * - Admin wallet acts as fee payer for deposit transactions
 * - Employee signs the deposit, admin wallet pays SOL fee
 * - Employee never needs SOL
 *
 * @see https://github.com/Privacy-Cash/privacy-cash-sdk
 */

import { Keypair, PublicKey, Connection, Transaction, SystemProgram } from "@solana/web3.js";
import { deriveKeypairFromSignature, createDerivationMessage } from "./stealth-wallet";
import bs58 from "bs58";

// USDC Mint address on mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Devnet USDC (for testing)
const USDC_MINT_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// Check if we're on devnet or mainnet
const isDevnet = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet";

/**
 * Get the admin wallet keypair for fee paying
 * This wallet should have a small amount of SOL for transaction fees
 */
function getAdminWallet(): Keypair | null {
  const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.warn("[PrivacyCash] ADMIN_WALLET_PRIVATE_KEY not set - gasless deposits disabled");
    return null;
  }

  try {
    // Support both base58 and array format
    if (privateKey.startsWith("[")) {
      const keyArray = JSON.parse(privateKey);
      return Keypair.fromSecretKey(new Uint8Array(keyArray));
    } else {
      return Keypair.fromSecretKey(bs58.decode(privateKey));
    }
  } catch (error) {
    console.error("[PrivacyCash] Invalid ADMIN_WALLET_PRIVATE_KEY format:", error);
    return null;
  }
}

export interface WithdrawParams {
  /** Signature from signing the derivation message with main wallet */
  derivationSignature: string;
  /** Main wallet public key (for verification) */
  mainWalletPublicKey: string;
  /** Organization ID (for deriving correct StealthPay wallet) */
  organizationId: string;
  /** Destination wallet address */
  recipientAddress: string;
  /** Amount in USDC (human readable, e.g., 100 for 100 USDC) */
  amount?: number;
  /** If true, withdraw entire balance */
  withdrawAll?: boolean;
}

export interface PrivateBalance {
  /** Amount in base units */
  amount: number;
  /** Human readable amount */
  humanAmount: number;
  /** Token symbol */
  token: string;
}

export interface WithdrawResult {
  success: boolean;
  signature?: string;
  error?: string;
  withdrawnAmount?: number;
  feeAmount?: number;
}

/**
 * Server-side Privacy Cash client
 * Uses the privacycash SDK to execute private withdrawals
 */
export class PrivacyCashClient {
  private rpcUrl: string;
  private adminWallet: Keypair | null;

  constructor(rpcUrl?: string) {
    // Use Helius RPC if available for better reliability
    const { getRpcUrl } = require("@/lib/helius");
    this.rpcUrl = rpcUrl || getRpcUrl();
    this.adminWallet = getAdminWallet();

    if (this.adminWallet) {
      console.log("[PrivacyCash] Admin wallet loaded:", this.adminWallet.publicKey.toBase58());
    }
  }

  /**
   * Check if gasless deposits are available
   */
  isGaslessAvailable(): boolean {
    return this.adminWallet !== null;
  }

  /**
   * Get admin wallet public key (for display/debugging)
   */
  getAdminWalletAddress(): string | null {
    return this.adminWallet?.publicKey.toBase58() || null;
  }

  /**
   * Derives the StealthPay keypair from a signature.
   * This is done server-side to use with Privacy Cash SDK.
   */
  deriveKeypair(
    derivationSignature: Uint8Array,
    mainWalletPublicKey: PublicKey,
    organizationId: string
  ): Keypair {
    // Verify the signature would produce a valid keypair
    // The signature was created by signing createDerivationMessage() with the main wallet
    return deriveKeypairFromSignature(derivationSignature);
  }

  /**
   * Get private balance in Privacy Cash pool for a StealthPay wallet
   */
  async getPrivateBalance(keypair: Keypair): Promise<PrivateBalance> {
    try {
      // Dynamic import of Privacy Cash SDK (it's ESM only)
      const { PrivacyCash } = await import("privacycash");

      // SDK expects the secret key as Uint8Array, not the Keypair object
      const client = new PrivacyCash({
        RPC_url: this.rpcUrl,
        owner: keypair.secretKey,
        enableDebug: true,
      });

      const mintAddress = isDevnet ? USDC_MINT_DEVNET : USDC_MINT;
      const balance = await client.getPrivateBalanceSpl(mintAddress);

      // SDK returns amount already in human-readable format (e.g., 6.929307 USDC)
      // NOT in micro-units
      const amount = balance.amount || 0;
      console.log("[PrivacyCash] SDK returned balance:", balance);

      return {
        amount: amount * 1_000_000, // Store raw micro-units for internal use
        humanAmount: amount, // Already human-readable
        token: "USDC",
      };
    } catch (error) {
      console.error("[PrivacyCash] Error getting balance:", error);
      return { amount: 0, humanAmount: 0, token: "USDC" };
    }
  }

  /**
   * Sponsor SOL for gas fees to a StealthPay wallet
   * This enables gasless deposits for employees
   *
   * Privacy Cash SDK requires at least 0.002 SOL
   * We send 0.003 SOL to have a buffer for transaction fees
   */
  async sponsorGas(recipientPubkey: PublicKey, lamports: number = 3_000_000): Promise<{ success: boolean; signature?: string; error?: string }> {
    if (!this.adminWallet) {
      return { success: false, error: "Admin wallet not configured - cannot sponsor gas" };
    }

    try {
      const connection = new Connection(this.rpcUrl, "confirmed");

      // Check if recipient already has enough SOL (Privacy Cash needs 0.002 SOL)
      const recipientBalance = await connection.getBalance(recipientPubkey);
      if (recipientBalance >= 2_500_000) {
        console.log(`[PrivacyCash] Recipient already has ${recipientBalance} lamports (${recipientBalance / 1e9} SOL), skipping sponsor`);
        return { success: true, signature: "skipped-already-funded" };
      }

      // Check admin wallet has enough SOL
      const adminBalance = await connection.getBalance(this.adminWallet.publicKey);
      console.log(`[PrivacyCash] Admin wallet balance: ${adminBalance} lamports`);

      if (adminBalance < lamports + 10000) { // Need extra for tx fee
        return { success: false, error: `Admin wallet has insufficient SOL balance (${adminBalance} lamports, need ${lamports + 10000})` };
      }

      // Create transfer instruction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.adminWallet.publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.adminWallet.publicKey;

      // Sign and send
      transaction.sign(this.adminWallet);
      const signature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      console.log(`[PrivacyCash] Sponsored ${lamports} lamports (${lamports / 1e9} SOL) to ${recipientPubkey.toBase58()}, tx: ${signature}`);

      return { success: true, signature };
    } catch (error: any) {
      console.error("[PrivacyCash] Sponsor gas error:", error);
      return { success: false, error: error.message || "Failed to sponsor gas" };
    }
  }

  /**
   * Deposit USDC from StealthPay wallet into Privacy Cash pool
   * This is the first step before withdrawal - funds must be in the pool
   *
   * If the wallet has no SOL, will attempt gasless deposit via admin wallet sponsorship
   */
  async depositToPool(keypair: Keypair, amount: number): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      const connection = new Connection(this.rpcUrl, "confirmed");

      // Check if wallet has SOL for gas
      // Privacy Cash SDK requires at least 0.002 SOL
      const balance = await connection.getBalance(keypair.publicKey);
      console.log(`[PrivacyCash] StealthPay wallet SOL balance: ${balance} lamports (${balance / 1e9} SOL)`);

      // Minimum needed by Privacy Cash SDK: 0.002 SOL = 2,000,000 lamports
      const MIN_BALANCE_NEEDED = 2_500_000; // 0.0025 SOL (with buffer)

      // If insufficient SOL, sponsor gas from admin wallet
      if (balance < MIN_BALANCE_NEEDED && this.adminWallet) {
        console.log("[PrivacyCash] Insufficient SOL in wallet, sponsoring gas...");
        const sponsorResult = await this.sponsorGas(keypair.publicKey, 3_000_000); // 0.003 SOL
        if (!sponsorResult.success) {
          return { success: false, error: `Gasless deposit failed: ${sponsorResult.error}` };
        }
        console.log("[PrivacyCash] Gas sponsored successfully!");

        // Wait for transaction to confirm
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else if (balance < MIN_BALANCE_NEEDED) {
        return { success: false, error: "No SOL for gas and gasless deposits not available (admin wallet not configured)" };
      }

      const { PrivacyCash } = await import("privacycash");

      // SDK expects the secret key as Uint8Array, not the Keypair object
      const client = new PrivacyCash({
        RPC_url: this.rpcUrl,
        owner: keypair.secretKey,
        enableDebug: true,
      });

      const mintAddress = isDevnet ? USDC_MINT_DEVNET : USDC_MINT;

      // SDK expects amount in human-readable format (e.g., 6.5 for 6.5 USDC)
      // If caller passed micro-units (>= 1000), convert to human
      const amountHuman = amount >= 1000 ? amount / 1_000_000 : amount;

      console.log(`[PrivacyCash] Depositing ${amountHuman} USDC to Privacy Cash pool`);

      const result = await client.depositSPL({
        amount: amountHuman,
        mintAddress,
      });

      return { success: true, signature: result?.tx };
    } catch (error: any) {
      console.error("[PrivacyCash] Deposit error:", error);
      return { success: false, error: error.message || "Deposit failed" };
    }
  }

  /**
   * Withdraw USDC from Privacy Cash pool to recipient address
   * This breaks the on-chain link between StealthPay wallet and recipient
   */
  async withdrawFromPool(
    keypair: Keypair,
    recipientAddress: string,
    amount?: number
  ): Promise<WithdrawResult> {
    try {
      const { PrivacyCash } = await import("privacycash");

      // SDK expects the secret key as Uint8Array, not the Keypair object
      const client = new PrivacyCash({
        RPC_url: this.rpcUrl,
        owner: keypair.secretKey,
        enableDebug: true,
      });

      const mintAddress = isDevnet ? USDC_MINT_DEVNET : USDC_MINT;

      // First check balance in pool
      // SDK returns balance.amount in human-readable format (e.g., 6.929307 USDC)
      const balance = await client.getPrivateBalanceSpl(mintAddress);
      const availableAmountHuman = balance.amount || 0;

      console.log(`[PrivacyCash] Pool balance from SDK: ${availableAmountHuman} USDC`);

      if (availableAmountHuman <= 0) {
        return { success: false, error: "No funds in Privacy Cash pool" };
      }

      // SDK expects amount in human-readable format (same as what it returns)
      let withdrawAmountHuman: number;
      if (amount) {
        // If caller passed micro-units (>= 1000), convert to human
        withdrawAmountHuman = amount >= 1000 ? amount / 1_000_000 : amount;
      } else {
        // Withdraw 99% of available (leave some for fees)
        withdrawAmountHuman = availableAmountHuman * 0.99;
      }

      // Ensure minimum withdraw amount (1 USDC)
      if (withdrawAmountHuman < 1) {
        return { success: false, error: `Amount too small to withdraw. Minimum is 1 USDC, got ${withdrawAmountHuman.toFixed(6)} USDC` };
      }

      console.log(`[PrivacyCash] Withdrawing ${withdrawAmountHuman} USDC to ${recipientAddress}`);

      const result = await client.withdrawSPL({
        mintAddress,
        amount: withdrawAmountHuman,
        recipientAddress,
      });

      return {
        success: true,
        signature: result?.tx,
        withdrawnAmount: withdrawAmountHuman,
      };
    } catch (error: any) {
      console.error("[PrivacyCash] Withdraw error:", error);
      return { success: false, error: error.message || "Withdrawal failed" };
    }
  }

  /**
   * Full withdrawal flow:
   * 1. Check wallet USDC balance first (funds from ShadowWire payroll)
   * 2. If wallet has funds, deposit to Privacy Cash pool
   * 3. Check pool balance
   * 4. Withdraw from pool to recipient
   *
   * This is the main function to use for employee withdrawals.
   */
  async executePrivateWithdrawal(params: WithdrawParams): Promise<WithdrawResult> {
    try {
      // 1. Derive the StealthPay keypair from the signature
      const signatureBytes = Buffer.from(params.derivationSignature, "base64");
      const mainWalletPubkey = new PublicKey(params.mainWalletPublicKey);

      const keypair = this.deriveKeypair(
        signatureBytes,
        mainWalletPubkey,
        params.organizationId
      );

      console.log("[PrivacyCash] Derived StealthPay wallet:", keypair.publicKey.toBase58());

      // 2. FIRST check wallet's direct USDC balance (from ShadowWire payroll)
      const connection = new Connection(this.rpcUrl, "confirmed");
      const mintAddress = isDevnet ? USDC_MINT_DEVNET : USDC_MINT;

      const { getAssociatedTokenAddress } = await import("@solana/spl-token");
      const ata = await getAssociatedTokenAddress(mintAddress, keypair.publicKey);

      let walletBalance = 0;
      try {
        const tokenAccount = await connection.getTokenAccountBalance(ata);
        walletBalance = parseFloat(tokenAccount.value.uiAmountString || "0");
      } catch {
        walletBalance = 0;
      }

      console.log("[PrivacyCash] Wallet direct USDC balance:", walletBalance, "USDC");

      // 3. If wallet has USDC, deposit to Privacy Cash pool first
      if (walletBalance >= 1) {
        console.log("[PrivacyCash] Found USDC in wallet, depositing to Privacy Cash pool...");

        const depositAmount = params.amount || walletBalance * 0.99; // Leave 1% for fees
        console.log("[PrivacyCash] Deposit amount:", depositAmount, "USDC");

        const depositResult = await this.depositToPool(keypair, depositAmount);

        if (!depositResult.success) {
          return { success: false, error: `Deposit failed: ${depositResult.error}` };
        }

        console.log("[PrivacyCash] Deposit successful! Waiting for confirmation...");

        // Wait for deposit to be confirmed and indexed
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      // 4. Check Privacy Cash pool balance
      const poolBalance = await this.getPrivateBalance(keypair);
      console.log("[PrivacyCash] Pool balance after deposit:", poolBalance.humanAmount, "USDC");

      // Pool balance should now have the deposited funds
      // The SDK returns humanAmount in USDC (not micro-units)
      if (poolBalance.humanAmount < 1) {
        return {
          success: false,
          error: `Insufficient funds. Pool balance: ${poolBalance.humanAmount} USDC. Minimum withdrawal: 1 USDC.`
        };
      }

      // 5. Withdraw from pool to recipient's real wallet
      console.log("[PrivacyCash] Withdrawing from pool to recipient...");
      const withdrawResult = await this.withdrawFromPool(
        keypair,
        params.recipientAddress,
        params.amount
      );

      // Calculate fee (difference between what was deposited and what was withdrawn)
      if (withdrawResult.success && walletBalance > 0 && withdrawResult.withdrawnAmount) {
        const depositedAmount = params.amount || walletBalance * 0.99;
        const feeAmount = depositedAmount - withdrawResult.withdrawnAmount;
        withdrawResult.feeAmount = Math.max(0, feeAmount);
        console.log(`[PrivacyCash] Fee paid: ${withdrawResult.feeAmount.toFixed(4)} USDC (${((feeAmount / depositedAmount) * 100).toFixed(1)}%)`);
      }

      return withdrawResult;

    } catch (error: any) {
      console.error("[PrivacyCash] executePrivateWithdrawal error:", error);
      return {
        success: false,
        error: error.message || "Private withdrawal failed",
      };
    }
  }
}

// Export singleton instance
export const privacyCashClient = new PrivacyCashClient();
