"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Pencil,
  Save,
  X,
  CircleDollarSign,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { truncateAddress, formatCurrency } from "@/lib/utils";
import { isHeliusConfigured } from "@/lib/helius";
import { useToast } from "@/components/ui/use-toast";

// Get network from env
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
const isMainnet = NETWORK === "mainnet-beta";

export default function SettingsPage() {
  const { publicKey, disconnect } = useWallet();
  const { isAdmin, isEmployee, organization, employments, isLoading, logout } = useAuth();
  const { toast } = useToast();

  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEditName = () => {
    if (organization) {
      setNewOrgName(organization.name);
      setEditingName(true);
    }
  };

  const handleSaveName = async () => {
    if (!newOrgName.trim()) {
      toast({ title: "Error", description: "Organization name cannot be empty", variant: "destructive" });
      return;
    }

    setSavingName(true);
    try {
      const token = localStorage.getItem("auth-token");
      const response = await fetch("/api/organizations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Organization name updated" });
        setEditingName(false);
        window.location.reload();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (deleteConfirmation !== organization?.name) {
      toast({ title: "Error", description: "Please type the organization name to confirm", variant: "destructive" });
      return;
    }

    setDeletingOrg(true);
    try {
      const token = localStorage.getItem("auth-token");
      const response = await fetch("/api/organizations", {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        toast({ title: "Organization deleted", description: "All data has been permanently removed" });
        // Logout and redirect
        if (logout) logout();
        disconnect();
        window.location.href = "/";
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeletingOrg(false);
    }
  };

  // Calculate employee stats
  const totalReceived = employments.reduce((sum, emp) => {
    const payments = emp.recentPayments || [];
    return sum + payments.reduce((pSum: number, p: { amount: number }) => pSum + p.amount, 0);
  }, 0);

  // Security features list
  const securityFeatures = [
    { label: "End-to-end encryption", detail: "AES-256-GCM", enabled: true },
    { label: "Private payroll transfers", detail: "ShadowWire ZK", enabled: true },
    { label: "Private withdrawals", detail: "Privacy Cash", enabled: true },
    { label: "Enhanced RPC", detail: "Helius", enabled: isHeliusConfigured() },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Account */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Account</h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {publicKey ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Connected Wallet</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                        {truncateAddress(publicKey.toBase58(), 8)}
                      </code>
                      <button
                        onClick={copyAddress}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-teal-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      <a
                        href={`https://orbmarkets.io/address/${publicKey.toBase58()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                  <Badge variant={isMainnet ? "default" : "secondary"}>
                    {isMainnet ? "Mainnet" : "Devnet"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Switch to a different wallet
                  </p>
                  <Button variant="outline" size="sm" onClick={() => disconnect()}>
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No wallet connected</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Organization - Only for admins */}
      {isAdmin && organization && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Organization</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Name</p>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        className="w-48"
                        placeholder="Organization name"
                      />
                      <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={savingName}>
                        {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingName(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="font-medium">{organization.name}</p>
                  )}
                </div>
                {!editingName && (
                  <Button variant="ghost" size="sm" onClick={handleEditName}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{format(new Date(organization.createdAt), "MMM d, yyyy")}</p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-sm font-medium">{organization.activeEmployeeCount || 0}</p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Payrolls completed</p>
                <p className="text-sm font-medium">{organization.completedPayrollCount || 0}</p>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Employment - Only for employees */}
      {isEmployee && employments.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Employment</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total received</p>
                <p className="font-medium">{formatCurrency(totalReceived)}</p>
              </div>

              <div className="pt-2 border-t space-y-3">
                {employments.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{emp.organizationName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(emp.salary)}/month
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-teal-500 border-teal-500/30">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Security */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Security & Privacy</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {securityFeatures.map((feature, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {feature.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-teal-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className={`text-sm ${!feature.enabled ? "text-muted-foreground" : ""}`}>
                      {feature.label}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{feature.detail}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Danger Zone - Only for admins */}
      {isAdmin && organization && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-red-500">Danger Zone</h2>
          <Card className="border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Delete organization</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your organization and all associated data
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Delete Organization
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-4">
                        <p>
                          This action cannot be undone. This will permanently delete:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Your organization <strong>{organization.name}</strong></li>
                          <li>All employee records</li>
                          <li>All payroll history</li>
                          <li>All invoices and transactions</li>
                        </ul>
                        <div className="pt-4">
                          <p className="text-sm font-medium mb-2">
                            Type <strong>{organization.name}</strong> to confirm:
                          </p>
                          <Input
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder={organization.name}
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
                        Cancel
                      </AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteOrganization}
                        disabled={deletingOrg || deleteConfirmation !== organization.name}
                      >
                        {deletingOrg ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Delete permanently"
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Devnet Notice */}
      {!isMainnet && (
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p>
            <strong>Devnet Mode</strong> — You are using test tokens.
          </p>
        </div>
      )}
    </div>
  );
}
