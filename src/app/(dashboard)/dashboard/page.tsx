"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentPayrolls } from "@/components/dashboard/recent-payrolls";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SetupOrganization } from "@/components/onboarding/setup-organization";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  const { isLoading, isAdmin, isEmployee, organization, employments } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-in">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // If no org but is an employee, redirect to my-payments
  if (!isAdmin && isEmployee && employments.length > 0) {
    redirect("/dashboard/my-payments");
  }

  // No org → show create org
  if (!isAdmin || !organization) {
    return <SetupOrganization />;
  }

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="heading-1">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {organization.name}
        </p>
      </div>

      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <RecentPayrolls />
        </div>
        <div className="lg:col-span-2">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
