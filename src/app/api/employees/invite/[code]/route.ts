import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EncryptionService, getMasterKey } from "@/lib/encryption";
import { z } from "zod";
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
} from "@/lib/rate-limit";
import { logAudit, createAuditContext } from "@/lib/audit-log";
import { hashWallet } from "@/lib/wallet-hash";

// Schema for accepting invite
const acceptInviteSchema = z.object({
  stealthPayWallet: z.string().min(32).max(64), // Solana base58 address
  mainWallet: z.string().min(32).max(64), // Main wallet for login lookup
});

/**
 * GET /api/employees/invite/[code] - Get invite details (public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const ip = getClientIp(request.headers);

  try {
    const { code } = await params;

    // Rate limiting to prevent enumeration
    const rateLimit = checkRateLimit(`invite-view:${ip}`, RATE_LIMITS.read);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Find employee by invite code
    const employee = await prisma.employee.findUnique({
      where: { inviteCode: code },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            encryptionKey: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Check if already registered
    if (employee.registeredAt) {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 400 }
      );
    }

    // Check if expired
    if (employee.inviteExpiresAt && employee.inviteExpiresAt < new Date()) {
      return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
    }

    // Decrypt salary to show employee
    const masterKey = getMasterKey();
    const orgKey = EncryptionService.decryptOrgKey(
      employee.organization.encryptionKey,
      masterKey
    );
    const salary = parseFloat(
      EncryptionService.decrypt(employee.salaryEncrypted, orgKey)
    );
    const name = EncryptionService.decrypt(employee.nameEncrypted, orgKey);

    return NextResponse.json({
      invite: {
        organizationId: employee.organization.id,
        organizationName: employee.organization.name,
        employeeName: name,
        salary,
        expiresAt: employee.inviteExpiresAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get invite error:", error);
    return NextResponse.json(
      { error: "Failed to get invite details" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employees/invite/[code] - Accept invite and register StealthPay wallet
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const ip = getClientIp(request.headers);
  const auditContext = createAuditContext(request.headers);

  try {
    const { code } = await params;

    // Rate limiting
    const rateLimit = checkRateLimit(`invite-accept:${ip}`, RATE_LIMITS.write);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Validate input
    const body = await request.json();
    const validation = acceptInviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { stealthPayWallet, mainWallet } = validation.data;

    // Hash the main wallet for storage (never store the actual address)
    const mainWalletHash = hashWallet(mainWallet);

    // Find employee by invite code
    const employee = await prisma.employee.findUnique({
      where: { inviteCode: code },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Check if already registered
    if (employee.registeredAt) {
      return NextResponse.json(
        { error: "This invite has already been used" },
        { status: 400 }
      );
    }

    // Check if expired
    if (employee.inviteExpiresAt && employee.inviteExpiresAt < new Date()) {
      return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
    }

    // Check if this StealthPay wallet is already used by another employee
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        stealthPayWallet,
        id: { not: employee.id },
      },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: "This wallet is already registered to another employee" },
        { status: 400 }
      );
    }

    // Update employee with StealthPay wallet and mark as registered
    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        stealthPayWallet,
        mainWalletHash, // Store hash for employee login lookup
        registeredAt: new Date(),
        status: "ACTIVE",
        // Clear invite code after use (optional, for security)
        // inviteCode: null,
      },
    });

    await logAudit({
      action: "EMPLOYEE_UPDATED",
      actorWallet: stealthPayWallet, // The employee's derived wallet
      organizationId: employee.organization.id,
      resourceType: "employee",
      resourceId: employee.id,
      metadata: {
        action: "invite_accepted",
      },
      success: true,
      ...auditContext,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully registered!",
      employee: {
        id: updatedEmployee.id,
        stealthPayWallet: updatedEmployee.stealthPayWallet,
        organizationName: employee.organization.name,
        status: updatedEmployee.status,
      },
    });
  } catch (error) {
    console.error("Accept invite error:", error);

    await logAudit({
      action: "EMPLOYEE_UPDATED",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}
