"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useToast } from "@/components/ui/use-toast";

export interface Employee {
  id: string;
  name: string;
  walletAddress: string;
  salary: number;
  status: "ACTIVE" | "PAUSED" | "TERMINATED";
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeInput {
  name: string;
  walletAddress: string;
  salary: number;
}

export interface UpdateEmployeeInput {
  name?: string;
  salary?: number;
  status?: "ACTIVE" | "PAUSED" | "TERMINATED";
}

export function useEmployees() {
  const { getAuthHeaders, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // List employees
  const query = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await fetch("/api/employees", {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        if (res.status === 404) return []; // No organization yet
        throw new Error("Failed to fetch employees");
      }

      const data = await res.json();
      return data.employees as Employee[];
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000, // 1 minute
  });

  // Create employee
  const createMutation = useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create employee");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast({
        title: "Employee added",
        description: "The employee has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add employee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update employee
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEmployeeInput;
    }) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update employee");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Employee updated",
        description: "Changes saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update employee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete employee
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete employee");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast({
        title: "Employee removed",
        description: "The employee has been removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove employee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate totals
  const activeEmployees = query.data?.filter((e) => e.status === "ACTIVE") || [];
  const totalSalary = activeEmployees.reduce((sum, e) => sum + e.salary, 0);

  return {
    employees: query.data || [],
    activeEmployees,
    totalSalary,
    isLoading: query.isLoading,
    error: query.error,
    createEmployee: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateEmployee: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteEmployee: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    refetch: query.refetch,
  };
}
