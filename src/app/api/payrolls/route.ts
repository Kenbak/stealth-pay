import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit, createAuditContext } from "@/lib/audit-log";
import { TOKENS } from "@/lib/utils";

/**
 * GET /api/payrolls - List all payrolls for the organization
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

    const payrolls = await prisma.payroll.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        _count: {
          select: { payments: true },
        },
      },
    });

    return NextResponse.json({
      payrolls: payrolls.map((p) => ({
        id: p.id,
        scheduledDate: p.scheduledDate?.toISOString() || null,
        totalAmount: Number(p.totalAmount),
        tokenMint: p.tokenMint,
        status: p.status,
        employeeCount: p._count.payments,
        executedAt: p.executedAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get payrolls error:", error);
    return NextResponse.json(
      { error: "Failed to get payrolls" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payrolls - Create a new payroll
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
      select: { id: true, encryptionKey: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await request.json();
    const { scheduledDate, tokenMint, employeeIds } = body;

    // Validate token
    const validMints = Object.values(TOKENS).map((t) => t.mint);
    if (!tokenMint || !validMints.includes(tokenMint)) {
      return NextResponse.json(
        { error: "Invalid token mint" },
        { status: 400 }
      );
    }

    // Get employees - only those who are ACTIVE AND have registered (stealthPayWallet)
    const whereClause: Record<string, unknown> = {
      organizationId: organization.id,
      status: "ACTIVE",
      stealthPayWallet: { not: null }, // Must have registered their wallet
    };

    if (employeeIds && employeeIds.length > 0) {
      whereClause.id = { in: employeeIds };
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
    });

    if (employees.length === 0) {
      // Check if there are pending employees
      const pendingCount = await prisma.employee.count({
        where: {
          organizationId: organization.id,
          OR: [
            { status: "PENDING_INVITE" },
            { stealthPayWallet: null },
          ],
        },
      });

      if (pendingCount > 0) {
        return NextResponse.json(
          {
            error: `No eligible employees. ${pendingCount} employee(s) haven't registered yet. They need to accept their invite first.`,
            pendingCount,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "No active employees found" },
        { status: 400 }
      );
    }

    // Calculate total from encrypted salaries
    const { getMasterKey, EncryptionService } = await import("@/lib/encryption");
    const masterKey = getMasterKey();
    const orgKey = EncryptionService.decryptOrgKey(organization.encryptionKey, masterKey);

    let totalAmount = 0;
    for (const emp of employees) {
      const salary = EncryptionService.decryptSalary(emp.salaryEncrypted, orgKey);
      totalAmount += salary;
    }

    // Create payroll with payments
    const payroll = await prisma.payroll.create({
      data: {
        organizationId: organization.id,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        totalAmount,
        tokenMint,
        status: scheduledDate ? "SCHEDULED" : "PENDING",
        payments: {
          create: employees.map((emp) => ({
            employeeId: emp.id,
            amountEncrypted: emp.salaryEncrypted,
            status: "PENDING",
          })),
        },
      },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    });

    await logAudit({
      action: "PAYROLL_CREATED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "payroll",
      resourceId: payroll.id,
      metadata: {
        employeeCount: employees.length,
        totalAmount,
        tokenMint,
        scheduledDate,
      },
      success: true,
      ...auditContext,
    });

    return NextResponse.json({
      payroll: {
        id: payroll.id,
        scheduledDate: payroll.scheduledDate?.toISOString() || null,
        totalAmount: Number(payroll.totalAmount),
        tokenMint: payroll.tokenMint,
        status: payroll.status,
        employeeCount: payroll._count.payments,
        createdAt: payroll.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create payroll error:", error);

    await logAudit({
      action: "PAYROLL_CREATED",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    return NextResponse.json(
      { error: "Failed to create payroll" },
      { status: 500 }
    );
  }
}
