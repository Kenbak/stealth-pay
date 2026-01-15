"use client";

import { useAuth, type Organization } from "@/contexts/auth-context";

/**
 * Hook for organization data.
 *
 * This is now a simple wrapper around useAuth() for backwards compatibility.
 * All organization data comes from the unified auth context.
 */
export function useOrganization() {
  const {
    organization,
    isAdmin,
    isLoading,
    isAuthenticated,
    setOrganization,
    refetchUser,
    getAuthHeaders,
  } = useAuth();

  // Create organization mutation
  const createOrganization = async (name: string): Promise<Organization | null> => {
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create organization");
      }

      const data = await res.json();

      // Update auth context immediately
      setOrganization(data.organization);

      return data.organization;
    } catch (error) {
      console.error("Create organization error:", error);
      throw error;
    }
  };

  return {
    organization,
    isAdmin,
    isLoading: isLoading || !isAuthenticated,
    createOrganization,
    refetch: refetchUser,
  };
}

// Re-export Organization type for convenience
export type { Organization };
