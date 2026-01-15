"use client";

import { useState } from "react";
import { useInvoices } from "@/hooks/use-invoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText,
  Plus,
  Copy,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  Link as LinkIcon,
  Loader2,
  Calendar,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { calculateInvoiceFees } from "@/lib/fees";

export default function InvoicesPage() {
  const {
    invoices,
    pendingInvoices,
    paidInvoices,
    totalPending,
    totalPaid,
    isLoading,
    isCreating,
    createInvoice,
    cancelInvoice,
  } = useInvoices();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    amount: "",
    description: "",
    dueDate: "",
  });
  const [createdInvoice, setCreatedInvoice] = useState<{
    publicId: string;
    paymentUrl: string;
  } | null>(null);

  const handleCreateInvoice = async () => {
    if (!newInvoice.amount || !newInvoice.description) {
      toast({
        title: "Missing fields",
        description: "Please fill in amount and description",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createInvoice({
        amount: parseFloat(newInvoice.amount),
        description: newInvoice.description,
        dueDate: newInvoice.dueDate || undefined,
      });

      if (result) {
        setCreatedInvoice({
          publicId: result.invoice.publicId,
          paymentUrl: result.paymentUrl,
        });
        toast({
          title: "Invoice created!",
          description: "Share the payment link with your client",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Payment link copied to clipboard",
    });
  };

  const handleCancelInvoice = async (publicId: string) => {
    const success = await cancelInvoice(publicId);
    if (success) {
      toast({
        title: "Invoice cancelled",
        description: "The invoice has been cancelled",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to cancel invoice",
        variant: "destructive",
      });
    }
  };

  const resetDialog = () => {
    setNewInvoice({ amount: "", description: "", dueDate: "" });
    setCreatedInvoice(null);
    setIsDialogOpen(false);
  };

  const fees = newInvoice.amount ? calculateInvoiceFees(parseFloat(newInvoice.amount)) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Invoices</h1>
          <p className="text-muted-foreground">Create and manage private invoices</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetDialog();
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            {!createdInvoice ? (
              <>
                <DialogHeader>
                  <DialogTitle>Create Invoice</DialogTitle>
                  <DialogDescription>
                    Create a payment link to send to your client
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USDC)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="500"
                      value={newInvoice.amount}
                      onChange={(e) =>
                        setNewInvoice({ ...newInvoice, amount: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Website redesign - January 2026"
                      value={newInvoice.description}
                      onChange={(e) =>
                        setNewInvoice({ ...newInvoice, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date (optional)</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newInvoice.dueDate}
                      onChange={(e) =>
                        setNewInvoice({ ...newInvoice, dueDate: e.target.value })
                      }
                    />
                  </div>

                  {/* Fee Preview */}
                  {fees && (
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Invoice Amount</span>
                        <span>{fees.invoiceAmount.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Platform Fee ({fees.stealthFeeRate}%)</span>
                        <span>{fees.stealthFee.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Privacy Fee ({fees.shadowwireFeeRate}%)</span>
                        <span>{fees.shadowwireFee.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t border-border">
                        <span>Client Pays</span>
                        <span className="text-amber-500">{fees.totalClientPays.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex justify-between text-teal-500">
                        <span>You Receive</span>
                        <span>{fees.freelancerReceives.toLocaleString()} USDC</span>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateInvoice}
                    disabled={isCreating}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Invoice"
                    )}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-500" />
                    Invoice Created!
                  </DialogTitle>
                  <DialogDescription>
                    Share this link with your client to receive payment
                  </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                  <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <code className="text-sm truncate flex-1">{createdInvoice.paymentUrl}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopyLink(createdInvoice.paymentUrl)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetDialog}>
                    Close
                  </Button>
                  <Button
                    onClick={() => handleCopyLink(createdInvoice.paymentUrl)}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              ${totalPending.toLocaleString()} USDC
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-500">{paidInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              ${totalPaid.toLocaleString()} USDC received
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invoiced
            </CardTitle>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              ${(totalPending + totalPaid).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {invoices.length} invoices total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            All Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first invoice to get paid privately
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => {
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
                const paymentUrl = `${appUrl}/pay/${invoice.publicId}`;

                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <div className="font-medium">{invoice.description}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>
                            {formatDistanceToNow(new Date(invoice.createdAt), { addSuffix: true })}
                          </span>
                          {invoice.dueDate && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Due {new Date(invoice.dueDate).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold">${invoice.amount.toLocaleString()}</div>
                        <Badge
                          variant="outline"
                          className={
                            invoice.status === "PAID"
                              ? "border-teal-500 text-teal-500"
                              : invoice.status === "CANCELLED"
                              ? "border-red-500 text-red-500"
                              : "border-amber-500 text-amber-500"
                          }
                        >
                          {invoice.status === "PAID" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {invoice.status === "CANCELLED" && <XCircle className="w-3 h-3 mr-1" />}
                          {invoice.status === "PENDING" && <Clock className="w-3 h-3 mr-1" />}
                          {invoice.status}
                        </Badge>
                      </div>

                      {invoice.status === "PENDING" && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleCopyLink(paymentUrl)}
                            title="Copy payment link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(paymentUrl, "_blank")}
                            title="Open payment page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleCancelInvoice(invoice.publicId)}
                            title="Cancel invoice"
                            className="text-red-500 hover:text-red-400"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
