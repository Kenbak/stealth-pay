"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentPayrolls } from "@/components/dashboard/recent-payrolls";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SetupOrganization } from "@/components/onboarding/setup-organization";
import { useOrganization } from "@/hooks/use-organization";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const { organization, isLoading } = useOrganization();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Need to authenticate or create organization
  if (!isAuthenticated || !organization) {
    return <SetupOrganization />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {organization.name}
        </p>
      </div>

      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentPayrolls />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
