import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit, createAuditContext } from "@/lib/audit-log";
import { getConnection } from "@/lib/solana";

/**
 * POST /api/invoices/[publicId]/pay - Mark invoice as paid
 * Called after client completes the ShadowWire transfer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const auditContext = createAuditContext(request.headers);

  try {
    const { publicId } = await params;
    const body = await request.json();
    const { txSignature } = body;

    // Note: payerWallet intentionally NOT required or stored for privacy
    if (!txSignature) {
      return NextResponse.json(
        { error: "txSignature is required" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { publicId },
      include: {
        organization: {
          select: {
            id: true,
            adminWallet: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status !== "PENDING") {
      return NextResponse.json(
        { error: `Invoice is already ${invoice.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // SECURITY: Check if this transaction signature was already used
    const existingWithTx = await prisma.invoice.findFirst({
      where: { txSignature },
    });

    if (existingWithTx) {
      console.warn("[INVOICE_PAY] Transaction signature already used:", txSignature);
      return NextResponse.json(
        { error: "This transaction has already been used for another payment" },
        { status: 400 }
      );
    }

    // Also check treasury transactions
    const existingTreasury = await prisma.treasuryTransaction.findUnique({
      where: { txHash: txSignature },
    });

    if (existingTreasury) {
      console.warn("[INVOICE_PAY] Transaction already in treasury:", txSignature);
      return NextResponse.json(
        { error: "This transaction has already been recorded" },
        { status: 400 }
      );
    }

    // SECURITY: Verify the transaction exists and is confirmed on-chain
    try {
      const connection = getConnection();
      const txInfo = await connection.getTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

      if (!txInfo) {
        console.warn("[INVOICE_PAY] Transaction not found on-chain:", txSignature);
        return NextResponse.json(
          { error: "Transaction not found or not yet confirmed. Please wait and try again." },
          { status: 400 }
        );
      }

      // Check transaction was successful (no errors)
      if (txInfo.meta?.err) {
        console.warn("[INVOICE_PAY] Transaction failed on-chain:", txSignature, txInfo.meta.err);
        return NextResponse.json(
          { error: "Transaction failed on-chain" },
          { status: 400 }
        );
      }

      console.log("[INVOICE_PAY] Transaction verified on-chain:", {
        signature: txSignature,
        slot: txInfo.slot,
        blockTime: txInfo.blockTime,
      });

      // Note: Full amount/recipient verification would require parsing the transaction
      // For ShadowWire transfers, the amounts are hidden (ZK), so we trust the SDK
      // The critical check is that the transaction exists and succeeded
    } catch (verifyError) {
      console.error("[INVOICE_PAY] Transaction verification error:", verifyError);
      // Don't fail completely - allow retry if it's a transient RPC error
      return NextResponse.json(
        { error: "Could not verify transaction. Please try again." },
        { status: 400 }
      );
    }

    // Update invoice as paid
    // Note: payerWallet NOT stored for privacy
    const updated = await prisma.invoice.update({
      where: { publicId },
      data: {
        status: "PAID",
        txSignature,
        paidAt: new Date(),
      },
    });

    // Record treasury transaction
    await prisma.treasuryTransaction.create({
      data: {
        organizationId: invoice.organization.id,
        type: "INVOICE_IN",
        amount: invoice.amount,
        tokenMint: invoice.tokenMint,
        txHash: txSignature,
        feeAmount: invoice.platformFee,
      },
    });

    await logAudit({
      action: "INVOICE_PAID",
      actorWallet: null, // Privacy: payer wallet not logged
      organizationId: invoice.organization.id,
      resourceType: "invoice",
      resourceId: invoice.id,
      metadata: {
        amount: Number(invoice.amount),
        txSignature,
        // payerWallet intentionally NOT logged for privacy
      },
      success: true,
      ...auditContext,
    });

    return NextResponse.json({
      success: true,
      invoice: {
        publicId: updated.publicId,
        status: updated.status,
        paidAt: updated.paidAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Pay invoice error:", error);

    await logAudit({
      action: "INVOICE_PAID",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
