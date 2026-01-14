import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit, createAuditContext } from "@/lib/audit-log";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PaymentResult {
  paymentId: string;
  signature?: string;
  success: boolean;
  error?: string;
}

/**
 * POST /api/payrolls/[id]/finalize - Finalize payroll after client execution
 *
 * Called by the client after ShadowWire transactions are signed and submitted.
 * Records transaction signatures and updates payment/payroll status.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auditContext = createAuditContext(request.headers);

  try {
    const { id: payrollId } = await params;
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { results } = body as { results: PaymentResult[] };

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "Missing payment results" },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const payroll = await prisma.payroll.findFirst({
      where: {
        id: payrollId,
        organizationId: organization.id,
      },
    });

    if (!payroll) {
      return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
    }

    // Count successes and failures
    const successfulPayments = results.filter((r) => r.success);
    const failedPayments = results.filter((r) => !r.success);

    // Update each payment record
    await prisma.$transaction([
      // Update successful payments
      ...successfulPayments.map((result) =>
        prisma.payment.update({
          where: { id: result.paymentId },
          data: {
            status: "COMPLETED",
            privateTxRef: result.signature,
          },
        })
      ),
      // Update failed payments
      ...failedPayments.map((result) =>
        prisma.payment.update({
          where: { id: result.paymentId },
          data: {
            status: "FAILED",
          },
        })
      ),
      // Update payroll status
      prisma.payroll.update({
        where: { id: payrollId },
        data: {
          status: failedPayments.length === 0 ? "COMPLETED" : "FAILED",
          executedAt: new Date(),
        },
      }),
    ]);

    await logAudit({
      action: "PAYROLL_EXECUTED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "payroll",
      resourceId: payrollId,
      metadata: {
        successCount: successfulPayments.length,
        failCount: failedPayments.length,
        totalPayments: results.length,
      },
      success: failedPayments.length === 0,
      ...auditContext,
    });

    return NextResponse.json({
      success: failedPayments.length === 0,
      payrollId,
      status: failedPayments.length === 0 ? "COMPLETED" : "FAILED",
      executedAt: new Date().toISOString(),
      summary: {
        total: results.length,
        successful: successfulPayments.length,
        failed: failedPayments.length,
      },
      failedPayments: failedPayments.map((r) => ({
        paymentId: r.paymentId,
        error: r.error,
      })),
    });

  } catch (error) {
    console.error("Finalize payroll error:", error);

    // Try to mark payroll as failed
    try {
      const { id: payrollId } = await params;
      await prisma.payroll.update({
        where: { id: payrollId },
        data: { status: "FAILED" },
      });
    } catch {
      // Ignore
    }

    await logAudit({
      action: "PAYROLL_EXECUTED",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    return NextResponse.json(
      { error: "Failed to finalize payroll" },
      { status: 500 }
    );
  }
}
