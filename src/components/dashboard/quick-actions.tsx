"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  PlayCircle,
  Wallet,
  Settings,
  AlertCircle
} from "lucide-react";
import { useEmployees } from "@/hooks/use-employees";
import { useTreasury } from "@/hooks/use-treasury";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function QuickActions() {
  const { activeEmployees, totalSalary } = useEmployees();
  const { balance } = useTreasury();

  const hasEmployees = activeEmployees.length > 0;
  const hasFunds = balance.totalUsd >= totalSalary && totalSalary > 0;
  const canRunPayroll = hasEmployees && hasFunds;

  // Reason why payroll can't run
  const payrollDisabledReason = !hasEmployees
    ? "Add employees first"
    : !hasFunds
    ? "Deposit funds first"
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common operations</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {/* Run Payroll - Primary action */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Link href={canRunPayroll ? "/dashboard/payroll" : "#"}>
                  <Button
                    variant="default"
                    className="w-full justify-start gap-3 h-auto py-3"
                    disabled={!canRunPayroll}
                  >
                    {canRunPayroll ? (
                      <PlayCircle className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">Run Payroll</p>
                      <p className="text-xs opacity-80">
                        {canRunPayroll
                          ? "Execute private payments"
                          : payrollDisabledReason}
                      </p>
                    </div>
                  </Button>
                </Link>
              </div>
            </TooltipTrigger>
            {!canRunPayroll && (
              <TooltipContent>
                <p>{payrollDisabledReason}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* Deposit Funds - Important for flow */}
        <Link href="/dashboard/treasury">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3 border-stealth-500/30 hover:bg-stealth-500/10"
          >
            <Wallet className="h-5 w-5 text-stealth-500" />
            <div className="text-left">
              <p className="font-medium">Deposit Funds</p>
              <p className="text-xs text-muted-foreground">
                Add SOL/USDC to treasury
              </p>
            </div>
          </Button>
        </Link>

        {/* Add Employee */}
        <Link href="/dashboard/employees">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
          >
            <PlusCircle className="h-5 w-5" />
            <div className="text-left">
              <p className="font-medium">Add Employee</p>
              <p className="text-xs text-muted-foreground">
                Add team member
              </p>
            </div>
          </Button>
        </Link>

        {/* Settings */}
        <Link href="/dashboard/settings">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
          >
            <Settings className="h-5 w-5" />
            <div className="text-left">
              <p className="font-medium">Settings</p>
              <p className="text-xs text-muted-foreground">
                Configure organization
              </p>
            </div>
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
