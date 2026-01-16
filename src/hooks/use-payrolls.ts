"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useToast } from "@/components/ui/use-toast";

export type PayrollStatus = "PENDING" | "SCHEDULED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface PayrollPayment {
  id: string;
  employeeId: string;
  amount: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  employee: {
    id: string;
    name: string;
    stealthPayWallet: string | null;
  };
}

export interface Payroll {
  id: string;
  scheduledDate: string | null;
  totalAmount: number;
  tokenMint: string;
  status: PayrollStatus;
  employeeCount: number;
  executedAt: string | null;
  createdAt: string;
}

export interface PayrollDetail extends Payroll {
  payments: PayrollPayment[];
}

export interface CreatePayrollInput {
  scheduledDate?: string;
  tokenMint: string;
  employeeIds?: string[];
}

export function usePayrolls() {
  const { getAuthHeaders, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // List payrolls
  const query = useQuery({
    queryKey: ["payrolls"],
    queryFn: async () => {
      const res = await fetch("/api/payrolls", {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        if (res.status === 404) return [];
        throw new Error("Failed to fetch payrolls");
      }

      const data = await res.json();
      return data.payrolls as Payroll[];
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  // Get next scheduled payroll
  const nextPayroll = query.data
    ?.filter((p) => p.status === "SCHEDULED" || p.status === "PENDING")
    .sort((a, b) => {
      const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Infinity;
      const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Infinity;
      return dateA - dateB;
    })[0] || null;

  // Pending payrolls (ready to execute)
  const pendingPayrolls = query.data?.filter(
    (p) => p.status === "PENDING" || p.status === "SCHEDULED"
  ) || [];

  // Completed payrolls
  const completedPayrolls = query.data?.filter(
    (p) => p.status === "COMPLETED"
  ) || [];

  // Recent completed payrolls
  const recentPayrolls = completedPayrolls
    .sort((a, b) =>
      new Date(b.executedAt || b.createdAt).getTime() -
      new Date(a.executedAt || a.createdAt).getTime()
    )
    .slice(0, 3);

  // Create payroll
  const createMutation = useMutation({
    mutationFn: async (input: CreatePayrollInput) => {
      const res = await fetch("/api/payrolls", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create payroll");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      toast({
        title: "Payroll created",
        description: "Payroll has been scheduled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create payroll",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Execute payroll
  const executeMutation = useMutation({
    mutationFn: async (payrollId: string) => {
      const res = await fetch(`/api/payrolls/${payrollId}/execute`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to execute payroll");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      queryClient.invalidateQueries({ queryKey: ["treasury"] });
      toast({
        title: "Payroll executed",
        description: "Private payments have been sent!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to execute payroll",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel payroll
  const cancelMutation = useMutation({
    mutationFn: async (payrollId: string) => {
      const res = await fetch(`/api/payrolls/${payrollId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to cancel payroll");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      toast({
        title: "Payroll cancelled",
        description: "The payroll has been cancelled",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to cancel payroll",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get payroll detail
  const getPayrollDetail = async (payrollId: string): Promise<PayrollDetail | null> => {
    try {
      const res = await fetch(`/api/payrolls/${payrollId}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return data.payroll as PayrollDetail;
    } catch {
      return null;
    }
  };

  return {
    payrolls: query.data || [],
    nextPayroll,
    pendingPayrolls,
    completedPayrolls,
    recentPayrolls,
    isLoading: query.isLoading,
    error: query.error,
    createPayroll: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    executePayroll: executeMutation.mutate,
    isExecuting: executeMutation.isPending,
    executeError: executeMutation.error,
    cancelPayroll: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
    refetch: query.refetch,
    getPayrollDetail,
  };
}
