import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit, createAuditContext } from "@/lib/audit-log";
import {
  EncryptionService,
  getMasterKey,
} from "@/lib/encryption";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payrolls/[id] - Get a specific payroll with decrypted payment details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organization with encryption key
    const organization = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
      select: { id: true, encryptionKey: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const payroll = await prisma.payroll.findFirst({
      where: {
        id,
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

    // Decrypt org key
    const masterKey = getMasterKey();
    const orgKey = EncryptionService.decryptOrgKey(
      organization.encryptionKey,
      masterKey
    );

    // Decrypt payment and employee data
    const decryptedPayments = payroll.payments.map((payment) => {
      const name = EncryptionService.decrypt(payment.employee.nameEncrypted, orgKey);
      const amount = EncryptionService.decryptSalary(payment.amountEncrypted, orgKey);

      return {
        id: payment.id,
        employeeId: payment.employeeId,
        amount,
        status: payment.status,
        employee: {
          id: payment.employee.id,
          name,
          // Use StealthPay wallet (employer sees this, not the real wallet)
          stealthPayWallet: payment.employee.stealthPayWallet,
          employeeStatus: payment.employee.status,
        },
      };
    });

    return NextResponse.json({
      payroll: {
        id: payroll.id,
        scheduledDate: payroll.scheduledDate,
        totalAmount: Number(payroll.totalAmount),
        tokenMint: payroll.tokenMint,
        status: payroll.status,
        executedAt: payroll.executedAt,
        createdAt: payroll.createdAt,
        employeeCount: payroll.payments.length,
        payments: decryptedPayments,
      },
    });
  } catch (error) {
    console.error("Get payroll error:", error);
    return NextResponse.json(
      { error: "Failed to get payroll" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/payrolls/[id] - Update payroll status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auditContext = createAuditContext(request.headers);

  try {
    const { id } = await params;
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

    const payroll = await prisma.payroll.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!payroll) {
      return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !["PENDING", "FAILED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Only PENDING or FAILED allowed." },
        { status: 400 }
      );
    }

    await prisma.payroll.update({
      where: { id },
      data: { status },
    });

    await logAudit({
      action: status === "FAILED" ? "PAYROLL_FAILED" : "PAYROLL_CANCELLED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "payroll",
      resourceId: id,
      metadata: { newStatus: status },
      success: true,
      ...auditContext,
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Update payroll status error:", error);
    return NextResponse.json(
      { error: "Failed to update payroll status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payrolls/[id] - Cancel/delete a pending payroll
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auditContext = createAuditContext(request.headers);

  try {
    const { id } = await params;
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

    const payroll = await prisma.payroll.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!payroll) {
      return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
    }

    if (payroll.status === "COMPLETED" || payroll.status === "PROCESSING") {
      return NextResponse.json(
        { error: "Cannot cancel a completed or processing payroll" },
        { status: 400 }
      );
    }

    // Delete payments and payroll
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { payrollId: id } }),
      prisma.payroll.delete({ where: { id } }),
    ]);

    await logAudit({
      action: "PAYROLL_CANCELLED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "payroll",
      resourceId: id,
      success: true,
      ...auditContext,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete payroll error:", error);
    return NextResponse.json(
      { error: "Failed to delete payroll" },
      { status: 500 }
    );
  }
}
