import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  EncryptionService,
  getMasterKey,
  encryptEmployeeData,
  decryptEmployeeData,
} from "@/lib/encryption";
import { updateEmployeeSchema, validateInput } from "@/lib/validation";
import { logAudit, createAuditContext } from "@/lib/audit-log";

/**
 * GET /api/employees/:id - Get a single employee
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const employee = await prisma.employee.findFirst({
      where: {
        id: params.id,
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

    const decrypted = decryptEmployeeData(
      {
        nameEncrypted: employee.nameEncrypted,
        salaryEncrypted: employee.salaryEncrypted,
        walletAddressEncrypted: employee.walletAddressEncrypted,
      },
      orgKey
    );

    return NextResponse.json({
      employee: {
        id: employee.id,
        ...decrypted,
        status: employee.status,
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
  { params }: { params: { id: string } }
) {
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

    const employee = await prisma.employee.findFirst({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateInput(updateEmployeeSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
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
      where: { id: params.id },
      data: updateData,
    });

    await logAudit({
      action: "EMPLOYEE_UPDATED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "employee",
      resourceId: params.id,
      success: true,
      ...auditContext,
    });

    // Decrypt for response
    const decrypted = decryptEmployeeData(
      {
        nameEncrypted: updated.nameEncrypted,
        salaryEncrypted: updated.salaryEncrypted,
        walletAddressEncrypted: updated.walletAddressEncrypted,
      },
      orgKey
    );

    return NextResponse.json({
      employee: {
        id: updated.id,
        ...decrypted,
        status: updated.status,
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
  { params }: { params: { id: string } }
) {
  const auditContext = createAuditContext(request.headers);

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

    const employee = await prisma.employee.findFirst({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    await prisma.employee.delete({
      where: { id: params.id },
    });

    await logAudit({
      action: "EMPLOYEE_DELETED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "employee",
      resourceId: params.id,
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
