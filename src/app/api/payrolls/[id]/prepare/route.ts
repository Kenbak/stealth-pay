import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit, createAuditContext } from "@/lib/audit-log";
import { getMasterKey, EncryptionService } from "@/lib/encryption";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/payrolls/[id]/prepare - Prepare a payroll for execution
 *
 * This endpoint:
 * 1. Validates the payroll and authorization
 * 2. Decrypts employee wallet addresses and salaries
 * 3. Returns the payment data for client-side ShadowWire execution
 *
 * The client will then:
 * 1. Call ShadowWire API to get unsigned transactions
 * 2. User signs with their wallet
 * 3. Transactions are submitted to blockchain
 * 4. Client calls /finalize with signatures
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

    // Decrypt employee data
    const masterKey = getMasterKey();
    const orgKey = EncryptionService.decryptOrgKey(organization.encryptionKey, masterKey);

    const payments = payroll.payments.map((payment) => {
      const walletAddress = EncryptionService.decrypt(
        payment.employee.walletAddressEncrypted,
        orgKey
      );
      const salary = EncryptionService.decryptSalary(payment.amountEncrypted, orgKey);
      const name = EncryptionService.decrypt(payment.employee.nameEncrypted, orgKey);

      return {
        paymentId: payment.id,
        employeeId: payment.employeeId,
        employeeName: name,
        walletAddress,
        amount: salary,
      };
    });

    // Mark as processing
    await prisma.payroll.update({
      where: { id: payrollId },
      data: { status: "PROCESSING" },
    });

    await logAudit({
      action: "PAYROLL_PREPARED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "payroll",
      resourceId: payrollId,
      metadata: {
        paymentCount: payments.length,
        totalAmount: Number(payroll.totalAmount),
        tokenMint: payroll.tokenMint,
      },
      success: true,
      ...auditContext,
    });

    return NextResponse.json({
      payrollId,
      status: "PROCESSING",
      tokenMint: payroll.tokenMint,
      totalAmount: Number(payroll.totalAmount),
      payments,
    });

  } catch (error) {
    console.error("Prepare payroll error:", error);

    await logAudit({
      action: "PAYROLL_PREPARED",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    return NextResponse.json(
      { error: "Failed to prepare payroll" },
      { status: 500 }
    );
  }
}
