"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useToast } from "@/components/ui/use-toast";

export type EmployeeStatus = "PENDING_INVITE" | "ACTIVE" | "PAUSED" | "TERMINATED";

export interface Employee {
  id: string;
  name: string;
  salary: number;
  status: EmployeeStatus;
  // StealthPay wallet (set when employee registers via invite)
  stealthPayWallet: string | null;
  // Payroll eligibility (true if ACTIVE and has registered wallet)
  isPayrollReady: boolean;
  // Invite info (for pending employees)
  inviteCode: string | null;
  inviteUrl: string | null;
  inviteExpiresAt: string | null;
  registeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeInput {
  name: string;
  salary: number;
  // Note: walletAddress removed - employee registers their own wallet via invite
}

export interface UpdateEmployeeInput {
  name?: string;
  salary?: number;
  status?: EmployeeStatus;
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast({
        title: "Employee added",
        description: data.employee?.inviteUrl
          ? "Invite link generated. Share it with the employee."
          : "The employee has been added successfully",
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

  // Calculate totals and filter employees
  const allEmployees = query.data || [];
  const activeEmployees = allEmployees.filter((e) => e.status === "ACTIVE");
  const payrollReadyEmployees = allEmployees.filter((e) => e.isPayrollReady);
  const pendingInviteEmployees = allEmployees.filter((e) => e.status === "PENDING_INVITE");

  const totalSalary = activeEmployees.reduce((sum, e) => sum + e.salary, 0);
  const payrollReadySalary = payrollReadyEmployees.reduce((sum, e) => sum + e.salary, 0);

  return {
    employees: allEmployees,
    activeEmployees,
    payrollReadyEmployees,
    pendingInviteEmployees,
    totalSalary,
    payrollReadySalary,
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
