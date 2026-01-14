import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit, createAuditContext } from "@/lib/audit-log";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payrolls/[id] - Get a specific payroll
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payroll = await prisma.payroll.findFirst({
      where: {
        id,
        organization: { adminWallet: user.wallet },
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

    return NextResponse.json({ payroll });
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
