"use client";

import { useState } from "react";
import { useEmployees, type Employee } from "@/hooks/use-employees";
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
  Plus,
  Users,
  Trash2,
  Pencil,
  Loader2,
  Wallet,
} from "lucide-react";
import { formatCurrency, truncateAddress } from "@/lib/utils";

export default function EmployeesPage() {
  const {
    employees,
    isLoading,
    createEmployee,
    isCreating,
    updateEmployee,
    isUpdating,
    deleteEmployee,
    isDeleting,
    totalSalary,
    activeEmployees,
  } = useEmployees();

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    walletAddress: "",
    salary: "",
  });

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    salary: "",
    status: "ACTIVE" as "ACTIVE" | "PAUSED" | "TERMINATED",
  });

  const handleAddEmployee = () => {
    if (newEmployee.name && newEmployee.walletAddress && newEmployee.salary) {
      createEmployee({
        name: newEmployee.name,
        walletAddress: newEmployee.walletAddress,
        salary: parseFloat(newEmployee.salary),
      });
      setNewEmployee({ name: "", walletAddress: "", salary: "" });
      setIsAddOpen(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">
            Manage your team and their salaries
          </p>
        </div>

        {/* Add Employee Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Add a team member to your payroll. Their salary will be paid
                privately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={newEmployee.name}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wallet">Solana Wallet Address</Label>
                <Input
                  id="wallet"
                  placeholder="Abc123..."
                  value={newEmployee.walletAddress}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      walletAddress: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  The employee&apos;s Solana wallet for receiving payments
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Monthly Salary (USDC)</Label>
                <Input
                  id="salary"
                  type="number"
                  placeholder="5000"
                  value={newEmployee.salary}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, salary: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEmployee} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Employee"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information. Wallet address cannot be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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

            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm font-mono text-muted-foreground">
                <Wallet className="h-4 w-4" />
                {editingEmployee?.walletAddress}
              </div>
              <p className="text-xs text-muted-foreground">
                Wallet address cannot be modified for security
              </p>
            </div>

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
                onValueChange={(value: "ACTIVE" | "PAUSED" | "TERMINATED") =>
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

          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stealth-500">
              {activeEmployees.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSalary)}</div>
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
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No employees yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first team member to get started with private payroll
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Employee
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-stealth-500/10 flex items-center justify-center">
                      <span className="text-stealth-500 font-semibold">
                        {employee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wallet className="h-3 w-3" />
                        <span className="font-mono">
                          {truncateAddress(employee.walletAddress, 6)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(employee.salary)}
                      </p>
                      <Badge
                        variant="secondary"
                        className={
                          employee.status === "ACTIVE"
                            ? "bg-stealth-500/10 text-stealth-500"
                            : employee.status === "PAUSED"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-red-500/10 text-red-500"
                        }
                      >
                        {employee.status.toLowerCase()}
                      </Badge>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
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
