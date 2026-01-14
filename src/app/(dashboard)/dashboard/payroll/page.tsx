"use client";

import { useState, useMemo, useEffect } from "react";
import { usePayrolls, type Payroll, type PayrollStatus } from "@/hooks/use-payrolls";
import { useEmployees, type Employee } from "@/hooks/use-employees";
import { usePrices } from "@/hooks/use-prices";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Play,
  Plus,
  Shield,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { formatCurrency, TOKENS } from "@/lib/utils";
import { format, formatDistanceToNow, isPast } from "date-fns";
import Link from "next/link";

const statusConfig: Record<PayrollStatus, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING: {
    label: "Ready",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-blue-500/10 text-blue-500",
  },
  SCHEDULED: {
    label: "Scheduled",
    icon: <Calendar className="h-3 w-3" />,
    className: "bg-stealth-500/10 text-stealth-500",
  },
  PROCESSING: {
    label: "Processing",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: "bg-yellow-500/10 text-yellow-500",
  },
  COMPLETED: {
    label: "Completed",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-green-500/10 text-green-500",
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
  const {
    payrolls,
    isLoading,
    createPayroll,
    isCreating,
    createError,
    executePayroll,
    isExecuting,
    pendingPayrolls,
    completedPayrolls,
  } = usePayrolls();

  const { employees, activeEmployees, isLoading: employeesLoading } = useEmployees();

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPayroll, setNewPayroll] = useState<{
    scheduledDate: string;
    tokenMint: string;
  }>({
    scheduledDate: "",
    tokenMint: TOKENS.USDC.mint,
  });

  // Selected employees for payroll
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  // Initialize with all active employees when modal opens
  useEffect(() => {
    if (isCreateOpen) {
      setSelectedEmployeeIds(new Set(activeEmployees.map((e) => e.id)));
    }
  }, [isCreateOpen, activeEmployees]);

  // Calculate selected total
  const selectedEmployees = useMemo(() => {
    return activeEmployees.filter((e) => selectedEmployeeIds.has(e.id));
  }, [activeEmployees, selectedEmployeeIds]);

  const selectedTotal = useMemo(() => {
    return selectedEmployees.reduce((sum, e) => sum + e.salary, 0);
  }, [selectedEmployees]);

  // Execute confirmation
  const [executingId, setExecutingId] = useState<string | null>(null);

  const canAffordPayroll = true; // TODO: Check treasury balance

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

  const handleExecute = (payroll: Payroll) => {
    if (executingId === payroll.id) {
      executePayroll(payroll.id, {
        onSuccess: () => setExecutingId(null),
        onError: () => setExecutingId(null),
      });
    } else {
      setExecutingId(payroll.id);
      setTimeout(() => setExecutingId(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">
            Schedule and execute private payments
          </p>
        </div>

        {/* Create Payroll Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={activeEmployees.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              New Payroll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Payroll</DialogTitle>
              <DialogDescription>
                Select employees and schedule payment. Payments are sent privately via Privacy Cash.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Employee Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Employees</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAll}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    {selectedEmployeeIds.size === activeEmployees.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>

                <ScrollArea className="h-[200px] rounded-md border p-2">
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
                            <Checkbox
                              checked={selectedEmployeeIds.has(employee.id)}
                              onCheckedChange={() => toggleEmployee(employee.id)}
                            />
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-stealth-500/10 flex items-center justify-center text-xs font-medium text-stealth-500">
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
                </ScrollArea>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Selected employees</span>
                  <span className="font-medium">
                    {selectedEmployees.length} / {activeEmployees.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total payout</span>
                  <span className="text-stealth-500">{formatCurrency(selectedTotal)}</span>
                </div>
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
                    This is a reminder date shown on your dashboard.
                    You&apos;ll still need to manually execute the payroll.
                  </span>
                </div>
              </div>

              {/* Payment Token */}
              <div className="space-y-2">
                <Label>Payment Token</Label>
                <Select
                  value={newPayroll.tokenMint}
                  onValueChange={(value) =>
                    setNewPayroll({ ...newPayroll, tokenMint: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TOKENS).map((token) => (
                      <SelectItem key={token.mint} value={token.mint}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {createError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>{createError.message}</span>
                </div>
              )}
            </div>

            <DialogFooter>
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            <div className="text-2xl font-bold text-stealth-500">
              {completedPayrolls.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payrolls */}
      {pendingPayrolls.length > 0 && (
        <Card className="border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
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
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-500" />
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

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(payroll.totalAmount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {getTokenSymbol(payroll.tokenMint)}
                      </p>
                    </div>

                    <Button
                      onClick={() => handleExecute(payroll)}
                      disabled={isExecuting || !canAffordPayroll}
                      variant={executingId === payroll.id ? "default" : "outline"}
                      className={executingId === payroll.id ? "bg-stealth-500 hover:bg-stealth-600" : ""}
                    >
                      {isExecuting && executingId === payroll.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : executingId === payroll.id ? (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Confirm
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Execute
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Payrolls */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
          <CardDescription>All payroll runs for your organization</CardDescription>
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
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Payroll
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {payrolls.map((payroll) => {
                const config = statusConfig[payroll.status];
                return (
                  <div
                    key={payroll.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {payroll.employeeCount} employee{payroll.employeeCount !== 1 ? "s" : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payroll.executedAt
                            ? `Paid ${formatDistanceToNow(new Date(payroll.executedAt))} ago`
                            : payroll.scheduledDate
                            ? `Reminder: ${format(new Date(payroll.scheduledDate), "MMM d")}`
                            : `Created ${formatDistanceToNow(new Date(payroll.createdAt))} ago`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge className={`${config.className} gap-1`}>
                        {config.icon}
                        {config.label}
                      </Badge>
                      <div className="text-right min-w-[100px]">
                        <p className="font-semibold">{formatCurrency(payroll.totalAmount)}</p>
                        <p className="text-sm text-muted-foreground">
                          {getTokenSymbol(payroll.tokenMint)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-stealth-500/20 bg-stealth-500/5">
        <CardContent className="flex items-start gap-4 pt-6">
          <Shield className="h-8 w-8 text-stealth-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">100% Private Payments</h3>
            <p className="text-sm text-muted-foreground">
              All payroll payments are processed through Privacy Cash using zero-knowledge proofs.
              No one can link deposits to withdrawals, ensuring complete salary confidentiality.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
