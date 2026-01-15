"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { usePayrolls } from "@/hooks/use-payrolls";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  ArrowRight,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { USDCIcon } from "@/components/icons/token-icons";

const statusConfig: Record<string, {
  label: string;
  icon: React.ReactNode;
  className: string
}> = {
  PENDING: {
    label: "Ready",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-blue-500/10 text-blue-500",
  },
  SCHEDULED: {
    label: "Scheduled",
    icon: <Calendar className="h-3 w-3" />,
    className: "bg-amber-500/10 text-amber-500",
  },
  PROCESSING: {
    label: "Processing",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: "bg-yellow-500/10 text-yellow-500",
  },
  COMPLETED: {
    label: "Completed",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-teal-500/10 text-teal-500",
  },
  FAILED: {
    label: "Failed",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-red-500/10 text-red-500",
  },
};

export function RecentPayrolls() {
  const { recentPayrolls, isLoading, completedPayrolls } = usePayrolls();

  // Calculate total paid
  const totalPaid = completedPayrolls.reduce((sum, p) => sum + p.totalAmount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Recent Payrolls</CardTitle>
          <CardDescription>Latest payroll activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="font-display">Recent Payrolls</CardTitle>
            <CardDescription>Latest payroll activity</CardDescription>
          </div>
          {totalPaid > 0 && (
            <div className="text-right">
              <p className="text-lg font-bold text-amber-500">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-muted-foreground">total paid</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recentPayrolls.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-7 w-7 opacity-50" />
            </div>
            <p className="font-medium">No payrolls yet</p>
            <p className="text-sm mt-1 mb-4">
              Run your first payroll to see history
            </p>
            <Link href="/dashboard/payroll">
              <Button variant="outline" size="sm">
                Go to Payroll
                <ArrowRight className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPayrolls.map((payroll) => {
              const config = statusConfig[payroll.status] || statusConfig.PENDING;
              const displayDate = payroll.executedAt || payroll.createdAt;

              return (
                <Link
                  key={payroll.id}
                  href="/dashboard/payroll"
                  className="flex items-center justify-between p-3 rounded-xl border hover:bg-accent/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <USDCIcon size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(displayDate), "MMM d, yyyy")}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {payroll.employeeCount} employee{payroll.employeeCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(payroll.totalAmount)}</p>
                    </div>
                    <Badge className={`${config.className} gap-1`}>
                      {config.icon}
                      {config.label}
                    </Badge>
                  </div>
                </Link>
              );
            })}

            {/* View all link */}
            <Link
              href="/dashboard/payroll"
              className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View all payrolls
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
