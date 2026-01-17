/**
 * API Endpoint: Private Withdrawal via Privacy Cash
 *
 * POST /api/withdraw
 *
 * Allows employees to withdraw funds from their StealthPay wallet to their personal wallet
 * using Privacy Cash for complete privacy.
 *
 * Flow:
 * 1. Client signs derivation message with main wallet
 * 2. Sends signature + organizationId + recipientAddress to this endpoint
 * 3. Server derives StealthPay keypair from signature
 * 4. Server uses Privacy Cash SDK to execute private withdrawal
 * 5. Funds arrive at recipient address with no on-chain link
 *
 * Security:
 * - Only the person who can sign with the main wallet can withdraw
 * - Signature is used only once and discarded after keypair derivation
 * - No private keys stored on server
 */

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getAuthUser } from "@/lib/auth";
import { privacyCashClient, WithdrawParams, WithdrawResult } from "@/lib/privacy-cash";
import { createDerivationMessage } from "@/lib/stealth-wallet";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { prisma } from "@/lib/db";
import { calculateWithdrawalFee, FEES } from "@/lib/fees";

interface WithdrawRequest {
  /** Base64-encoded signature of the derivation message */
  derivationSignature: string;
  /** Organization ID to withdraw from */
  organizationId: string;
  /** Destination wallet address */
  recipientAddress: string;
  /** Amount in USDC (optional - withdraws all if not specified) */
  amount?: number;
  /** Withdrawal mode: "private" (via Privacy Cash) or "public" (direct transfer) */
  mode?: "private" | "public";
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the request
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: WithdrawRequest = await request.json();
    const { derivationSignature, organizationId, recipientAddress, amount, mode = "private" } = body;

    // 3. Validate required fields
    if (!derivationSignature || !organizationId || !recipientAddress) {
      return NextResponse.json(
        { error: "Missing required fields: derivationSignature, organizationId, recipientAddress" },
        { status: 400 }
      );
    }

    // 4. Validate recipient address format
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipientAddress);
    } catch {
      return NextResponse.json(
        { error: "Invalid recipient address" },
        { status: 400 }
      );
    }

    // 5. Validate organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // 6. Verify the signature matches the expected derivation message
    const mainWalletPubkey = new PublicKey(auth.wallet);
    const expectedMessage = createDerivationMessage(mainWalletPubkey, organizationId);
    const signatureBytes = Buffer.from(derivationSignature, "base64");

    // Verify signature is valid for this wallet + message
    const isValidSignature = nacl.sign.detached.verify(
      expectedMessage,
      signatureBytes,
      mainWalletPubkey.toBytes()
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    // 7. Verify the user is an employee of this organization
    const { hashWallet } = await import("@/lib/wallet-hash");
    const mainWalletHash = hashWallet(auth.wallet);

    const employee = await prisma.employee.findFirst({
      where: {
        organizationId,
        mainWalletHash,
        status: "ACTIVE",
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "You are not an active employee of this organization" },
        { status: 403 }
      );
    }

    // 8. Execute withdrawal based on mode
    console.log(`[Withdraw] Processing ${mode} withdrawal for employee ${employee.id}`);
    console.log(`[Withdraw] From StealthPay: ${employee.stealthPayWallet}`);
    console.log(`[Withdraw] To recipient: ${recipientAddress}`);

    if (mode === "private") {
      // Private withdrawal via Privacy Cash
      const withdrawParams: WithdrawParams = {
        derivationSignature,
        mainWalletPublicKey: auth.wallet,
        organizationId,
        recipientAddress,
        amount,
        withdrawAll: !amount,
      };

      const result: WithdrawResult = await privacyCashClient.executePrivateWithdrawal(withdrawParams);

      console.log(`[Withdraw] Privacy Cash result:`, {
        success: result.success,
        signature: result.signature,
        amount: result.withdrawnAmount,
      });

      if (result.success) {
        // Store withdrawal in database
        await prisma.withdrawal.create({
          data: {
            employeeId: employee.id,
            amount: result.withdrawnAmount || 0,
            feeAmount: result.feeAmount || 0,
            mode: "PRIVATE",
            txSignature: result.signature,
            recipient: recipientAddress.slice(0, 8) + "..." + recipientAddress.slice(-4), // Store truncated for privacy
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          signature: result.signature,
          withdrawnAmount: result.withdrawnAmount,
          feeAmount: result.feeAmount,
          mode: "private",
          message: "Private withdrawal successful. Funds sent via Privacy Cash.",
        });
      } else {
        // Store failed withdrawal attempt
        await prisma.withdrawal.create({
          data: {
            employeeId: employee.id,
            amount: amount || 0,
            feeAmount: 0,
            mode: "PRIVATE",
            recipient: recipientAddress.slice(0, 8) + "..." + recipientAddress.slice(-4),
            status: "FAILED",
          },
        });

        return NextResponse.json(
          { error: result.error || "Private withdrawal failed" },
          { status: 500 }
        );
      }
    } else {
      // Public withdrawal - direct SPL transfer with admin as fee payer
      // This is SECURE: SOL never lands in user's wallet, goes directly to network fees
      const { deriveKeypairFromSignature } = await import("@/lib/stealth-wallet");
      const { Connection, Transaction, Keypair } = await import("@solana/web3.js");
      const { createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } = await import("@solana/spl-token");

      const stealthPayKeypair = deriveKeypairFromSignature(signatureBytes);
      const { getRpcUrl } = await import("@/lib/helius");
      const connection = new Connection(getRpcUrl(), "confirmed");

      // Load admin wallet for fee paying
      const adminPrivateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
      if (!adminPrivateKey) {
        return NextResponse.json(
          { error: "Admin wallet not configured for public withdrawals" },
          { status: 500 }
        );
      }

      let adminKeypair: InstanceType<typeof Keypair>;
      try {
        // Try base58 format first
        const bs58Module = await import("bs58");
        const decoded = bs58Module.default.decode(adminPrivateKey);
        adminKeypair = Keypair.fromSecretKey(decoded);
      } catch {
        // Try JSON array format
        const keyArray = JSON.parse(adminPrivateKey);
        adminKeypair = Keypair.fromSecretKey(new Uint8Array(keyArray));
      }

      console.log(`[Withdraw] Admin wallet (fee payer): ${adminKeypair.publicKey.toBase58()}`);

      // USDC Mint
      const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

      // Get source and destination token accounts
      const sourceAta = await getAssociatedTokenAddress(USDC_MINT, stealthPayKeypair.publicKey);
      const destAta = await getAssociatedTokenAddress(USDC_MINT, recipientPubkey);

      // Check source balance
      let sourceBalance = 0;
      try {
        const sourceAccount = await connection.getTokenAccountBalance(sourceAta);
        sourceBalance = parseFloat(sourceAccount.value.uiAmountString || "0");
      } catch {
        return NextResponse.json(
          { error: "No USDC balance in StealthPay wallet" },
          { status: 400 }
        );
      }

      if (sourceBalance <= 0) {
        return NextResponse.json(
          { error: "No USDC balance in StealthPay wallet" },
          { status: 400 }
        );
      }

      // Calculate gross amount to withdraw
      const grossAmount = amount || sourceBalance;

      // Calculate StealthPay fee for public withdrawal
      const { fee: stealthPayFee, netAmount } = calculateWithdrawalFee(grossAmount, false);

      console.log(`[Withdraw] Public withdrawal fee: ${stealthPayFee} USDC (${FEES.WITHDRAWAL.PUBLIC_RATE * 100}%)`);

      // Amount going to recipient (in micro-units)
      const transferAmount = Math.floor(netAmount * 1_000_000);
      // Fee amount (in micro-units)
      const feeAmountMicro = Math.floor(stealthPayFee * 1_000_000);

      // Build transaction with ADMIN as fee payer
      const transaction = new Transaction();

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = adminKeypair.publicKey; // ADMIN PAYS FEES - no SOL to user!

      // Check if destination ATA exists, create if not (admin pays for this too)
      try {
        await getAccount(connection, destAta);
      } catch {
        // ATA doesn't exist, add create instruction - admin pays rent
        transaction.add(
          createAssociatedTokenAccountInstruction(
            adminKeypair.publicKey, // ADMIN pays for ATA creation
            destAta,
            recipientPubkey,
            USDC_MINT
          )
        );
      }

      // Add transfer instruction to recipient (StealthPay wallet authorizes)
      transaction.add(
        createTransferInstruction(
          sourceAta,
          destAta,
          stealthPayKeypair.publicKey, // StealthPay authorizes
          transferAmount
        )
      );

      // Add fee transfer to StealthPay fee wallet (if fee > 0)
      if (feeAmountMicro > 0) {
        const feeWalletAta = await getAssociatedTokenAddress(USDC_MINT, FEES.WALLET);

        // Check if fee wallet ATA exists, create if not
        try {
          await getAccount(connection, feeWalletAta);
        } catch {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              adminKeypair.publicKey, // Admin pays for ATA creation
              feeWalletAta,
              FEES.WALLET,
              USDC_MINT
            )
          );
        }

        transaction.add(
          createTransferInstruction(
            sourceAta,
            feeWalletAta,
            stealthPayKeypair.publicKey, // StealthPay authorizes
            feeAmountMicro
          )
        );
      }

      // Sign with BOTH wallets:
      // 1. Admin signs to pay for fees
      // 2. StealthPay signs to authorize the transfer
      transaction.sign(adminKeypair, stealthPayKeypair);

      // Send transaction
      const signature = await connection.sendRawTransaction(transaction.serialize());

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, "confirmed");

      console.log(`[Withdraw] Public transfer complete (admin paid fees):`, signature);

      // Store withdrawal in database
      await prisma.withdrawal.create({
        data: {
          employeeId: employee.id,
          amount: netAmount, // Net amount received by user
          feeAmount: stealthPayFee, // StealthPay fee (0.3%)
          mode: "PUBLIC",
          txSignature: signature,
          recipient: recipientAddress.slice(0, 8) + "..." + recipientAddress.slice(-4),
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        signature,
        withdrawnAmount: netAmount,
        feeAmount: stealthPayFee,
        mode: "public",
        message: `Transfer successful. Fee: ${stealthPayFee.toFixed(4)} USDC (${FEES.WITHDRAWAL.PUBLIC_RATE * 100}%)`,
      });
    }

  } catch (error: any) {
    console.error("[Withdraw] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check private balance
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const derivationSignature = searchParams.get("derivationSignature");

    if (!organizationId || !derivationSignature) {
      return NextResponse.json(
        { error: "Missing organizationId or derivationSignature" },
        { status: 400 }
      );
    }

    // Verify signature and derive keypair
    const mainWalletPubkey = new PublicKey(auth.wallet);
    const expectedMessage = createDerivationMessage(mainWalletPubkey, organizationId);
    const signatureBytes = Buffer.from(derivationSignature, "base64");

    const isValidSignature = nacl.sign.detached.verify(
      expectedMessage,
      signatureBytes,
      mainWalletPubkey.toBytes()
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    // Get keypair and check balance
    const { deriveKeypairFromSignature } = await import("@/lib/stealth-wallet");
    const keypair = deriveKeypairFromSignature(signatureBytes);

    const balance = await privacyCashClient.getPrivateBalance(keypair);

    return NextResponse.json({
      stealthPayWallet: keypair.publicKey.toBase58(),
      privatePoolBalance: balance.humanAmount,
      token: balance.token,
    });

  } catch (error: any) {
    console.error("[Withdraw] GET Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
