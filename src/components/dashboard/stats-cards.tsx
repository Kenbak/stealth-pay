"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Users, Clock, Vault, AlertCircle, AlertTriangle, CalendarPlus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
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

  // Check if treasury (pool) has enough for payroll - USDC only
  const needsFunding = balance.poolUsdc < totalSalary && totalSalary > 0;

  // Treasury display - USDC only (simplified UX)
  const treasuryDisplay = `${balance.poolUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`;

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
        iconBg: "bg-muted",
        iconColor: "text-muted-foreground",
      };
    }

    if (!hasScheduledPayroll) {
      return {
        value: "Not set",
        subtitle: "Schedule a payroll →",
        icon: CalendarPlus,
        iconBg: "bg-gradient-to-br from-amber-500/10 to-amber-500/5",
        iconColor: "text-amber-500",
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
      iconBg: "bg-gradient-to-br from-amber-500/10 to-amber-500/5",
      iconColor: "text-amber-500",
      href: "/dashboard/payroll",
    };
  };

  const nextPayrollDisplay = getNextPayrollDisplay();

  const stats = [
    {
      name: "Treasury Balance",
      value: isLoading ? null : treasuryDisplay,
      subtitle: isLoading
        ? null
        : needsFunding
          ? "Low funds"
          : "Ready for payroll",
      icon: needsFunding ? AlertTriangle : Vault,
      iconBg: needsFunding
        ? "bg-gradient-to-br from-orange-500/10 to-orange-500/5"
        : "bg-gradient-to-br from-amber-500/10 to-amber-500/5",
      iconColor: needsFunding ? "text-orange-500" : "text-amber-500",
      valueColor: needsFunding ? "text-orange-500" : "text-amber-500",
      href: "/dashboard/treasury",
      highlight: true,
    },
    {
      name: "Active Employees",
      value: isLoading ? null : activeEmployees.length.toString(),
      subtitle: isLoading ? null : "team members",
      icon: Users,
      iconBg: "bg-gradient-to-br from-teal-500/10 to-teal-500/5",
      iconColor: "text-teal-500",
      href: "/dashboard/employees",
    },
    {
      name: "Monthly Payroll",
      value: isLoading ? null : formatCurrency(totalSalary),
      subtitle: isLoading ? null : "total salaries",
      icon: Wallet,
      iconBg: "bg-gradient-to-br from-violet-500/10 to-violet-500/5",
      iconColor: "text-violet-500",
    },
    {
      name: "Next Payroll",
      value: isLoading ? null : nextPayrollDisplay.value,
      subtitle: isLoading ? null : nextPayrollDisplay.subtitle,
      icon: nextPayrollDisplay.icon,
      iconBg: nextPayrollDisplay.iconBg,
      iconColor: nextPayrollDisplay.iconColor,
      href: nextPayrollDisplay.href,
    },
  ];

  // Show setup prompt if no organization
  if (!isLoading && !organization) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger">
      {stats.map((stat) => {
        const cardContent = (
          <Card className={`group relative overflow-hidden ${stat.href ? "cursor-pointer" : ""} ${stat.highlight ? "border-amber-500/20" : ""}`}>
            {/* Subtle highlight gradient for primary card */}
            {stat.highlight && (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent pointer-events-none" />
            )}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <div className={`p-2.5 rounded-xl ${stat.iconBg} transition-all group-hover:scale-110`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="relative">
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-24 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </>
              ) : (
                <>
                  <div className={`text-2xl font-display font-bold ${stat.valueColor || ""}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
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
