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
  stealthPayWallet: string;
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
    "StealthPay Wallet",
    "Amount (USDC)",
    "Payment Status",
  ];

  const rows = payroll.payments.map(payment => [
    payroll.id,
    payroll.executedAt ? new Date(payroll.executedAt).toISOString() : new Date(payroll.createdAt).toISOString(),
    `"${payment.employeeName}"`, // Quote in case of commas
    payment.stealthPayWallet,
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
        stealthPayWallet: payment.stealthPayWallet,
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

// ============================================
// INVOICE EXPORTS
// ============================================

import { calculateInvoiceFees } from "./fees";

export interface InvoiceExportData {
  id: string;
  publicId: string;
  amount: number;
  tokenMint: string;
  description: string;
  dueDate: string | null;
  status: string;
  // payerWallet intentionally not stored for privacy
  paidAt: string | null;
  platformFee: number | null;
  createdAt: string;
}

/**
 * Export invoices to CSV format
 * Note: Payer wallet is intentionally excluded for privacy
 */
export function exportInvoicesToCSV(invoices: InvoiceExportData[]): string {
  const headers = [
    "Invoice ID",
    "Description",
    "Amount (USDC)",
    "Platform Fee (USDC)",
    "Client Pays (USDC)",
    "Status",
    "Due Date",
    "Paid At",
    "Created At",
  ];

  const rows = invoices.map(invoice => {
    const fees = calculateInvoiceFees(invoice.amount);
    return [
      invoice.publicId,
      `"${invoice.description.replace(/"/g, '""')}"`, // Escape quotes
      invoice.amount.toFixed(2),
      invoice.platformFee?.toFixed(2) || "0.00",
      fees.totalClientPays.toFixed(2),
      invoice.status,
      invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "",
      invoice.paidAt ? new Date(invoice.paidAt).toISOString() : "",
      new Date(invoice.createdAt).toISOString(),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Export invoices to JSON format
 * Note: Payer wallet is intentionally excluded for privacy
 */
export function exportInvoicesToJSON(invoices: InvoiceExportData[]): string {
  const paidInvoices = invoices.filter(i => i.status === "PAID");
  const pendingInvoices = invoices.filter(i => i.status === "PENDING");

  const exportData = {
    exportedAt: new Date().toISOString(),
    totalInvoices: invoices.length,
    summary: {
      totalPaid: paidInvoices.reduce((sum, i) => sum + i.amount, 0),
      totalPending: pendingInvoices.reduce((sum, i) => sum + i.amount, 0),
      paidCount: paidInvoices.length,
      pendingCount: pendingInvoices.length,
      cancelledCount: invoices.filter(i => i.status === "CANCELLED").length,
    },
    invoices: invoices.map(invoice => {
      const fees = calculateInvoiceFees(invoice.amount);
      return {
        publicId: invoice.publicId,
        description: invoice.description,
        amounts: {
          invoiceAmount: invoice.amount,
          platformFee: invoice.platformFee || fees.stealthFee,
          privacyFee: fees.shadowwireFee,
          clientPays: fees.totalClientPays,
        },
        status: invoice.status,
        dates: {
          createdAt: invoice.createdAt,
          dueDate: invoice.dueDate,
          paidAt: invoice.paidAt,
        },
        // payerWallet intentionally excluded for privacy
      };
    }),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download invoices as CSV
 */
export function downloadInvoicesCSV(invoices: InvoiceExportData[], orgName?: string) {
  const csv = exportInvoicesToCSV(invoices);
  const date = new Date().toISOString().split("T")[0];
  const filename = orgName
    ? `${orgName.toLowerCase().replace(/\s+/g, "-")}-invoices-${date}.csv`
    : `invoices-${date}.csv`;
  downloadFile(csv, filename, "text/csv");
}

/**
 * Download invoices as JSON
 */
export function downloadInvoicesJSON(invoices: InvoiceExportData[], orgName?: string) {
  const json = exportInvoicesToJSON(invoices);
  const date = new Date().toISOString().split("T")[0];
  const filename = orgName
    ? `${orgName.toLowerCase().replace(/\s+/g, "-")}-invoices-${date}.json`
    : `invoices-${date}.json`;
  downloadFile(json, filename, "application/json");
}

/**
 * Export single invoice detail to CSV
 * Note: Payer wallet is intentionally excluded for privacy
 */
export function exportInvoiceDetailToCSV(invoice: InvoiceExportData): string {
  const fees = calculateInvoiceFees(invoice.amount);

  const lines = [
    "INVOICE DETAILS",
    "",
    `Invoice ID,${invoice.publicId}`,
    `Description,"${invoice.description.replace(/"/g, '""')}"`,
    `Status,${invoice.status}`,
    "",
    "AMOUNTS",
    `Invoice Amount,${invoice.amount.toFixed(2)} USDC`,
    `Platform Fee (${fees.stealthFeeRate}%),${fees.stealthFee.toFixed(2)} USDC`,
    `Privacy Fee (${fees.shadowwireFeeRate}%),${fees.shadowwireFee.toFixed(2)} USDC`,
    `Client Pays,${fees.totalClientPays.toFixed(2)} USDC`,
    `You Receive,${fees.freelancerReceives.toFixed(2)} USDC`,
    "",
    "DATES",
    `Created,${new Date(invoice.createdAt).toISOString()}`,
    `Due Date,${invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "N/A"}`,
    `Paid At,${invoice.paidAt ? new Date(invoice.paidAt).toISOString() : "N/A"}`,
    "",
    "PRIVACY",
    "Payment received via ShadowWire (payer identity protected)",
  ];

  return lines.join("\n");
}

/**
 * Download single invoice as CSV
 */
export function downloadInvoiceDetailCSV(invoice: InvoiceExportData, orgName?: string) {
  const csv = exportInvoiceDetailToCSV(invoice);
  const filename = orgName
    ? `${orgName.toLowerCase().replace(/\s+/g, "-")}-invoice-${invoice.publicId}.csv`
    : `invoice-${invoice.publicId}.csv`;
  downloadFile(csv, filename, "text/csv");
}

// ============================================
// EMPLOYEE EXPORTS (Payments & Withdrawals)
// ============================================

export interface EmployeePaymentExport {
  id: string;
  organizationName: string;
  amount: number;
  status: string;
  date: string;
  txSignature?: string;
}

export interface EmployeeWithdrawalExport {
  id: string;
  organizationName: string;
  amount: number;
  feeAmount: number;
  netReceived: number;
  mode: "PRIVATE" | "PUBLIC";
  status: string;
  recipient: string;
  date: string;
  txSignature?: string;
}

/**
 * Export employee payments to CSV (for tax purposes)
 */
export function exportEmployeePaymentsToCSV(
  payments: EmployeePaymentExport[],
  year?: number
): string {
  const filteredPayments = year
    ? payments.filter(p => new Date(p.date).getFullYear() === year)
    : payments;

  const headers = [
    "Date",
    "Organization",
    "Gross Amount (USDC)",
    "Status",
    "Transaction",
  ];

  const rows = filteredPayments.map(payment => [
    new Date(payment.date).toISOString().split("T")[0],
    `"${payment.organizationName}"`,
    payment.amount.toFixed(2),
    payment.status,
    payment.txSignature || "N/A",
  ].join(","));

  // Summary
  const totalReceived = filteredPayments
    .filter(p => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0);

  const summaryRows = [
    "",
    "SUMMARY",
    `Year,${year || "All Time"}`,
    `Total Payments,${filteredPayments.length}`,
    `Total Received,${totalReceived.toFixed(2)} USDC`,
  ];

  return [headers.join(","), ...rows, ...summaryRows].join("\n");
}

/**
 * Export employee withdrawals to CSV
 */
export function exportEmployeeWithdrawalsToCSV(
  withdrawals: EmployeeWithdrawalExport[],
  year?: number
): string {
  const filteredWithdrawals = year
    ? withdrawals.filter(w => new Date(w.date).getFullYear() === year)
    : withdrawals;

  const headers = [
    "Date",
    "Organization",
    "Gross Amount (USDC)",
    "Fee (USDC)",
    "Net Received (USDC)",
    "Mode",
    "Status",
    "To Wallet",
    "Transaction",
  ];

  const rows = filteredWithdrawals.map(w => [
    new Date(w.date).toISOString().split("T")[0],
    `"${w.organizationName}"`,
    w.amount.toFixed(2),
    w.feeAmount.toFixed(2),
    w.netReceived.toFixed(2),
    w.mode,
    w.status,
    w.recipient,
    w.txSignature || "N/A",
  ].join(","));

  // Summary
  const completedWithdrawals = filteredWithdrawals.filter(w => w.status === "COMPLETED");
  const totalWithdrawn = completedWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const totalFees = completedWithdrawals.reduce((sum, w) => sum + w.feeAmount, 0);
  const totalNet = completedWithdrawals.reduce((sum, w) => sum + w.netReceived, 0);

  const summaryRows = [
    "",
    "SUMMARY",
    `Year,${year || "All Time"}`,
    `Total Withdrawals,${filteredWithdrawals.length}`,
    `Gross Withdrawn,${totalWithdrawn.toFixed(2)} USDC`,
    `Total Fees,${totalFees.toFixed(2)} USDC`,
    `Net Received,${totalNet.toFixed(2)} USDC`,
    `Private Withdrawals,${completedWithdrawals.filter(w => w.mode === "PRIVATE").length}`,
    `Public Withdrawals,${completedWithdrawals.filter(w => w.mode === "PUBLIC").length}`,
  ];

  return [headers.join(","), ...rows, ...summaryRows].join("\n");
}

/**
 * Export employee income report to JSON (comprehensive tax report)
 */
export function exportEmployeeIncomeReportToJSON(
  payments: EmployeePaymentExport[],
  withdrawals: EmployeeWithdrawalExport[],
  year?: number
): string {
  const filterByYear = (date: string) =>
    !year || new Date(date).getFullYear() === year;

  const filteredPayments = payments.filter(p => filterByYear(p.date));
  const filteredWithdrawals = withdrawals.filter(w => filterByYear(w.date));

  const completedPayments = filteredPayments.filter(p => p.status === "COMPLETED");
  const completedWithdrawals = filteredWithdrawals.filter(w => w.status === "COMPLETED");

  const totalIncome = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalWithdrawn = completedWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const totalFees = completedWithdrawals.reduce((sum, w) => sum + w.feeAmount, 0);

  const report = {
    exportedAt: new Date().toISOString(),
    reportPeriod: year ? `${year}` : "All Time",

    summary: {
      totalIncomeReceived: totalIncome,
      totalWithdrawn: totalWithdrawn,
      totalFeesPaid: totalFees,
      netReceived: totalWithdrawn - totalFees,
      paymentCount: completedPayments.length,
      withdrawalCount: completedWithdrawals.length,
      currency: "USDC",
    },

    incomeByOrganization: Object.entries(
      completedPayments.reduce((acc, p) => {
        acc[p.organizationName] = (acc[p.organizationName] || 0) + p.amount;
        return acc;
      }, {} as Record<string, number>)
    ).map(([org, total]) => ({ organization: org, total })),

    monthlyBreakdown: Object.entries(
      completedPayments.reduce((acc, p) => {
        const month = new Date(p.date).toISOString().slice(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + p.amount;
        return acc;
      }, {} as Record<string, number>)
    ).map(([month, total]) => ({ month, income: total })).sort((a, b) => a.month.localeCompare(b.month)),

    payments: filteredPayments.map(p => ({
      date: p.date,
      organization: p.organizationName,
      amount: p.amount,
      status: p.status,
    })),

    withdrawals: filteredWithdrawals.map(w => ({
      date: w.date,
      organization: w.organizationName,
      grossAmount: w.amount,
      fee: w.feeAmount,
      netReceived: w.netReceived,
      mode: w.mode,
      status: w.status,
    })),

    taxNote: "This report is for informational purposes only. Consult a tax professional for official tax filing.",
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Download employee payments CSV
 */
export function downloadEmployeePaymentsCSV(
  payments: EmployeePaymentExport[],
  year?: number
) {
  const csv = exportEmployeePaymentsToCSV(payments, year);
  const date = new Date().toISOString().split("T")[0];
  const yearStr = year ? `-${year}` : "";
  downloadFile(csv, `stealthpay-payments${yearStr}-${date}.csv`, "text/csv");
}

/**
 * Download employee withdrawals CSV
 */
export function downloadEmployeeWithdrawalsCSV(
  withdrawals: EmployeeWithdrawalExport[],
  year?: number
) {
  const csv = exportEmployeeWithdrawalsToCSV(withdrawals, year);
  const date = new Date().toISOString().split("T")[0];
  const yearStr = year ? `-${year}` : "";
  downloadFile(csv, `stealthpay-withdrawals${yearStr}-${date}.csv`, "text/csv");
}

/**
 * Download employee income report JSON
 */
export function downloadEmployeeIncomeReportJSON(
  payments: EmployeePaymentExport[],
  withdrawals: EmployeeWithdrawalExport[],
  year?: number
) {
  const json = exportEmployeeIncomeReportToJSON(payments, withdrawals, year);
  const date = new Date().toISOString().split("T")[0];
  const yearStr = year ? `-${year}` : "";
  downloadFile(json, `stealthpay-income-report${yearStr}-${date}.json`, "application/json");
}

// ============================================
// TREASURY ACTIVITY EXPORTS (For Organizations)
// ============================================

export interface TreasuryTransactionExport {
  id: string;
  type: "DEPOSIT" | "WITHDRAW" | "PAYROLL_OUT" | "INVOICE_IN";
  amount: number;
  tokenMint: string;
  txHash: string;
  payrollId?: string;
  feeAmount?: number;
  feeTxHash?: string;
  createdAt: string;
}

export interface TreasuryActivityExport {
  organizationName: string;
  organizationWallet: string;
  period: {
    from: string;
    to: string;
  };
  transactions: TreasuryTransactionExport[];
}

/**
 * Export treasury activity to CSV
 */
export function exportTreasuryActivityToCSV(data: TreasuryActivityExport): string {
  const headers = [
    "Date",
    "Type",
    "Amount (USDC)",
    "Fee (USDC)",
    "Net Amount (USDC)",
    "Transaction Hash",
    "Fee Transaction",
    "Related Payroll",
    "Verify URL",
  ];

  const rows = data.transactions.map(tx => {
    const fee = tx.feeAmount || 0;
    const netAmount = tx.type === "DEPOSIT" || tx.type === "INVOICE_IN"
      ? tx.amount - fee  // Inflows: subtract fee
      : tx.amount + fee; // Outflows: add fee to get total cost
    
    return [
      new Date(tx.createdAt).toISOString(),
      tx.type,
      tx.amount.toFixed(2),
      fee.toFixed(2),
      netAmount.toFixed(2),
      tx.txHash,
      tx.feeTxHash || "",
      tx.payrollId || "",
      `https://orbmarkets.io/tx/${tx.txHash}`,
    ].join(",");
  });

  // Calculate totals
  const deposits = data.transactions.filter(t => t.type === "DEPOSIT" || t.type === "INVOICE_IN");
  const outflows = data.transactions.filter(t => t.type === "WITHDRAW" || t.type === "PAYROLL_OUT");
  
  const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
  const totalOutflows = outflows.reduce((sum, t) => sum + t.amount, 0);
  const totalFees = data.transactions.reduce((sum, t) => sum + (t.feeAmount || 0), 0);

  const summaryRows = [
    "",
    "TREASURY SUMMARY",
    `Organization,${data.organizationName}`,
    `Wallet,${data.organizationWallet}`,
    `Period,${data.period.from} to ${data.period.to}`,
    "",
    `Total Deposits,${totalDeposits.toFixed(2)} USDC`,
    `Total Outflows,${totalOutflows.toFixed(2)} USDC`,
    `Total Fees Paid,${totalFees.toFixed(2)} USDC`,
    `Net Change,${(totalDeposits - totalOutflows).toFixed(2)} USDC`,
  ];

  return [headers.join(","), ...rows, ...summaryRows].join("\n");
}

/**
 * Export treasury activity to JSON (comprehensive audit report)
 */
export function exportTreasuryActivityToJSON(data: TreasuryActivityExport): string {
  const deposits = data.transactions.filter(t => t.type === "DEPOSIT");
  const invoiceIns = data.transactions.filter(t => t.type === "INVOICE_IN");
  const payrollOuts = data.transactions.filter(t => t.type === "PAYROLL_OUT");
  const withdrawals = data.transactions.filter(t => t.type === "WITHDRAW");

  const report = {
    exportedAt: new Date().toISOString(),
    
    organization: {
      name: data.organizationName,
      wallet: data.organizationWallet,
    },
    
    period: data.period,
    
    summary: {
      totalDeposits: deposits.reduce((sum, t) => sum + t.amount, 0),
      totalInvoiceIncome: invoiceIns.reduce((sum, t) => sum + t.amount, 0),
      totalPayrollOutflows: payrollOuts.reduce((sum, t) => sum + t.amount, 0),
      totalWithdrawals: withdrawals.reduce((sum, t) => sum + t.amount, 0),
      totalFeesPaid: data.transactions.reduce((sum, t) => sum + (t.feeAmount || 0), 0),
      transactionCount: data.transactions.length,
      currency: "USDC",
    },
    
    activity: {
      deposits: deposits.map(tx => ({
        date: tx.createdAt,
        amount: tx.amount,
        fee: tx.feeAmount || 0,
        txHash: tx.txHash,
        verifyUrl: `https://orbmarkets.io/tx/${tx.txHash}`,
      })),
      
      invoiceIncome: invoiceIns.map(tx => ({
        date: tx.createdAt,
        amount: tx.amount,
        fee: tx.feeAmount || 0,
        txHash: tx.txHash,
        verifyUrl: `https://orbmarkets.io/tx/${tx.txHash}`,
      })),
      
      payrollOutflows: payrollOuts.map(tx => ({
        date: tx.createdAt,
        amount: tx.amount,
        fee: tx.feeAmount || 0,
        payrollId: tx.payrollId,
        txHash: tx.txHash,
        verifyUrl: `https://orbmarkets.io/tx/${tx.txHash}`,
      })),
      
      withdrawals: withdrawals.map(tx => ({
        date: tx.createdAt,
        amount: tx.amount,
        txHash: tx.txHash,
        verifyUrl: `https://orbmarkets.io/tx/${tx.txHash}`,
      })),
    },
    
    auditNote: "All transaction hashes can be verified on-chain at the provided URLs.",
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Download treasury activity as CSV
 */
export function downloadTreasuryActivityCSV(data: TreasuryActivityExport, orgName?: string) {
  const csv = exportTreasuryActivityToCSV(data);
  const date = new Date().toISOString().split("T")[0];
  const filename = orgName
    ? `${orgName.toLowerCase().replace(/\s+/g, "-")}-treasury-activity-${date}.csv`
    : `treasury-activity-${date}.csv`;
  downloadFile(csv, filename, "text/csv");
}

/**
 * Download treasury activity as JSON
 */
export function downloadTreasuryActivityJSON(data: TreasuryActivityExport, orgName?: string) {
  const json = exportTreasuryActivityToJSON(data);
  const date = new Date().toISOString().split("T")[0];
  const filename = orgName
    ? `${orgName.toLowerCase().replace(/\s+/g, "-")}-treasury-activity-${date}.json`
    : `treasury-activity-${date}.json`;
  downloadFile(json, filename, "application/json");
}

// ============================================
// ENHANCED PAYROLL EXPORTS (With Audit Trail)
// ============================================

export interface PayrollPaymentWithAudit extends PayrollPaymentExport {
  txSignature?: string;
  proofPda?: string;
}

export interface PayrollDetailWithAudit extends PayrollExportData {
  depositTxHash?: string;
  payments: PayrollPaymentWithAudit[];
}

/**
 * Export detailed payroll with full audit trail to JSON
 */
export function exportPayrollDetailWithAuditToJSON(
  payroll: PayrollDetailWithAudit,
  orgName?: string,
  orgWallet?: string
): string {
  const fees = calculatePayrollFees(payroll.totalAmount);

  const exportData = {
    exportedAt: new Date().toISOString(),
    
    organization: orgName ? {
      name: orgName,
      wallet: orgWallet,
    } : undefined,
    
    payroll: {
      id: payroll.id,
      status: payroll.status,
      
      dates: {
        createdAt: payroll.createdAt,
        scheduledDate: payroll.scheduledDate,
        executedAt: payroll.executedAt,
      },
      
      financials: {
        totalSalaries: fees.salaries,
        stealthPayFee: fees.stealthFee,
        stealthPayFeeRate: `${fees.stealthFeeRate}%`,
        relayerFee: fees.shadowwireFee,
        relayerFeeRate: `${fees.shadowwireFeeRate}%`,
        totalCost: fees.totalCost,
        currency: "USDC",
      },
      
      auditTrail: {
        depositTxHash: payroll.depositTxHash,
        depositVerifyUrl: payroll.depositTxHash 
          ? `https://orbmarkets.io/tx/${payroll.depositTxHash}` 
          : null,
      },
      
      payments: payroll.payments.map(payment => ({
        employeeId: payment.employeeId,
        employeeName: payment.employeeName,
        stealthPayWallet: payment.stealthPayWallet,
        amount: payment.amount,
        status: payment.status,
        
        // Audit trail for each payment
        audit: {
          txSignature: payment.txSignature,
          proofPda: payment.proofPda,
          verifyUrl: payment.txSignature 
            ? `https://orbmarkets.io/tx/${payment.txSignature}` 
            : null,
        },
      })),
    },
    
    compliance: {
      note: "This payroll was executed using StealthPay privacy infrastructure.",
      privacyMethod: "ShadowWire ZK Transfers",
      auditNote: "All transaction signatures can be verified on the Solana blockchain.",
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download payroll detail with audit trail as JSON
 */
export function downloadPayrollDetailWithAuditJSON(
  payroll: PayrollDetailWithAudit,
  orgName?: string,
  orgWallet?: string
) {
  const json = exportPayrollDetailWithAuditToJSON(payroll, orgName, orgWallet);
  const date = payroll.executedAt
    ? new Date(payroll.executedAt).toISOString().split("T")[0]
    : new Date(payroll.createdAt).toISOString().split("T")[0];
  const filename = orgName
    ? `${orgName.toLowerCase().replace(/\s+/g, "-")}-payroll-${date}-audit.json`
    : `payroll-${date}-audit.json`;
  downloadFile(json, filename, "application/json");
}
