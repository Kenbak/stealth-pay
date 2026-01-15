"use client";

import { useState } from "react";
import { useEmployees, type Employee, type EmployeeStatus } from "@/hooks/use-employees";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Users,
  Trash2,
  Pencil,
  Loader2,
  Wallet,
  X,
  Copy,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
} from "lucide-react";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { AddEmployeeModal } from "@/components/dashboard/add-employee-modal";

export default function EmployeesPage() {
  // Redirect to /dashboard if no organization
  const { isLoading: orgLoading, hasOrganization } = useRequireOrganization();

  const {
    employees,
    isLoading,
    updateEmployee,
    isUpdating,
    deleteEmployee,
    isDeleting,
    totalSalary,
    activeEmployees,
    payrollReadyEmployees,
    pendingInviteEmployees,
    payrollReadySalary,
  } = useEmployees();

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    salary: "",
    status: "ACTIVE" as EmployeeStatus,
  });

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleEditClick = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditData({
      name: employee.name,
      salary: employee.salary.toString(),
      status: employee.status,
    });
    setIsEditOpen(true);
  };

  const handleEditSave = () => {
    if (editingEmployee && editData.name && editData.salary) {
      updateEmployee({
        id: editingEmployee.id,
        data: {
          name: editData.name,
          salary: parseFloat(editData.salary),
          status: editData.status,
        },
      });
      setIsEditOpen(false);
      setEditingEmployee(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this employee?")) {
      deleteEmployee(id);
    }
  };

  const handleCopyInvite = async (employee: Employee) => {
    if (employee.inviteUrl) {
      await navigator.clipboard.writeText(employee.inviteUrl);
      setCopiedId(employee.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getStatusBadge = (employee: Employee) => {
    if (employee.status === "PENDING_INVITE") {
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
          <Clock className="w-3 h-3 mr-1" />
          pending invite
        </Badge>
      );
    }
    if (employee.status === "ACTIVE" && employee.isPayrollReady) {
      return (
        <Badge variant="secondary" className="bg-teal-500/10 text-teal-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          ready
        </Badge>
      );
    }
    if (employee.status === "ACTIVE" && !employee.isPayrollReady) {
      return (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
          <Clock className="w-3 h-3 mr-1" />
          awaiting wallet
        </Badge>
      );
    }
    if (employee.status === "PAUSED") {
      return (
        <Badge variant="secondary" className="bg-slate-500/10 text-slate-500">
          paused
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-red-500/10 text-red-500">
        terminated
      </Badge>
    );
  };

  // Show loading while checking org
  if (orgLoading || !hasOrganization) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-1">Employees</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team and their salaries
          </p>
        </div>

        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Add Employee Modal */}
      <AddEmployeeModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />

      {/* Edit Employee Modal */}
      {isEditOpen && editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => setIsEditOpen(false)}
          />
          <div className="relative z-50 w-full max-w-md max-h-[85vh] overflow-y-auto glass border-white/10 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Pencil className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold font-display">Edit Employee</h2>
                  <p className="text-sm text-muted-foreground">
                    Update employee information
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                />
              </div>

              {editingEmployee.stealthPayWallet && (
                <div className="space-y-2">
                  <Label>StealthPay Wallet</Label>
                  <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    {truncateAddress(editingEmployee.stealthPayWallet, 8)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is the employee&apos;s private receiving wallet
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-salary">Monthly Salary (USDC)</Label>
                <Input
                  id="edit-salary"
                  type="number"
                  value={editData.salary}
                  onChange={(e) =>
                    setEditData({ ...editData, salary: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editData.status}
                  onValueChange={(value: EmployeeStatus) =>
                    setEditData({ ...editData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-6 border-t border-white/10">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 stagger-children">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ready for Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold text-teal-500">
              {payrollReadyEmployees.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Invite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold text-amber-500">
              {pendingInviteEmployees.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payroll Ready Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold">{formatCurrency(payrollReadySalary)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            All employees in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-lg font-display font-semibold mb-2">No employees yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Add your first team member to get started with private payroll
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Employee
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                    employee.isPayrollReady
                      ? "hover:border-teal-500/30"
                      : "hover:border-amber-500/30 border-dashed"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      employee.isPayrollReady
                        ? "bg-teal-500/10"
                        : "bg-amber-500/10"
                    }`}>
                      <span className={`font-display font-semibold ${
                        employee.isPayrollReady
                          ? "text-teal-500"
                          : "text-amber-500"
                      }`}>
                        {employee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {employee.stealthPayWallet ? (
                          <>
                            <Wallet className="h-3 w-3" />
                            <span className="font-mono">
                              {truncateAddress(employee.stealthPayWallet, 6)}
                            </span>
                          </>
                        ) : employee.inviteUrl ? (
                          <button
                            onClick={() => handleCopyInvite(employee)}
                            className="flex items-center gap-1 hover:text-amber-500 transition-colors"
                          >
                            {copiedId === employee.id ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-teal-500" />
                                <span className="text-teal-500">Copied!</span>
                              </>
                            ) : (
                              <>
                                <LinkIcon className="h-3 w-3" />
                                <span>Copy invite link</span>
                                <Copy className="h-3 w-3" />
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="italic">No wallet registered</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-display font-semibold">
                        {formatCurrency(employee.salary)}
                      </p>
                      {getStatusBadge(employee)}
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl"
                        onClick={() => handleEditClick(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl"
                        onClick={() => handleDelete(employee.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
