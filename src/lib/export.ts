/**
 * Export utilities for payroll data
 * Supports CSV and JSON formats for accounting purposes
 */

import { formatCurrency } from "./utils";
import { calculatePayrollFees } from "./fees";

export interface PayrollExportData {
  id: string;
  status: string;
  employeeCount: number;
  totalAmount: number;
  scheduledDate: string | null;
  executedAt: string | null;
  createdAt: string;
  tokenMint: string;
}

export interface PayrollExportRow {
  // Basic info
  payrollId: string;
  status: string;
  employees: number;

  // Amounts
  salaries: string;
  stealthPayFee: string;
  relayerFee: string;
  totalCost: string;

  // Dates
  createdAt: string;
  scheduledDate: string;
  executedAt: string;

  // Token
  currency: string;
}

/**
 * Transform payroll data for export
 */
function transformPayrollForExport(payroll: PayrollExportData): PayrollExportRow {
  const fees = calculatePayrollFees(payroll.totalAmount);

  return {
    payrollId: payroll.id,
    status: payroll.status,
    employees: payroll.employeeCount,
    salaries: fees.salaries.toFixed(2),
    stealthPayFee: fees.stealthFee.toFixed(2),
    relayerFee: fees.shadowwireFee.toFixed(2),
    totalCost: fees.totalCost.toFixed(2),
    createdAt: payroll.createdAt ? new Date(payroll.createdAt).toISOString() : "",
    scheduledDate: payroll.scheduledDate ? new Date(payroll.scheduledDate).toISOString() : "",
    executedAt: payroll.executedAt ? new Date(payroll.executedAt).toISOString() : "",
    currency: "USDC",
  };
}

/**
 * Export payrolls to CSV format
 */
export function exportPayrollsToCSV(payrolls: PayrollExportData[]): string {
  const headers = [
    "Payroll ID",
    "Status",
    "Employees",
    "Salaries (USDC)",
    "StealthPay Fee (USDC)",
    "Relayer Fee (USDC)",
    "Total Cost (USDC)",
    "Created At",
    "Scheduled Date",
    "Executed At",
    "Currency",
  ];

  const rows = payrolls.map(transformPayrollForExport);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => [
      row.payrollId,
      row.status,
      row.employees,
      row.salaries,
      row.stealthPayFee,
      row.relayerFee,
      row.totalCost,
      row.createdAt,
      row.scheduledDate,
      row.executedAt,
      row.currency,
    ].join(","))
  ].join("\n");

  return csvContent;
}

/**
 * Export payrolls to JSON format
 */
export function exportPayrollsToJSON(payrolls: PayrollExportData[]): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    totalPayrolls: payrolls.length,
    summary: {
      totalSalariesPaid: payrolls
        .filter(p => p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.totalAmount, 0),
      totalEmployeesPaid: payrolls
        .filter(p => p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.employeeCount, 0),
      completedPayrolls: payrolls.filter(p => p.status === "COMPLETED").length,
      pendingPayrolls: payrolls.filter(p => p.status === "PENDING" || p.status === "SCHEDULED").length,
      failedPayrolls: payrolls.filter(p => p.status === "FAILED").length,
    },
    payrolls: payrolls.map(payroll => {
      const fees = calculatePayrollFees(payroll.totalAmount);
      return {
        id: payroll.id,
        status: payroll.status,
        employeeCount: payroll.employeeCount,
        amounts: {
          salaries: fees.salaries,
          stealthPayFee: fees.stealthFee,
          stealthPayFeeRate: `${fees.stealthFeeRate}%`,
          relayerFee: fees.shadowwireFee,
          relayerFeeRate: `${fees.shadowwireFeeRate}%`,
          totalCost: fees.totalCost,
        },
        dates: {
          createdAt: payroll.createdAt,
          scheduledDate: payroll.scheduledDate,
          executedAt: payroll.executedAt,
        },
        currency: "USDC",
      };
    }),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download file utility
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export and download payrolls as CSV
 */
export function downloadPayrollsCSV(payrolls: PayrollExportData[], orgName?: string) {
  const csv = exportPayrollsToCSV(payrolls);
  const date = new Date().toISOString().split("T")[0];
  const filename = orgName
    ? `${orgName.toLowerCase().replace(/\s+/g, "-")}-payrolls-${date}.csv`
    : `payrolls-${date}.csv`;
  downloadFile(csv, filename, "text/csv");
}

/**
 * Export and download payrolls as JSON
 */
export function downloadPayrollsJSON(payrolls: PayrollExportData[], orgName?: string) {
  const json = exportPayrollsToJSON(payrolls);
  const date = new Date().toISOString().split("T")[0];
  const filename = orgName
    ? `${orgName.toLowerCase().replace(/\s+/g, "-")}-payrolls-${date}.json`
    : `payrolls-${date}.json`;
  downloadFile(json, filename, "application/json");
}

// ============================================
// DETAILED EXPORT (with employee breakdown)
// ============================================

export interface PayrollPaymentExport {
  employeeId: string;
  employeeName: string;
  walletAddress: string;
  amount: number;
  status: string;
}

export interface PayrollDetailExport extends PayrollExportData {
  payments: PayrollPaymentExport[];
}

/**
 * Export detailed payroll to CSV (one row per employee payment)
 */
export function exportPayrollDetailToCSV(payroll: PayrollDetailExport): string {
  const fees = calculatePayrollFees(payroll.totalAmount);

  const headers = [
    "Payroll ID",
    "Payroll Date",
    "Employee Name",
    "Wallet Address",
    "Amount (USDC)",
    "Payment Status",
  ];

  const rows = payroll.payments.map(payment => [
    payroll.id,
    payroll.executedAt ? new Date(payroll.executedAt).toISOString() : new Date(payroll.createdAt).toISOString(),
    `"${payment.employeeName}"`, // Quote in case of commas
    payment.walletAddress,
    payment.amount.toFixed(2),
    payment.status,
  ].join(","));

  // Add summary row
  const summaryRows = [
    "",
    "SUMMARY",
    `Total Salaries,${fees.salaries.toFixed(2)}`,
    `StealthPay Fee (${fees.stealthFeeRate}%),${fees.stealthFee.toFixed(2)}`,
    `Relayer Fee (${fees.shadowwireFeeRate}%),${fees.shadowwireFee.toFixed(2)}`,
    `Total Cost,${fees.totalCost.toFixed(2)}`,
  ];

  return [headers.join(","), ...rows, ...summaryRows].join("\n");
}

/**
 * Export detailed payroll to JSON
 */
export function exportPayrollDetailToJSON(payroll: PayrollDetailExport): string {
  const fees = calculatePayrollFees(payroll.totalAmount);

  const exportData = {
    exportedAt: new Date().toISOString(),
    payroll: {
      id: payroll.id,
      status: payroll.status,
      dates: {
        createdAt: payroll.createdAt,
        scheduledDate: payroll.scheduledDate,
        executedAt: payroll.executedAt,
      },
      summary: {
        employeeCount: payroll.employeeCount,
        salaries: fees.salaries,
        stealthPayFee: fees.stealthFee,
        stealthPayFeeRate: `${fees.stealthFeeRate}%`,
        relayerFee: fees.shadowwireFee,
        relayerFeeRate: `${fees.shadowwireFeeRate}%`,
        totalCost: fees.totalCost,
      },
      payments: payroll.payments.map(payment => ({
        employeeId: payment.employeeId,
        employeeName: payment.employeeName,
        walletAddress: payment.walletAddress,
        amount: payment.amount,
        status: payment.status,
      })),
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download detailed payroll as CSV
 */
export function downloadPayrollDetailCSV(payroll: PayrollDetailExport, orgName?: string) {
  const csv = exportPayrollDetailToCSV(payroll);
  const date = payroll.executedAt
    ? new Date(payroll.executedAt).toISOString().split("T")[0]
    : new Date(payroll.createdAt).toISOString().split("T")[0];
  const filename = orgName
    ? `${orgName.toLowerCase().replace(/\s+/g, "-")}-payroll-${date}-detail.csv`
    : `payroll-${date}-detail.csv`;
  downloadFile(csv, filename, "text/csv");
}

/**
 * Download detailed payroll as JSON
 */
export function downloadPayrollDetailJSON(payroll: PayrollDetailExport, orgName?: string) {
  const json = exportPayrollDetailToJSON(payroll);
  const date = payroll.executedAt
    ? new Date(payroll.executedAt).toISOString().split("T")[0]
    : new Date(payroll.createdAt).toISOString().split("T")[0];
  const filename = orgName
    ? `${orgName.toLowerCase().replace(/\s+/g, "-")}-payroll-${date}-detail.json`
    : `payroll-${date}-detail.json`;
  downloadFile(json, filename, "application/json");
}
