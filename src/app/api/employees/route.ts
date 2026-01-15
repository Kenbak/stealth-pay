import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  EncryptionService,
  getMasterKey,
} from "@/lib/encryption";
import { z } from "zod";
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
  getRateLimitIdentifier,
} from "@/lib/rate-limit";
import { logAudit, createAuditContext } from "@/lib/audit-log";
import { nanoid } from "nanoid";

// Schema for creating employee (now just name and salary - no wallet!)
const createEmployeeSchema = z.object({
  name: z.string().min(1).max(100),
  salary: z.number().positive(),
});

// Helper to generate invite code
function generateInviteCode(): string {
  return nanoid(12); // e.g., "V1StGXR8_Z5jdHi"
}

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
      // Decrypt name
      const name = EncryptionService.decrypt(emp.nameEncrypted, orgKey);

      // Decrypt salary
      const salary = parseFloat(
        EncryptionService.decrypt(emp.salaryEncrypted, orgKey)
      );

      // Generate invite URL for pending employees
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteUrl = emp.inviteCode
        ? `${appUrl}/join/${emp.inviteCode}`
        : null;

      // Employee is ready for payroll if ACTIVE and has registered wallet
      const isPayrollReady = emp.status === "ACTIVE" && emp.stealthPayWallet !== null;

      return {
        id: emp.id,
        name,
        salary,
        status: emp.status,
        // StealthPay wallet (set when employee registers)
        stealthPayWallet: emp.stealthPayWallet,
        // Payroll eligibility
        isPayrollReady,
        // Invite info (for pending employees)
        inviteCode: emp.inviteCode,
        inviteUrl,
        inviteExpiresAt: emp.inviteExpiresAt,
        registeredAt: emp.registeredAt,
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
 * POST /api/employees - Create a new employee with invite link
 *
 * Flow:
 * 1. Employer enters name + salary
 * 2. System generates invite code
 * 3. Employer sends invite link to employee
 * 4. Employee opens link, connects wallet, derives StealthPay wallet
 * 5. StealthPay wallet is saved to employee record
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
    const validation = createEmployeeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, salary } = validation.data;

    // Decrypt org key
    const masterKey = getMasterKey();
    const orgKey = EncryptionService.decryptOrgKey(
      organization.encryptionKey,
      masterKey
    );

    // Encrypt employee data
    const nameEncrypted = EncryptionService.encrypt(name, orgKey);
    const salaryEncrypted = EncryptionService.encrypt(salary.toString(), orgKey);

    // Generate invite code (expires in 7 days)
    const inviteCode = generateInviteCode();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create employee with pending invite status
    const employee = await prisma.employee.create({
      data: {
        organizationId: organization.id,
        nameEncrypted,
        salaryEncrypted,
        inviteCode,
        inviteExpiresAt,
        status: "PENDING_INVITE",
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

    // Generate invite URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/join/${inviteCode}`;

    return NextResponse.json(
      {
        employee: {
          id: employee.id,
          name,
          salary,
          status: employee.status,
          inviteCode,
          inviteUrl,
          inviteExpiresAt,
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

    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
