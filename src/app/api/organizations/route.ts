import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EncryptionService, getMasterKey } from "@/lib/encryption";
import { createOrganizationSchema, validateInput } from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS, getClientIp, getRateLimitIdentifier } from "@/lib/rate-limit";
import { logAudit, createAuditContext } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
      select: {
        id: true,
        name: true,
        adminWallet: true,
        createdAt: true,
        _count: {
          select: { employees: true, payrolls: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ organization: null });
    }

    return NextResponse.json({
      organization: {
        ...organization,
        employeeCount: organization._count.employees,
        payrollCount: organization._count.payrolls,
      },
    });
  } catch (error) {
    console.error("Get organization error:", error);
    return NextResponse.json(
      { error: "Failed to get organization" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const auditContext = createAuditContext(request.headers);

  try {
    // Authenticate
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
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    // Check if organization already exists
    const existing = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Organization already exists for this wallet" },
        { status: 400 }
      );
    }

    // Validate input
    const body = await request.json();
    const validation = validateInput(createOrganizationSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    // Generate and encrypt organization key
    const orgKey = EncryptionService.generateKey();
    const masterKey = getMasterKey();
    const encryptedOrgKey = EncryptionService.encryptOrgKey(orgKey, masterKey);

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name,
        adminWallet: user.wallet,
        encryptionKey: encryptedOrgKey,
      },
      select: {
        id: true,
        name: true,
        adminWallet: true,
        createdAt: true,
      },
    });

    await logAudit({
      action: "ORG_CREATED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "organization",
      resourceId: organization.id,
      success: true,
      ...auditContext,
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    console.error("Create organization error:", error);

    await logAudit({
      action: "ORG_CREATED",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const auditContext = createAuditContext(request.headers);

  try {
    // Authenticate
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
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Validate input
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Organization name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: "Organization name must be less than 100 characters" },
        { status: 400 }
      );
    }

    // Update organization
    const updated = await prisma.organization.update({
      where: { id: organization.id },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        adminWallet: true,
        createdAt: true,
      },
    });

    await logAudit({
      action: "ORG_UPDATED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "organization",
      resourceId: organization.id,
      metadata: { oldName: organization.name, newName: name.trim() },
      success: true,
      ...auditContext,
    });

    return NextResponse.json({ organization: updated });
  } catch (error) {
    console.error("Update organization error:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const auditContext = createAuditContext(request.headers);

  try {
    // Authenticate
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
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            employees: true,
            payrolls: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Log before deletion
    await logAudit({
      action: "ORG_DELETED",
      actorWallet: user.wallet,
      organizationId: organization.id,
      resourceType: "organization",
      resourceId: organization.id,
      metadata: {
        name: organization.name,
        employeeCount: organization._count.employees,
        payrollCount: organization._count.payrolls,
      },
      success: true,
      ...auditContext,
    });

    // Delete organization (cascades to all related data)
    await prisma.organization.delete({
      where: { id: organization.id },
    });

    return NextResponse.json({
      success: true,
      message: "Organization and all associated data have been permanently deleted",
    });
  } catch (error) {
    console.error("Delete organization error:", error);

    await logAudit({
      action: "ORG_DELETED",
      actorWallet: null,
      organizationId: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ...auditContext,
    });

    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
