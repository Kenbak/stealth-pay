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
  Download,
  X,
  Eye,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { calculateInvoiceFees, FEES } from "@/lib/fees";
import { downloadInvoicesCSV, downloadInvoiceDetailCSV, InvoiceExportData } from "@/lib/export";
import { useOrganization } from "@/hooks/use-organization";

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
  const { organization } = useOrganization();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<typeof invoices[0] | null>(null);
  const [newInvoice, setNewInvoice] = useState({
    amount: "",
    description: "",
    dueDate: "",
  });
  const [createdInvoice, setCreatedInvoice] = useState<{
    publicId: string;
    paymentUrl: string;
  } | null>(null);

  const handleExportAll = () => {
    if (invoices.length === 0) {
      toast({
        title: "No invoices to export",
        description: "Create some invoices first",
        variant: "destructive",
      });
      return;
    }
    downloadInvoicesCSV(invoices as InvoiceExportData[], organization?.name);
    toast({
      title: "Export complete",
      description: `Exported ${invoices.length} invoices to CSV`,
    });
  };

  const handleExportSingle = (invoice: typeof invoices[0]) => {
    downloadInvoiceDetailCSV(invoice as InvoiceExportData, organization?.name);
    toast({
      title: "Export complete",
      description: `Invoice ${invoice.publicId} exported`,
    });
  };

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
        <div className="flex items-center gap-2">
          {invoices.length > 0 && (
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
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
              <div className="flex flex-col items-center text-center py-2">
                <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-teal-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Invoice Created!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Share this link with your client to receive payment
                </p>
                <div className="w-full p-3 rounded-lg bg-muted/50 flex items-center gap-2 mb-4">
                  <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <code className="text-xs truncate flex-1">{createdInvoice.paymentUrl}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleCopyLink(createdInvoice.paymentUrl)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" onClick={resetDialog} className="flex-1">
                    Close
                  </Button>
                  <Button
                    onClick={() => handleCopyLink(createdInvoice.paymentUrl)}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
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
            <div className="space-y-2">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-white/5">
                <div className="col-span-4">Description</div>
                <div className="col-span-2">Due Date</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-2 text-right">Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Invoice Rows */}
              {invoices.map((invoice) => {
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
                const paymentUrl = `${appUrl}/pay/${invoice.publicId}`;
                const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status === "PENDING";

                return (
                  <div
                    key={invoice.id}
                    onClick={() => setSelectedInvoice(invoice)}
                    className="grid grid-cols-2 md:grid-cols-12 gap-4 p-4 rounded-lg border hover:bg-accent/30 transition-colors items-center group cursor-pointer"
                  >
                    {/* Description */}
                    <div className="col-span-2 md:col-span-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{invoice.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(invoice.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="hidden md:flex md:col-span-2 items-center gap-2">
                      {invoice.dueDate ? (
                        <span className={`text-sm ${isOverdue ? "text-red-500" : ""}`}>
                          {new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="hidden md:block md:col-span-2 text-right">
                      <p className="font-semibold">${invoice.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">USDC</p>
                    </div>

                    {/* Status */}
                    <div className="hidden md:flex md:col-span-2 justify-end">
                      <Badge
                        className={
                          invoice.status === "PAID"
                            ? "bg-teal-500/10 text-teal-500 border-teal-500/20 gap-1"
                            : invoice.status === "CANCELLED"
                            ? "bg-red-500/10 text-red-500 border-red-500/20 gap-1"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1"
                        }
                      >
                        {invoice.status === "PAID" && <CheckCircle2 className="w-3 h-3" />}
                        {invoice.status === "CANCELLED" && <XCircle className="w-3 h-3" />}
                        {invoice.status === "PENDING" && <Clock className="w-3 h-3" />}
                        {invoice.status}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="hidden md:flex md:col-span-2 justify-end gap-1">
                      {invoice.status === "PENDING" ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); handleCopyLink(paymentUrl); }}
                            title="Copy payment link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); window.open(paymentUrl, "_blank"); }}
                            title="Open payment page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={(e) => { e.stopPropagation(); handleCancelInvoice(invoice.publicId); }}
                            title="Cancel invoice"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      ) : invoice.status === "PAID" && invoice.paidAt ? (
                        <span className="text-xs text-muted-foreground">
                          Paid {formatDistanceToNow(new Date(invoice.paidAt), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Mobile: Amount & Status */}
                    <div className="md:hidden col-span-2 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">${invoice.amount.toLocaleString()}</p>
                        {invoice.dueDate && (
                          <p className={`text-xs ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                            Due {new Date(invoice.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            invoice.status === "PAID"
                              ? "bg-teal-500/10 text-teal-500 border-teal-500/20 gap-1"
                              : invoice.status === "CANCELLED"
                              ? "bg-red-500/10 text-red-500 border-red-500/20 gap-1"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1"
                          }
                        >
                          {invoice.status === "PAID" && <CheckCircle2 className="w-3 h-3" />}
                          {invoice.status === "CANCELLED" && <XCircle className="w-3 h-3" />}
                          {invoice.status === "PENDING" && <Clock className="w-3 h-3" />}
                          {invoice.status}
                        </Badge>
                        {invoice.status === "PENDING" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); handleCopyLink(paymentUrl); }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => setSelectedInvoice(null)}
          />

          {/* Modal */}
          <div className="relative z-50 w-full max-w-lg max-h-[85vh] overflow-y-auto glass border-white/10 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  Invoice Details
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedInvoice.publicId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    selectedInvoice.status === "PAID"
                      ? "bg-teal-500/10 text-teal-500 border-teal-500/20 gap-1"
                      : selectedInvoice.status === "CANCELLED"
                      ? "bg-red-500/10 text-red-500 border-red-500/20 gap-1"
                      : "bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1"
                  }
                >
                  {selectedInvoice.status === "PAID" && <CheckCircle2 className="w-3 h-3" />}
                  {selectedInvoice.status === "CANCELLED" && <XCircle className="w-3 h-3" />}
                  {selectedInvoice.status === "PENDING" && <Clock className="w-3 h-3" />}
                  {selectedInvoice.status}
                </Badge>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 hover:bg-accent rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p className="font-medium">{selectedInvoice.description}</p>
              </div>

              {/* Amount Breakdown */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Amount Breakdown</h3>
                {(() => {
                  const fees = calculateInvoiceFees(selectedInvoice.amount);
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Invoice Amount</span>
                        <span className="font-medium">${selectedInvoice.amount.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Platform Fee ({fees.stealthFeeRate}%)</span>
                        <span className="text-orange-500">+${fees.stealthFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Privacy Fee ({fees.shadowwireFeeRate}%)</span>
                        <span className="text-orange-500">+${fees.shadowwireFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                        <span className="font-medium">Client Pays</span>
                        <span className="font-semibold text-amber-500">${fees.totalClientPays.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">You Receive</span>
                        <span className="font-semibold text-teal-500">${fees.freelancerReceives.toLocaleString()} USDC</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                  <p className="text-sm">{format(new Date(selectedInvoice.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Due Date</h3>
                  <p className="text-sm">
                    {selectedInvoice.dueDate
                      ? format(new Date(selectedInvoice.dueDate), "MMM d, yyyy")
                      : "—"}
                  </p>
                </div>
                {selectedInvoice.paidAt && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Paid At</h3>
                    <p className="text-sm text-teal-500">
                      {format(new Date(selectedInvoice.paidAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}
              </div>


              {/* Payment Link (if pending) */}
              {selectedInvoice.status === "PENDING" && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Payment Link</h3>
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <code className="text-xs truncate flex-1">
                      {`${process.env.NEXT_PUBLIC_APP_URL || ""}/pay/${selectedInvoice.publicId}`}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink(`${process.env.NEXT_PUBLIC_APP_URL || ""}/pay/${selectedInvoice.publicId}`);
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between gap-2 p-6 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => handleExportSingle(selectedInvoice)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <div className="flex gap-2">
                {selectedInvoice.status === "PENDING" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.open(`${process.env.NEXT_PUBLIC_APP_URL || ""}/pay/${selectedInvoice.publicId}`, "_blank");
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </Button>
                    <Button
                      onClick={() => {
                        handleCopyLink(`${process.env.NEXT_PUBLIC_APP_URL || ""}/pay/${selectedInvoice.publicId}`);
                      }}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                  </>
                )}
                {selectedInvoice.status !== "PENDING" && (
                  <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
