import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EncryptionService, getMasterKey } from "@/lib/encryption";
import { hashWallet } from "@/lib/wallet-hash";

/**
 * GET /api/me - Get current user's roles and status
 *
 * Returns:
 * - isAdmin: true if user owns an organization
 * - organization: the organization they own (if any)
 * - employments: list of organizations where they are an employee
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin of an organization
    const organization = await prisma.organization.findUnique({
      where: { adminWallet: user.wallet },
      select: {
        id: true,
        name: true,
        adminWallet: true,
        createdAt: true,
        _count: {
          select: {
            employees: {
              where: { status: "ACTIVE" },
            },
            payrolls: {
              where: { status: "COMPLETED" },
            },
          },
        },
      },
    });

    // Check if user is employee somewhere by looking up their wallet hash
    const mainWalletHash = hashWallet(user.wallet);

    const employments = await prisma.employee.findMany({
      where: {
        mainWalletHash,
        status: "ACTIVE",
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            encryptionKey: true,
          },
        },
        payments: {
          where: {
            status: "COMPLETED",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
          include: {
            payroll: {
              select: {
                id: true,
                executedAt: true,
              },
            },
          },
        },
      },
    });

    // Decrypt employment data for the employee
    const masterKey = getMasterKey();

    const decryptedEmployments = employments.map((emp) => {
      const orgKey = EncryptionService.decryptOrgKey(
        emp.organization.encryptionKey,
        masterKey
      );

      const name = EncryptionService.decrypt(emp.nameEncrypted, orgKey);
      const salary = parseFloat(EncryptionService.decrypt(emp.salaryEncrypted, orgKey));

      // Decrypt payment amounts
      const payments = emp.payments.map((payment) => {
        const amount = parseFloat(
          EncryptionService.decrypt(payment.amountEncrypted, orgKey)
        );
        return {
          id: payment.id,
          amount,
          status: payment.status,
          paidAt: payment.payroll.executedAt?.toISOString() || null,
          createdAt: payment.createdAt.toISOString(),
        };
      });

      return {
        id: emp.id,
        organizationId: emp.organization.id,
        organizationName: emp.organization.name,
        name,
        salary,
        stealthPayWallet: emp.stealthPayWallet,
        status: emp.status,
        registeredAt: emp.registeredAt?.toISOString() || null,
        recentPayments: payments,
      };
    });

    return NextResponse.json({
      wallet: user.wallet,
      isAdmin: !!organization,
      isEmployee: employments.length > 0,
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            adminWallet: organization.adminWallet,
            createdAt: organization.createdAt.toISOString(),
            activeEmployeeCount: organization._count.employees,
            completedPayrollCount: organization._count.payrolls,
          }
        : null,
      employments: decryptedEmployments,
    });
  } catch (error) {
    console.error("Get me error:", error);
    return NextResponse.json(
      { error: "Failed to get user info" },
      { status: 500 }
    );
  }
}
