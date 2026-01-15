import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  EncryptionService,
  getMasterKey,
} from "@/lib/encryption";
import { z } from "zod";
import { logAudit, createAuditContext } from "@/lib/audit-log";

// Schema for updating employee
const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  salary: z.number().positive().optional(),
  status: z.enum(["PENDING_INVITE", "ACTIVE", "PAUSED", "TERMINATED"]).optional(),
});

/**
 * GET /api/employees/:id - Get a single employee
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const employee = await prisma.employee.findFirst({
      where: {
        id: id,
        organizationId: organization.id,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const masterKey = getMasterKey();
    const orgKey = EncryptionService.decryptOrgKey(
      organization.encryptionKey,
      masterKey
    );

    // Decrypt employee data
    const name = EncryptionService.decrypt(employee.nameEncrypted, orgKey);
    const salary = parseFloat(
      EncryptionService.decrypt(employee.salaryEncrypted, orgKey)
    );

    // Generate invite URL for pending employees
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = employee.inviteCode
      ? `${appUrl}/join/${employee.inviteCode}`
      : null;

    return NextResponse.json({
      employee: {
        id: employee.id,
        name,
        salary,
        status: employee.status,
        stealthPayWallet: employee.stealthPayWallet,
        inviteCode: employee.inviteCode,
        inviteUrl,
        inviteExpiresAt: employee.inviteExpiresAt,
        registeredAt: employee.registeredAt,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get employee error:", error);
    return NextResponse.json(
      { error: "Failed to get employee" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/employees/:id - Update an employee
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auditContext = createAuditContext(request.headers);

  try {
    const { id } = await params;
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

    const employee = await prisma.employee.findFirst({
      where: {
        id: id,
        organizationId: organization.id,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateEmployeeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, salary, status } = validation.data;

    const masterKey = getMasterKey();
    const orgKey = EncryptionService.decryptOrgKey(
      organization.encryptionKey,
      masterKey
    );

    // Build update data
    const updateData: Record<string, string> = {};

    if (status) {
      updateData.status = status;
    }

    if (name) {
      updateData.nameEncrypted = EncryptionService.encrypt(name, orgKey);
    }

    if (salary !== undefined) {
      updateData.salaryEncrypted = EncryptionService.encryptSalary(salary, orgKey);
    }

    const updated = await prisma.employee.update({
      where: { id: id },
      data: updateData,
    });

    await logAudit({
      action: "EMPLOYEE_UPDATED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "employee",
      resourceId: id,
      success: true,
      ...auditContext,
    });

    // Decrypt for response
    const decryptedName = EncryptionService.decrypt(updated.nameEncrypted, orgKey);
    const decryptedSalary = parseFloat(
      EncryptionService.decrypt(updated.salaryEncrypted, orgKey)
    );

    return NextResponse.json({
      employee: {
        id: updated.id,
        name: decryptedName,
        salary: decryptedSalary,
        status: updated.status,
        stealthPayWallet: updated.stealthPayWallet,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update employee error:", error);

    await logAudit({
      action: "EMPLOYEE_UPDATED",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/employees/:id - Delete an employee
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const employee = await prisma.employee.findFirst({
      where: {
        id: id,
        organizationId: organization.id,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    await prisma.employee.delete({
      where: { id: id },
    });

    await logAudit({
      action: "EMPLOYEE_DELETED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "employee",
      resourceId: id,
      success: true,
      ...auditContext,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete employee error:", error);

    await logAudit({
      action: "EMPLOYEE_DELETED",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
