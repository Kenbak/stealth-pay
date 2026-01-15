import useSWR from "swr";
import { useState } from "react";
import { useAuth } from "./use-auth";

interface Invoice {
  id: string;
  publicId: string;
  amount: number;
  tokenMint: string;
  description: string;
  dueDate: string | null;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";
  // payerWallet intentionally not stored for privacy
  paidAt: string | null;
  platformFee: number | null;
  createdAt: string;
}

interface CreateInvoiceData {
  amount: number;
  description: string;
  dueDate?: string;
  clientEmail?: string;
  tokenMint?: string;
}

const fetcher = async (url: string) => {
  const token = localStorage.getItem("auth-token");
  console.log("[INVOICES] Fetching invoices, token exists:", !!token);

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("[INVOICES] Fetch failed:", res.status, error);
    throw new Error("Failed to fetch invoices");
  }

  const data = await res.json();
  console.log("[INVOICES] Fetched:", data.invoices?.length || 0, "invoices");
  return data;
};

export function useInvoices() {
  const { isAuthenticated } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<{ invoices: Invoice[] }>(
    isAuthenticated ? "/api/invoices" : null,
    fetcher
  );

  const createInvoice = async (
    invoiceData: CreateInvoiceData
  ): Promise<{ invoice: Invoice; paymentUrl: string } | null> => {
    setIsCreating(true);
    try {
      const token = localStorage.getItem("auth-token");
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(invoiceData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create invoice");
      }

      const result = await res.json();
      mutate();
      return result;
    } catch (error) {
      console.error("Create invoice error:", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const cancelInvoice = async (publicId: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem("auth-token");
      const res = await fetch(`/api/invoices/${publicId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      if (!res.ok) {
        throw new Error("Failed to cancel invoice");
      }

      mutate();
      return true;
    } catch (error) {
      console.error("Cancel invoice error:", error);
      return false;
    }
  };

  // Calculate stats
  const invoices = data?.invoices || [];
  const pendingInvoices = invoices.filter((inv) => inv.status === "PENDING");
  const paidInvoices = invoices.filter((inv) => inv.status === "PAID");
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return {
    invoices,
    pendingInvoices,
    paidInvoices,
    totalPending,
    totalPaid,
    isLoading,
    isCreating,
    error,
    createInvoice,
    cancelInvoice,
    refresh: mutate,
  };
}
