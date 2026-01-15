import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit, createAuditContext } from "@/lib/audit-log";
import { getMasterKey, EncryptionService } from "@/lib/encryption";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/payrolls/[id]/execute - Execute a payroll
 *
 * This triggers the private payment flow:
 * 1. Validate organization has sufficient funds
 * 2. Mark payroll as PROCESSING
 * 3. For each employee payment:
 *    - Decrypt wallet address
 *    - Queue for Radr ShadowWire transfer
 * 4. Mark as COMPLETED when all transfers succeed
 *
 * NOTE: Radr ShadowWire API integration goes here
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auditContext = createAuditContext(request.headers);

  try {
    const { id: payrollId } = await params;
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
      select: { id: true, encryptionKey: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const payroll = await prisma.payroll.findFirst({
      where: {
        id: payrollId,
        organizationId: organization.id,
      },
      include: {
        payments: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!payroll) {
      return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
    }

    if (payroll.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Payroll already executed" },
        { status: 400 }
      );
    }

    if (payroll.status === "PROCESSING") {
      return NextResponse.json(
        { error: "Payroll is already processing" },
        { status: 400 }
      );
    }

    // Mark as processing
    await prisma.payroll.update({
      where: { id: payrollId },
      data: { status: "PROCESSING" },
    });

    // Decrypt employee data and prepare payments
    const masterKey = getMasterKey();
    const orgKey = EncryptionService.decryptOrgKey(organization.encryptionKey, masterKey);

    // Filter out employees without StealthPay wallet (not yet registered)
    const paymentsToProcess = payroll.payments
      .filter((payment) => {
        if (!payment.employee.stealthPayWallet) {
          console.warn(
            `[PAYROLL EXECUTE] Skipping employee ${payment.employeeId}: No StealthPay wallet registered`
          );
          return false;
        }
        if (payment.employee.status !== "ACTIVE") {
          console.warn(
            `[PAYROLL EXECUTE] Skipping employee ${payment.employeeId}: Status is ${payment.employee.status}`
          );
          return false;
        }
        return true;
      })
      .map((payment) => {
        const salary = EncryptionService.decryptSalary(payment.amountEncrypted, orgKey);

        return {
          paymentId: payment.id,
          employeeId: payment.employeeId,
          stealthPayWallet: payment.employee.stealthPayWallet!, // Use StealthPay wallet, not personal wallet
          amount: salary,
        };
      });

    // TODO: Integrate Radr ShadowWire API here
    // For now, simulate successful execution
    //
    // In production:
    // 1. For each employee, call ShadowWire API to prepare ZK transfer
    // 2. Return unsigned transactions to frontend
    // 3. User signs all transactions with Phantom
    // 4. Submit transactions to blockchain
    // 5. Update payment records with signatures

    console.log(`[PAYROLL EXECUTE] Processing ${paymentsToProcess.length} payments`);
    console.log(`[PAYROLL EXECUTE] Total: ${payroll.totalAmount} ${payroll.tokenMint}`);

    // Simulate processing delay (remove in production)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mark all payments as completed
    await prisma.$transaction([
      // Update all payments
      ...paymentsToProcess.map((p) =>
        prisma.payment.update({
          where: { id: p.paymentId },
          data: {
            status: "COMPLETED",
            // In production: withdrawTxHash: txSignature
          },
        })
      ),
      // Update payroll
      prisma.payroll.update({
        where: { id: payrollId },
        data: {
          status: "COMPLETED",
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
        paymentCount: paymentsToProcess.length,
        totalAmount: Number(payroll.totalAmount),
        tokenMint: payroll.tokenMint,
      },
      success: true,
      ...auditContext,
    });

    return NextResponse.json({
      success: true,
      payroll: {
        id: payrollId,
        status: "COMPLETED",
        executedAt: new Date().toISOString(),
        paymentsProcessed: paymentsToProcess.length,
      },
    });
  } catch (error) {
    console.error("Execute payroll error:", error);

    // Try to mark as failed
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
      { error: "Failed to execute payroll" },
      { status: 500 }
    );
  }
}
