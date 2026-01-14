"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useToast } from "@/components/ui/use-toast";

interface Organization {
  id: string;
  name: string;
  adminWallet: string;
  createdAt: string;
  employeeCount: number;
  payrollCount: number;
}

export function useOrganization() {
  const { getAuthHeaders, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const res = await fetch("/api/organizations", {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to fetch organization");
      }

      const data = await res.json();
      return data.organization as Organization | null;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create organization");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      localStorage.setItem("organization", JSON.stringify(data.organization));
      toast({
        title: "Organization created",
        description: `Welcome to ${data.organization.name}!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    organization: query.data,
    isLoading: query.isLoading,
    error: query.error,
    createOrganization: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
