"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmployees } from "@/hooks/use-employees";
import { Loader2, UserPlus, X, Copy, CheckCircle2, Link as LinkIcon, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Minimum salary (ShadowWire minimum deposit requirement)
const MIN_SALARY = 6;

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddEmployeeModal({ isOpen, onClose }: AddEmployeeModalProps) {
  const { createEmployee, isCreating } = useEmployees();
  const { toast } = useToast();

  const [newEmployee, setNewEmployee] = useState({
    name: "",
    salary: "",
  });
  const [inviteData, setInviteData] = useState<{
    inviteUrl: string;
    name: string;
    salary: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAddEmployee = () => {
    if (!newEmployee.name || !newEmployee.salary) return;

    const salary = parseFloat(newEmployee.salary);
    if (salary < MIN_SALARY) {
      toast({
        title: "Salary too low",
        description: `Minimum salary is ${MIN_SALARY} USDC (ShadowWire requirement)`,
        variant: "destructive",
      });
      return;
    }

    if (newEmployee.name && newEmployee.salary) {
      createEmployee(
        {
          name: newEmployee.name,
          salary: parseFloat(newEmployee.salary),
        },
        {
          onSuccess: (data) => {
            // Show the invite link
            setInviteData({
              inviteUrl: data.employee.inviteUrl,
              name: data.employee.name,
              salary: data.employee.salary,
            });
            setNewEmployee({ name: "", salary: "" });
          },
        }
      );
    }
  };

  const handleCopyLink = async () => {
    if (inviteData?.inviteUrl) {
      await navigator.clipboard.writeText(inviteData.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setNewEmployee({ name: "", salary: "" });
    setInviteData(null);
    setCopied(false);
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
              {inviteData ? (
                <CheckCircle2 className="h-5 w-5 text-teal-500" />
              ) : (
                <UserPlus className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display">
                {inviteData ? "Invite Created!" : "Add New Employee"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {inviteData
                  ? "Share the link with your employee"
                  : "Create an invite for a team member"}
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
        {inviteData ? (
          // Success: Show invite link
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-lg bg-teal-500/5 border border-teal-500/20">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-teal-500">Privacy Protected</p>
                  <p className="text-muted-foreground mt-1">
                    {inviteData.name} will register their own private wallet.
                    You&apos;ll never see their personal wallet address.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <code className="text-sm truncate flex-1">{inviteData.inviteUrl}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-teal-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30">
              <div>
                <p className="text-xs text-muted-foreground">Employee</p>
                <p className="font-medium">{inviteData.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Salary</p>
                <p className="font-medium">${inviteData.salary.toLocaleString()} USDC</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              The invite expires in 7 days. The employee can pay you from any wallet.
            </p>
          </div>
        ) : (
          // Form: Name and Salary only
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Employee Name</Label>
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
              <Label htmlFor="add-salary">Monthly Salary (USDC)</Label>
              <Input
                id="add-salary"
                type="number"
                placeholder="5000"
                min={MIN_SALARY}
                value={newEmployee.salary}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, salary: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">Minimum: {MIN_SALARY} USDC</p>
            </div>

            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-500">No Wallet Needed</p>
                  <p className="text-muted-foreground mt-1">
                    The employee will create their own private receiving wallet when
                    they accept the invite. You won&apos;t see their personal wallet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t border-white/10">
          {inviteData ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleCopyLink}>
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAddEmployee}
                disabled={isCreating || !newEmployee.name || !newEmployee.salary}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Generate Invite"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
