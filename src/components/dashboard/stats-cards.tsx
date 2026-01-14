"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Users, Clock, Vault, AlertCircle, AlertTriangle, CalendarPlus } from "lucide-react";
import { formatCurrency, formatSol, formatDate } from "@/lib/utils";
import { useOrganization } from "@/hooks/use-organization";
import { useEmployees } from "@/hooks/use-employees";
import { useTreasury } from "@/hooks/use-treasury";
import { usePayrolls } from "@/hooks/use-payrolls";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export function StatsCards() {
  const { organization, isLoading: orgLoading } = useOrganization();
  const { activeEmployees, totalSalary, isLoading: empLoading } = useEmployees();
  const { balance, isLoading: treasuryLoading } = useTreasury();
  const { nextPayroll, isLoading: payrollLoading } = usePayrolls();

  const isLoading = orgLoading || empLoading || treasuryLoading || payrollLoading;

  // Check if treasury has enough for payroll
  const needsFunding = balance.totalUsd < totalSalary && totalSalary > 0;

  // Check if payroll can be configured (need employees first)
  const hasEmployees = activeEmployees.length > 0;
  const hasScheduledPayroll = !!nextPayroll;

  // Calculate days until next payroll
  const daysUntilPayroll = nextPayroll?.scheduledDate
    ? Math.ceil(
        (new Date(nextPayroll.scheduledDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  // Determine next payroll display
  const getNextPayrollDisplay = () => {
    if (!hasEmployees) {
      return {
        value: "—",
        subtitle: "Add employees first",
        icon: Clock,
        color: "text-muted-foreground",
        bgColor: "bg-muted/50",
      };
    }

    if (!hasScheduledPayroll) {
      return {
        value: "Not set",
        subtitle: "Schedule a payroll →",
        icon: CalendarPlus,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        href: "/dashboard/payroll",
      };
    }

    return {
      value: nextPayroll.scheduledDate
        ? formatDate(nextPayroll.scheduledDate)
        : "Ready",
      subtitle: daysUntilPayroll !== null && daysUntilPayroll >= 0
        ? `in ${daysUntilPayroll} days`
        : "Execute now",
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      href: "/dashboard/payroll",
    };
  };

  const nextPayrollDisplay = getNextPayrollDisplay();

  const stats = [
    {
      name: "Monthly Payroll",
      value: isLoading ? null : formatCurrency(totalSalary),
      subtitle: isLoading ? null : `${activeEmployees.length} active employees`,
      icon: Wallet,
      color: "text-stealth-500",
      bgColor: "bg-stealth-500/10",
    },
    {
      name: "Active Employees",
      value: isLoading ? null : activeEmployees.length.toString(),
      subtitle: isLoading
        ? null
        : organization
        ? `in ${organization.name}`
        : "No organization",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      href: "/dashboard/employees",
    },
    {
      name: "Next Payroll",
      value: isLoading ? null : nextPayrollDisplay.value,
      subtitle: isLoading ? null : nextPayrollDisplay.subtitle,
      icon: nextPayrollDisplay.icon,
      color: nextPayrollDisplay.color,
      bgColor: nextPayrollDisplay.bgColor,
      href: nextPayrollDisplay.href,
    },
    {
      name: "Treasury",
      value: isLoading ? null : `${formatSol(balance.sol)} SOL`,
      subtitle: isLoading
        ? null
        : needsFunding
          ? "⚠️ Low funds - add more"
          : `≈ ${formatCurrency(balance.totalUsd)}`,
      icon: needsFunding ? AlertTriangle : Vault,
      color: needsFunding ? "text-yellow-500" : "text-purple-500",
      bgColor: needsFunding ? "bg-yellow-500/10" : "bg-purple-500/10",
      href: "/dashboard/treasury",
    },
  ];

  // Show setup prompt if no organization
  if (!isLoading && !organization) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Organization Yet</h3>
          <p className="text-muted-foreground text-center mb-4 max-w-md">
            Create your organization to start managing private payroll for your
            team.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const cardContent = (
          <Card className={stat.href ? "hover:border-stealth-500/50 transition-colors cursor-pointer" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-24 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </>
              )}
            </CardContent>
          </Card>
        );

        return stat.href ? (
          <Link key={stat.name} href={stat.href}>
            {cardContent}
          </Link>
        ) : (
          <div key={stat.name}>{cardContent}</div>
        );
      })}
    </div>
  );
}
