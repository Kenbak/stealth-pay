import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit, createAuditContext } from "@/lib/audit-log";
import { TOKENS } from "@/lib/utils";
import { nanoid } from "nanoid";

/**
 * GET /api/invoices - List all invoices for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const status = request.nextUrl.searchParams.get("status");

    const whereClause: Record<string, unknown> = {
      organizationId: organization.id,
    };

    if (status) {
      whereClause.status = status;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      invoices: invoices.map((inv) => ({
        id: inv.id,
        publicId: inv.publicId,
        amount: Number(inv.amount),
        tokenMint: inv.tokenMint,
        description: inv.description,
        dueDate: inv.dueDate?.toISOString() || null,
        status: inv.status,
        payerWallet: inv.payerWallet,
        paidAt: inv.paidAt?.toISOString() || null,
        platformFee: inv.platformFee ? Number(inv.platformFee) : null,
        createdAt: inv.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    return NextResponse.json(
      { error: "Failed to get invoices" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices - Create a new invoice
 */
export async function POST(request: NextRequest) {
  const auditContext = createAuditContext(request.headers);

  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
      select: { id: true, name: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await request.json();
    const { amount, description, dueDate, clientEmail, tokenMint } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Default to USDC if not specified
    const mint = tokenMint || TOKENS.USDC.mint;
    const validMints = Object.values(TOKENS).map((t) => t.mint);
    if (!validMints.includes(mint)) {
      return NextResponse.json(
        { error: "Invalid token mint" },
        { status: 400 }
      );
    }

    // Generate public ID
    const publicId = `inv_${nanoid(12)}`;

    // Calculate platform fee
    const { calculateInvoiceFees } = await import("@/lib/fees");
    const fees = calculateInvoiceFees(amount);

    const invoice = await prisma.invoice.create({
      data: {
        publicId,
        organizationId: organization.id,
        amount,
        tokenMint: mint,
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        clientEmail: clientEmail || null,
        platformFee: fees.stealthFee,
        status: "PENDING",
      },
    });

    await logAudit({
      action: "INVOICE_CREATED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "invoice",
      resourceId: invoice.id,
      metadata: {
        publicId,
        amount,
        tokenMint: mint,
      },
      success: true,
      ...auditContext,
    });

    // Build payment URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentUrl = `${appUrl}/pay/${publicId}`;

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        publicId: invoice.publicId,
        amount: Number(invoice.amount),
        tokenMint: invoice.tokenMint,
        description: invoice.description,
        dueDate: invoice.dueDate?.toISOString() || null,
        status: invoice.status,
        platformFee: Number(invoice.platformFee),
        createdAt: invoice.createdAt.toISOString(),
      },
      paymentUrl,
    });
  } catch (error) {
    console.error("Create invoice error:", error);

    await logAudit({
      action: "INVOICE_CREATED",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
