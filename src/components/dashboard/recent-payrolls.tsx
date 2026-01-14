"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Clock } from "lucide-react";

interface Payroll {
  id: string;
  date: string;
  totalAmount: number;
  employeeCount: number;
  status: string;
  token: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500",
  PROCESSING: "bg-blue-500/10 text-blue-500",
  COMPLETED: "bg-stealth-500/10 text-stealth-500",
  FAILED: "bg-destructive/10 text-destructive",
};

export function RecentPayrolls() {
  const { getAuthHeaders, isAuthenticated } = useAuth();

  const { data: payrolls, isLoading } = useQuery({
    queryKey: ["recent-payrolls"],
    queryFn: async () => {
      const res = await fetch("/api/payrolls?limit=3", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.payrolls as Payroll[];
    },
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Payrolls</CardTitle>
          <CardDescription>Your last 3 payroll executions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Payrolls</CardTitle>
        <CardDescription>Your last 3 payroll executions</CardDescription>
      </CardHeader>
      <CardContent>
        {!payrolls || payrolls.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No payrolls yet</p>
            <p className="text-sm">
              Add employees and run your first payroll to see history here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payrolls.map((payroll) => (
              <div
                key={payroll.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium">{formatDate(payroll.date)}</p>
                  <p className="text-sm text-muted-foreground">
                    {payroll.employeeCount} employees
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold">
                    {formatCurrency(payroll.totalAmount)} {payroll.token}
                  </p>
                  <Badge
                    variant="secondary"
                    className={statusColors[payroll.status] || ""}
                  >
                    {payroll.status.toLowerCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
