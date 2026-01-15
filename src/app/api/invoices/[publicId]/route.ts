import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit, createAuditContext } from "@/lib/audit-log";

// Simple in-memory rate limiter for public invoice lookups
// Prevents enumeration attacks
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000);

/**
 * GET /api/invoices/[publicId] - Get invoice details
 * Public access allowed for payment page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;

    // Rate limit public requests
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
               request.headers.get("x-real-ip") ||
               "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Check if this is a public request (no auth) or authenticated
    const user = await getAuthUser(request).catch(() => null);

    const invoice = await prisma.invoice.findUnique({
      where: { publicId },
      include: {
        organization: {
          select: {
            name: true,
            adminWallet: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // If authenticated, verify ownership for full details
    if (user) {
      const isOwner = invoice.organization.adminWallet === user.wallet;

      if (isOwner) {
        // Return full details for owner
        return NextResponse.json({
          invoice: {
            id: invoice.id,
            publicId: invoice.publicId,
            amount: Number(invoice.amount),
            tokenMint: invoice.tokenMint,
            description: invoice.description,
            dueDate: invoice.dueDate?.toISOString() || null,
            status: invoice.status,
            payerWallet: invoice.payerWallet,
            txSignature: invoice.txSignature,
            paidAt: invoice.paidAt?.toISOString() || null,
            platformFee: invoice.platformFee ? Number(invoice.platformFee) : null,
            clientEmail: invoice.clientEmail,
            createdAt: invoice.createdAt.toISOString(),
            organization: {
              name: invoice.organization.name,
            },
          },
        });
      }
    }

    // Public view - limited details for payment
    return NextResponse.json({
      invoice: {
        publicId: invoice.publicId,
        amount: Number(invoice.amount),
        tokenMint: invoice.tokenMint,
        description: invoice.description,
        dueDate: invoice.dueDate?.toISOString() || null,
        status: invoice.status,
        recipientWallet: invoice.organization.adminWallet,
        organization: {
          name: invoice.organization.name,
        },
      },
    });
  } catch (error) {
    console.error("Get invoice error:", error);
    return NextResponse.json(
      { error: "Failed to get invoice" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/invoices/[publicId] - Update invoice status (owner only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const auditContext = createAuditContext(request.headers);

  try {
    const { publicId } = await params;
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Verify ownership
    if (invoice.organization.adminWallet !== user.wallet) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    // Only allow cancellation if pending
    if (status === "CANCELLED" && invoice.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only cancel pending invoices" },
        { status: 400 }
      );
    }

    const updated = await prisma.invoice.update({
      where: { publicId },
      data: { status },
    });

    await logAudit({
      action: "INVOICE_UPDATED",
      actorWallet: user.wallet,
      organizationId: invoice.organization.id,
      resourceType: "invoice",
      resourceId: invoice.id,
      metadata: { status },
      success: true,
      ...auditContext,
    });

    return NextResponse.json({
      invoice: {
        id: updated.id,
        publicId: updated.publicId,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error("Update invoice error:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}
