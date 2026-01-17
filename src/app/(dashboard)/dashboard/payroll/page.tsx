"use client";

import { useState, useMemo } from "react";
import { usePayrolls, type Payroll, type PayrollStatus, type PayrollDetail } from "@/hooks/use-payrolls";
import { useEmployees } from "@/hooks/use-employees";
import { usePayrollExecution } from "@/hooks/use-payroll-execution";
import { useRequireOrganization } from "@/hooks/use-require-organization";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  Info,
  Loader2,
  Play,
  Plus,
  Shield,
  Trash2,
  Users,
  Wallet,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { USDCIcon } from "@/components/icons/token-icons";
import { formatCurrency, TOKENS } from "@/lib/utils";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { calculatePayrollFees } from "@/lib/fees";
import {
  downloadPayrollsCSV,
  downloadPayrollsJSON,
  downloadPayrollDetailCSV,
  downloadPayrollDetailJSON,
  type PayrollDetailExport,
} from "@/lib/export";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig: Record<PayrollStatus, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING: {
    label: "Ready",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-blue-500/10 text-blue-500",
  },
  SCHEDULED: {
    label: "Scheduled",
    icon: <Calendar className="h-3 w-3" />,
    className: "bg-amber-500/10 text-amber-500",
  },
  PROCESSING: {
    label: "Processing",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: "bg-yellow-500/10 text-yellow-500",
  },
  COMPLETED: {
    label: "Completed",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-teal-500/10 text-teal-500",
  },
  FAILED: {
    label: "Failed",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-red-500/10 text-red-500",
  },
};

function getTokenSymbol(mint: string): string {
  const token = Object.values(TOKENS).find((t) => t.mint === mint);
  return token?.symbol || "USDC";
}

export default function PayrollPage() {
  // Redirect to /dashboard if no organization
  const { isLoading: orgLoading, hasOrganization } = useRequireOrganization();

  const {
    payrolls,
    isLoading,
    createPayroll,
    isCreating,
    createError,
    pendingPayrolls,
    completedPayrolls,
    refetch,
    getPayrollDetail,
    cancelPayroll,
    isCancelling,
  } = usePayrolls();

  const { activeEmployees, isLoading: employeesLoading } = useEmployees();

  // ShadowWire execution hook
  const { execute, state: executionState, isExecuting, reset: resetExecution } = usePayrollExecution();

  // Create modal state (native modal)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPayroll, setNewPayroll] = useState({
    scheduledDate: "",
    tokenMint: TOKENS.USDC.mint,
  });

  // Selected employees for payroll
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  // Execution confirmation
  const [payrollToExecute, setPayrollToExecute] = useState<Payroll | null>(null);

  // Detail modal
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Cancel confirmation
  const [payrollToCancel, setPayrollToCancel] = useState<Payroll | PayrollDetail | null>(null);

  // Initialize with all active employees when modal opens
  const handleOpenCreate = () => {
    setSelectedEmployeeIds(new Set(activeEmployees.map((e) => e.id)));
    setIsCreateOpen(true);
  };

  // Calculate selected total
  const selectedEmployees = useMemo(() => {
    return activeEmployees.filter((e) => selectedEmployeeIds.has(e.id));
  }, [activeEmployees, selectedEmployeeIds]);

  const selectedTotal = useMemo(() => {
    return selectedEmployees.reduce((sum, e) => sum + e.salary, 0);
  }, [selectedEmployees]);

  const toggleEmployee = (employeeId: string) => {
    const newSet = new Set(selectedEmployeeIds);
    if (newSet.has(employeeId)) {
      newSet.delete(employeeId);
    } else {
      newSet.add(employeeId);
    }
    setSelectedEmployeeIds(newSet);
  };

  const toggleAll = () => {
    if (selectedEmployeeIds.size === activeEmployees.length) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(activeEmployees.map((e) => e.id)));
    }
  };

  const handleCreatePayroll = () => {
    createPayroll(
      {
        scheduledDate: newPayroll.scheduledDate || undefined,
        tokenMint: newPayroll.tokenMint,
        employeeIds: Array.from(selectedEmployeeIds),
      },
      {
        onSuccess: () => {
          setNewPayroll({ scheduledDate: "", tokenMint: TOKENS.USDC.mint });
          setSelectedEmployeeIds(new Set());
          setIsCreateOpen(false);
        },
      }
    );
  };

  const handleViewDetail = async (payroll: Payroll) => {
    setIsLoadingDetail(true);
    const detail = await getPayrollDetail(payroll.id);
    if (detail) {
      setSelectedPayroll(detail);
    }
    setIsLoadingDetail(false);
  };

  const handleExecute = async (payroll: Payroll) => {
    setPayrollToExecute(payroll);
  };

  const confirmExecute = async () => {
    if (!payrollToExecute) return;

    const success = await execute(payrollToExecute.id);

    if (success) {
      refetch();
    }

    setPayrollToExecute(null);
    resetExecution();
  };

  // Show loading while checking org
  if (orgLoading || !hasOrganization) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">
            Schedule and execute private payments
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export Dropdown */}
          {payrolls.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                  <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadPayrollsCSV(payrolls)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadPayrollsJSON(payrolls)}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            onClick={handleOpenCreate}
            disabled={activeEmployees.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Payroll
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employeesLoading ? <Skeleton className="h-8 w-12" /> : activeEmployees.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Monthly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(activeEmployees.reduce((sum, e) => sum + e.salary, 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {pendingPayrolls.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-500">
              {completedPayrolls.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payrolls */}
      {pendingPayrolls.length > 0 && (
        <Card className="border-amber-500/20 !bg-amber-500/[0.02]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Ready to Execute
            </CardTitle>
            <CardDescription>
              Click Execute, then Confirm to send private payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingPayrolls.map((payroll) => (
                <div
                  key={payroll.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {payroll.employeeCount} employee{payroll.employeeCount !== 1 ? "s" : ""}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {payroll.scheduledDate ? (
                          <>
                            <Calendar className="h-3 w-3" />
                            {format(new Date(payroll.scheduledDate), "MMM d, yyyy 'at' h:mm a")}
                            {isPast(new Date(payroll.scheduledDate)) && (
                              <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                                Overdue
                              </Badge>
                            )}
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            Ready to run
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const fees = calculatePayrollFees(payroll.totalAmount);
                    return (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(payroll.totalAmount)}</p>
                          <p className="text-xs text-orange-500">
                            +{formatCurrency(fees.stealthFee + fees.shadowwireFee)} fees
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPayrollToCancel(payroll)}
                            disabled={isCancelling}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleExecute(payroll)}
                            disabled={isExecuting}
                            className="bg-amber-600 hover:bg-amber-700"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Execute
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Payrolls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>All payroll runs for your organization</CardDescription>
            </div>
            {completedPayrolls.length > 0 && (
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-500">
                  {formatCurrency(completedPayrolls.reduce((sum, p) => sum + p.totalAmount, 0))}
                </p>
                <p className="text-xs text-muted-foreground">Total paid</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : payrolls.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No payrolls yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first payroll to pay your team privately
              </p>
              {activeEmployees.length === 0 ? (
                <Button asChild>
                  <Link href="/dashboard/employees">
                    <Users className="h-4 w-4 mr-2" />
                    Add Employees First
                  </Link>
                </Button>
              ) : (
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Payroll
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-white/5">
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Employees</div>
                <div className="col-span-2 text-right">Salaries</div>
                <div className="col-span-2 text-right">Fees</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-2 text-right">Status</div>
              </div>

              {/* Payroll Rows */}
              {payrolls.map((payroll) => {
                const config = statusConfig[payroll.status];
                const fees = calculatePayrollFees(payroll.totalAmount);
                const displayDate = payroll.executedAt || payroll.createdAt;

                return (
                  <div
                    key={payroll.id}
                    onClick={() => handleViewDetail(payroll)}
                    className="grid grid-cols-2 md:grid-cols-12 gap-4 p-4 rounded-lg border hover:bg-accent/30 transition-colors items-center cursor-pointer group"
                  >
                    {/* Date */}
                    <div className="col-span-1 md:col-span-2">
                      <p className="font-medium text-sm">
                        {format(new Date(displayDate), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(displayDate), "h:mm a")}
                      </p>
                    </div>

                    {/* Employees */}
                    <div className="hidden md:flex md:col-span-2 items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <Users className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <span className="text-sm">
                        {payroll.employeeCount}
                      </span>
                    </div>

                    {/* Salaries */}
                    <div className="hidden md:block md:col-span-2 text-right">
                      <p className="text-sm font-medium">{formatCurrency(fees.salaries)}</p>
                    </div>

                    {/* Fees */}
                    <div className="hidden md:block md:col-span-2 text-right">
                      <p className="text-sm text-orange-500">
                        +{formatCurrency(fees.stealthFee + fees.shadowwireFee)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(fees.stealthFeeRate + fees.shadowwireFeeRate).toFixed(1)}%
                      </p>
                    </div>

                    {/* Total */}
                    <div className="col-span-1 md:col-span-2 text-right">
                      <p className="font-semibold">{formatCurrency(fees.totalCost)}</p>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {payroll.employeeCount} employee{payroll.employeeCount !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="hidden md:flex md:col-span-2 justify-end">
                      <Badge className={`${config.className} gap-1`}>
                        {config.icon}
                        {config.label}
                      </Badge>
                    </div>

                    {/* Mobile Status */}
                    <div className="md:hidden col-span-2 flex items-center justify-end gap-2">
                      <Badge className={`${config.className} gap-1`}>
                        {config.icon}
                        {config.label}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-amber-500/20 !bg-amber-500/[0.02]">
        <CardContent className="flex items-start gap-4 pt-6">
          <Shield className="h-8 w-8 text-amber-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">100% Private Payments</h3>
            <p className="text-sm text-muted-foreground">
              All payroll payments are processed through Radr ShadowWire using zero-knowledge proofs.
              No one can link deposits to withdrawals, ensuring complete salary confidentiality.
              You sign all transactions with your wallet - fully decentralized!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Payroll Modal (Native) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => setIsCreateOpen(false)}
          />

          {/* Modal */}
          <div className="relative z-50 w-full max-w-lg max-h-[85vh] overflow-y-auto glass border-white/10 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">Create New Payroll</h2>
                <p className="text-sm text-muted-foreground">
                  Select employees and schedule payment via ShadowWire.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-2 hover:bg-accent rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Employee Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Employees</Label>
                  <button
                    onClick={toggleAll}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {selectedEmployeeIds.size === activeEmployees.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>

                <div className="h-[200px] overflow-y-auto rounded-md border p-2">
                  {activeEmployees.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No active employees
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activeEmployees.map((employee) => (
                        <label
                          key={employee.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedEmployeeIds.has(employee.id)}
                              onChange={() => toggleEmployee(employee.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-medium text-amber-500">
                                {employee.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium">{employee.name}</span>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(employee.salary)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                {(() => {
                  const fees = calculatePayrollFees(selectedTotal);
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Selected employees</span>
                        <span className="font-medium">
                          {selectedEmployees.length} / {activeEmployees.length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Salaries</span>
                        <span>{formatCurrency(fees.salaries)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">StealthPay fee ({fees.stealthFeeRate}%)</span>
                        <span className="text-orange-500">+{formatCurrency(fees.stealthFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Relayer fee ({fees.shadowwireFeeRate}%)</span>
                        <span className="text-orange-500">+{formatCurrency(fees.shadowwireFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span>Total cost</span>
                        <span className="text-amber-500">{formatCurrency(fees.totalCost)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Scheduled Date */}
              <div className="space-y-2">
                <Label htmlFor="scheduled-date">
                  Reminder Date <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="scheduled-date"
                  type="datetime-local"
                  value={newPayroll.scheduledDate}
                  onChange={(e) =>
                    setNewPayroll({ ...newPayroll, scheduledDate: e.target.value })
                  }
                  min={new Date().toISOString().slice(0, 16)}
                />
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    This is a reminder date. You&apos;ll still need to manually execute.
                  </span>
                </div>
              </div>

              {createError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>{createError.message}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePayroll}
                disabled={isCreating || selectedEmployees.length === 0}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Create Payroll
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Execute Confirmation Modal (Native) */}
      {payrollToExecute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => !isExecuting && setPayrollToExecute(null)}
          />

          {/* Modal */}
          <div className="relative z-50 w-full max-w-md max-h-[85vh] overflow-y-auto glass border-white/10 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold">Execute Private Payroll</h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-muted-foreground">
                You are about to send{" "}
                <strong className="text-foreground">{formatCurrency(payrollToExecute.totalAmount)}</strong>{" "}
                to{" "}
                <strong className="text-foreground">
                  {payrollToExecute.employeeCount} employee
                  {payrollToExecute.employeeCount !== 1 ? "s" : ""}
                </strong>{" "}
                via ShadowWire.
              </p>
              {(() => {
                const fees = calculatePayrollFees(payrollToExecute.totalAmount);
                return (
                  <div className="text-sm bg-muted/50 p-3 rounded-lg space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Salaries</span>
                      <span>{formatCurrency(fees.salaries)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>StealthPay fee ({fees.stealthFeeRate}%)</span>
                      <span className="text-orange-500">+{formatCurrency(fees.stealthFee)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Relayer fee ({fees.shadowwireFeeRate}%)</span>
                      <span className="text-orange-500">+{formatCurrency(fees.shadowwireFee)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total from treasury</span>
                      <span>{formatCurrency(fees.totalCost)}</span>
                    </div>
                  </div>
                );
              })()}

              {isExecuting && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                    <span className="font-medium">{executionState.message}</span>
                  </div>
                  {executionState.step === "signing" && (
                    <p className="text-sm text-muted-foreground">
                      Check your wallet for transaction approval
                    </p>
                  )}
                </div>
              )}

              {!isExecuting && (
                <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-600 dark:text-amber-400">
                        You will sign {payrollToExecute.employeeCount} transaction{payrollToExecute.employeeCount !== 1 ? "s" : ""} at once
                      </p>
                      <p className="text-muted-foreground mt-1">
                        All payments are sent privately using zero-knowledge proofs.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-6 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => {
                  setPayrollToExecute(null);
                  resetExecution();
                }}
                disabled={isExecuting}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmExecute}
                disabled={isExecuting}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Sign & Execute
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Detail Modal */}
      {(selectedPayroll || isLoadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => !isLoadingDetail && setSelectedPayroll(null)}
          />

          {/* Modal */}
          <div className="relative z-50 w-full max-w-2xl max-h-[85vh] overflow-y-auto glass border-white/10 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : selectedPayroll && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <USDCIcon size={20} />
                      Payroll Details
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedPayroll.executedAt || selectedPayroll.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${statusConfig[selectedPayroll.status].className} gap-1`}>
                      {statusConfig[selectedPayroll.status].icon}
                      {statusConfig[selectedPayroll.status].label}
                    </Badge>
                    <button
                      onClick={() => setSelectedPayroll(null)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-6 border-b border-white/10">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Employees</p>
                      <p className="text-2xl font-bold">{selectedPayroll.employeeCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Paid</p>
                      <p className="text-2xl font-bold text-amber-500">{formatCurrency(selectedPayroll.totalAmount)}</p>
                    </div>
                    <div>
                      {(() => {
                        const fees = calculatePayrollFees(selectedPayroll.totalAmount);
                        return (
                          <>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Fees</p>
                            <p className="text-2xl font-bold text-orange-500">
                              {formatCurrency(fees.stealthFee + fees.shadowwireFee)}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Employee Breakdown */}
                <div className="p-6">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                    Payment Breakdown
                  </h3>
                  <div className="space-y-2">
                    {selectedPayroll.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-amber-500">
                              {payment.employee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{payment.employee.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {payment.employee.stealthPayWallet ? `${payment.employee.stealthPayWallet.slice(0, 4)}...${payment.employee.stealthPayWallet.slice(-4)}` : "Not registered"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                          {/* Only show badge for non-completed payments to avoid duplication with header */}
                          {payment.status === "COMPLETED" ? (
                            <CheckCircle2 className="h-4 w-4 text-teal-500" />
                          ) : payment.status === "FAILED" ? (
                            <Badge className="text-xs bg-red-500/10 text-red-500">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-blue-500/10 text-blue-500">
                              Processing
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-white/10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export Details
                        <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => {
                        const exportData: PayrollDetailExport = {
                          ...selectedPayroll,
                          payments: selectedPayroll.payments.map(p => ({
                            employeeId: p.employeeId,
                            employeeName: p.employee.name,
                            stealthPayWallet: p.employee.stealthPayWallet || "Not registered",
                            amount: p.amount,
                            status: p.status,
                          })),
                        };
                        downloadPayrollDetailCSV(exportData);
                      }}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const exportData: PayrollDetailExport = {
                          ...selectedPayroll,
                          payments: selectedPayroll.payments.map(p => ({
                            employeeId: p.employeeId,
                            employeeName: p.employee.name,
                            stealthPayWallet: p.employee.stealthPayWallet || "Not registered",
                            amount: p.amount,
                            status: p.status,
                          })),
                        };
                        downloadPayrollDetailJSON(exportData);
                      }}>
                        <FileJson className="h-4 w-4 mr-2" />
                        Export as JSON
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="flex gap-2">
                    {selectedPayroll.status === "PENDING" && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPayrollToCancel(selectedPayroll);
                          }}
                          disabled={isCancelling}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Cancel Payroll
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedPayroll(null);
                            handleExecute(selectedPayroll);
                          }}
                          disabled={isExecuting}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Execute
                        </Button>
                      </>
                    )}
                    {selectedPayroll.status !== "PENDING" && (
                      <Button variant="outline" onClick={() => setSelectedPayroll(null)}>
                        Close
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {payrollToCancel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => !isCancelling && setPayrollToCancel(null)}
          />

          {/* Modal */}
          <div className="relative z-50 w-full max-w-md glass border-white/10 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 p-6 border-b border-white/10">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Cancel Payroll</h2>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to cancel this payroll of{" "}
                <strong className="text-foreground">{formatCurrency(payrollToCancel.totalAmount)}</strong>{" "}
                for{" "}
                <strong className="text-foreground">
                  {payrollToCancel.employeeCount} employee{payrollToCancel.employeeCount !== 1 ? "s" : ""}
                </strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                No payments have been made yet. You can create a new payroll at any time.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-6 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => setPayrollToCancel(null)}
                disabled={isCancelling}
              >
                Keep Payroll
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  cancelPayroll(payrollToCancel.id);
                  setPayrollToCancel(null);
                  setSelectedPayroll(null);
                }}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancel Payroll
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
