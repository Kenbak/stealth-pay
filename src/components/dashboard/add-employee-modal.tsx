"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmployees } from "@/hooks/use-employees";
import { Loader2, UserPlus, X } from "lucide-react";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddEmployeeModal({ isOpen, onClose }: AddEmployeeModalProps) {
  const { createEmployee, isCreating } = useEmployees();

  const [newEmployee, setNewEmployee] = useState({
    name: "",
    walletAddress: "",
    salary: "",
  });

  const handleAddEmployee = () => {
    if (newEmployee.name && newEmployee.walletAddress && newEmployee.salary) {
      createEmployee(
        {
          name: newEmployee.name,
          walletAddress: newEmployee.walletAddress,
          salary: parseFloat(newEmployee.salary),
        },
        {
          onSuccess: () => {
            setNewEmployee({ name: "", walletAddress: "", salary: "" });
            onClose();
          },
        }
      );
    }
  };

  const handleClose = () => {
    setNewEmployee({ name: "", walletAddress: "", salary: "" });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-md max-h-[85vh] overflow-y-auto bg-background border border-white/10 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display">Add New Employee</h2>
              <p className="text-sm text-muted-foreground">
                Add a team member to your payroll
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-name">Name</Label>
            <Input
              id="add-name"
              placeholder="John Doe"
              value={newEmployee.name}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-wallet">Solana Wallet Address</Label>
            <Input
              id="add-wallet"
              placeholder="Abc123..."
              className="font-mono"
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
            <Label htmlFor="add-salary">Monthly Salary (USDC)</Label>
            <Input
              id="add-salary"
              type="number"
              placeholder="5000"
              value={newEmployee.salary}
              onChange={(e) =>
                setNewEmployee({ ...newEmployee, salary: e.target.value })
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t border-white/10">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAddEmployee}
            disabled={isCreating || !newEmployee.name || !newEmployee.walletAddress || !newEmployee.salary}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Employee"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
