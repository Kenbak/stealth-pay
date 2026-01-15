"use client";

import { useAuth, type Organization, type Employment } from "@/contexts/auth-context";

/**
 * Hook for user roles.
 *
 * This is now a simple wrapper around useAuth() for backwards compatibility.
 * All role data comes from the unified auth context.
 */
export function useUserRoles() {
  const {
    wallet,
    isAdmin,
    isEmployee,
    organization,
    employments,
    isLoading,
    isAuthenticated,
    refetchUser,
  } = useAuth();

  return {
    // Data
    wallet,
    isAdmin,
    isEmployee,
    organization,
    employments,

    // State
    isLoading: isLoading || !isAuthenticated,

    // Actions
    refetch: refetchUser,
  };
}

// Re-export types for convenience
export type { Organization, Employment };
