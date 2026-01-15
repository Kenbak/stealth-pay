"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

/**
 * Hook that redirects to /dashboard if no organization exists.
 * Use this in pages that require an organization (payroll, employees, etc.)
 *
 * Returns loading state so the page can show a skeleton while checking.
 */
export function useRequireOrganization() {
  const router = useRouter();
  const { isAuthenticated, isLoading, organization, isAdmin } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // If authenticated but no org, redirect to dashboard (where they'll see SetupOrganization)
    if (isAuthenticated && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, isAdmin, router]);

  return {
    isLoading: isLoading || !isAuthenticated,
    hasOrganization: isAdmin && !!organization,
    organization,
  };
}
