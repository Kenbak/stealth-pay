import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  EncryptionService,
  getMasterKey,
  encryptEmployeeData,
  decryptEmployeeData,
} from "@/lib/encryption";
import { createEmployeeSchema, validateInput } from "@/lib/validation";
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  getRateLimitIdentifier,
} from "@/lib/rate-limit";
import { logAudit, createAuditContext } from "@/lib/audit-log";

/**
 * GET /api/employees - List all employees for the organization
 */
export async function GET(request: NextRequest) {
  try {
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

    // Decrypt org key
    const masterKey = getMasterKey();
    const orgKey = EncryptionService.decryptOrgKey(
      organization.encryptionKey,
      masterKey
    );

    // Get employees
    const employees = await prisma.employee.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    });

    // Decrypt employee data
    const decryptedEmployees = employees.map((emp) => {
      const decrypted = decryptEmployeeData(
        {
          nameEncrypted: emp.nameEncrypted,
          salaryEncrypted: emp.salaryEncrypted,
          walletAddressEncrypted: emp.walletAddressEncrypted,
        },
        orgKey
      );

      return {
        id: emp.id,
        name: decrypted.name,
        walletAddress: decrypted.walletAddress,
        salary: decrypted.salary,
        status: emp.status,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
      };
    });

    return NextResponse.json({ employees: decryptedEmployees });
  } catch (error) {
    console.error("Get employees error:", error);
    return NextResponse.json(
      { error: "Failed to get employees" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employees - Create a new employee
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const auditContext = createAuditContext(request.headers);

  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(
      getRateLimitIdentifier(ip, user.wallet),
      RATE_LIMITS.write
    );

    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
      select: { id: true, encryptionKey: true },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found. Create one first." },
        { status: 404 }
      );
    }

    // Validate input
    const body = await request.json();
    const validation = validateInput(createEmployeeSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { name, walletAddress, salary } = validation.data;

    // Decrypt org key
    const masterKey = getMasterKey();
    const orgKey = EncryptionService.decryptOrgKey(
      organization.encryptionKey,
      masterKey
    );

    // Encrypt employee data
    const encryptedData = encryptEmployeeData(
      { name, walletAddress, salary },
      orgKey
    );

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        organizationId: organization.id,
        ...encryptedData,
      },
    });

    await logAudit({
      action: "EMPLOYEE_CREATED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "employee",
      resourceId: employee.id,
      success: true,
      // Note: We don't log salary or name for privacy
      ...auditContext,
    });

    return NextResponse.json(
      {
        employee: {
          id: employee.id,
          name,
          walletAddress,
          salary,
          status: employee.status,
          createdAt: employee.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create employee error:", error);

    await logAudit({
      action: "EMPLOYEE_CREATED",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    // Check for unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "An employee with this wallet address already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
