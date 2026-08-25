import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Input, Select, Textarea } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { OperationsWorkflowPage } from "@/components/workflow/OperationsWorkflow";
import { billingApi, repairApi } from "@/services/modules";
import { cn, formatCurrency, formatDate, unwrapArray } from "@/utils/cn";
import { firstObject } from "@/utils/data";
import { useNotifyMutation, getErrorMessage } from "@/hooks/useNotifyMutation";
import { isBillingEligibleTicket } from "@/utils/workflow";
import { ticketLabel } from "@/utils/ticketLabel";

export function Billing() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedTicketId, setSelectedTicketId] = useState(searchParams.get("ticketId") || "");

  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState("");

  const invoicesQuery = useQuery({ queryKey: ["billing", "invoices"], queryFn: () => billingApi.invoices(), staleTime: 2 * 60_000 });
  // Reuse shared repair list cache — same key used by Repair/Estimates/Handover pages
  const ticketsQuery = useQuery({ queryKey: ["repair", "", ""], queryFn: () => repairApi.list({ limit: 50 }), staleTime: 2 * 60_000 });
  const invoices = unwrapArray(invoicesQuery.data, ["invoices"]);
  const tickets = unwrapArray(ticketsQuery.data, ["tickets"]);

  const invoiceCandidates = tickets.filter((ticket) => isBillingEligibleTicket(ticket, invoices));
  const activeTicketId = selectedTicketId || invoiceCandidates[0]?.id || "";

  // Fetch candidate ticket details to get approved estimate, used item parts, and technician extra cost.
  const ticketDetailQuery = useQuery({
    queryKey: ["repair-ticket-billing-detail", activeTicketId],
    queryFn: () => repairApi.get(activeTicketId),
    enabled: Boolean(activeTicketId),
  });
  const ticket = ticketDetailQuery.data?.data?.ticket || ticketDetailQuery.data?.data || null;
  const partsUsageQuery = useQuery({
    queryKey: ["parts-usage", activeTicketId],
    queryFn: () => repairApi.partsUsage(activeTicketId),
    enabled: Boolean(activeTicketId),
  });
  const partsUsage = unwrapArray(partsUsageQuery.data, ["partsUsage", "usages", "usage"]);

  const waitingApprovalTickets = tickets.filter((ticket) => ticket.status === "WAITING_APPROVAL");

  const invoiceMutation = useNotifyMutation({
    mutationFn: ({ ticketId, payload }) => repairApi.invoice(ticketId, payload),
    successMessage: "Invoice generated successfully.",
    onSuccess: async () => {
      setTaxRate(0);
      setDiscountAmount(0);
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["repair"] });
    },
  });

  const generatedInvoice = firstObject(invoiceMutation.data, ["invoice"]);

  // Math calculations
  const approvedEstimate = ticket?.latestEstimate || ticket?.estimates?.[0] || null;
  const estimateItems = approvedEstimate?.items || approvedEstimate?.estimateItems || [];
  const estimateAmount = Number(approvedEstimate?.totalAmount || 0);
  const usedPartsAmount = partsUsage.reduce((sum, item) => sum + Number(item.totalCost || Number(item.quantity || 0) * Number(item.unitCost || 0)), 0);
  const technicianExtraCost = Number(ticket?.extraCost || 0);
  const hasBillableRepairCost = Boolean(approvedEstimate) || partsUsage.length > 0 || technicianExtraCost > 0;
  const invoiceBaseAmount = estimateAmount + usedPartsAmount + technicianExtraCost;
  const subtotal = invoiceBaseAmount;
  const taxableAmount = Math.max(0, subtotal - Number(discountAmount || 0));
  const taxAmount = taxableAmount * (Number(taxRate || 0) / 100);
  const finalAmount = taxableAmount + taxAmount;
  const workflowTicket = ticket || tickets.find((item) => item.id === activeTicketId) || null;

  const handleSubmitInvoice = (event) => {
    event.preventDefault();
    if (!activeTicketId) return;

    const manualItems = [];

    if (!hasBillableRepairCost) {
      manualItems.push({
        name: "Diagnostic & Repair Intake Charge",
        unitPrice: 0,
        quantity: 1,
        sourceType: "MANUAL",
        itemType: "PART",
      });
    }

    invoiceMutation.mutate({
      ticketId: activeTicketId,
      payload: {
        includeApprovedEstimate: hasBillableRepairCost,
        includeActualUsage: hasBillableRepairCost,
        manualItems,
        taxRate: Number(taxRate || 0),
        discountAmount: Number(discountAmount || 0),
        notes: notes || undefined,
      },
    });
  };

  return (
    <OperationsWorkflowPage current="billing" ticket={workflowTicket} ticketId={activeTicketId} showContinue={false} showSummary={false}>
      <PageHeader title="Billing & Invoicing" description="Create the final invoice from estimate, used item parts, and technician extra cost." />
      
      <div className="space-y-6 min-w-0">
        {/* TOP: CREATE FINAL INVOICE FORM */}
        <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-base font-bold text-slate-900">Create Final Invoice</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-5 max-w-3xl" onSubmit={handleSubmitInvoice}>
              <Field label="Select Repair Ticket">
                <Select
                  name="ticketId"
                  value={activeTicketId}
                  onChange={(event) => {
                    setSelectedTicketId(event.target.value);
                    setDiscountAmount(0);
                    setTaxRate(0);
                    setNotes("");
                  }}
                >
                  <option value="" disabled>-- Select Ticket --</option>
                  {invoiceCandidates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {ticketLabel(t)} · {t.title}
                    </option>
                  ))}
                </Select>
              </Field>

              {!invoiceCandidates.length ? (
                <p className="text-sm text-[var(--muted)]">
                  No tickets are ready for invoice. First approve the estimate, use item parts, or submit technician extra cost, then come back here.
                </p>
              ) : null}

              {waitingApprovalTickets.length ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="font-semibold">Waiting approval before billing</p>
                  <p className="mt-1">{waitingApprovalTickets.slice(0, 3).map(ticketLabel).join(", ")}</p>
                  <Link className="mt-2 inline-block text-[var(--primary)]" to="/repair/estimates">
                    Go to Estimates
                  </Link>
                </div>
              ) : null}

              {ticket && (
                <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-xs">
                  <InvoiceDraftPreview
                    ticket={ticket}
                    estimate={approvedEstimate}
                    estimateItems={estimateItems}
                    partsUsage={partsUsage}
                    estimateAmount={estimateAmount}
                    usedPartsAmount={usedPartsAmount}
                    technicianExtraCost={technicianExtraCost}
                    extraCostReason={ticket.extraCostReason}
                    invoiceBaseAmount={invoiceBaseAmount}
                    taxRate={taxRate}
                    setTaxRate={setTaxRate}
                    taxAmount={taxAmount}
                    discountAmount={discountAmount}
                    setDiscountAmount={setDiscountAmount}
                    finalAmount={finalAmount}
                  />
                </div>
              )}

              <Field label="Invoice Notes">
                <Textarea
                  placeholder="Notes shown on the invoice..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>

              <Button
                className="w-full sm:w-auto px-6 h-10 bg-[#1769aa] hover:bg-[#125388] text-white font-bold cursor-pointer"
                type="submit"
                disabled={invoiceMutation.isPending || !activeTicketId || !hasBillableRepairCost}
              >
                {invoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
              </Button>
              {!hasBillableRepairCost && activeTicketId ? (
                <p className="text-xs text-[var(--muted)]">This repair has no estimate, used item parts, or technician extra cost yet.</p>
              ) : null}
            </form>
            {generatedInvoice?.id ? <GeneratedInvoiceSummary invoice={generatedInvoice} /> : null}
          </CardContent>
        </Card>

        {/* BOTTOM: INVOICES & PAYMENT HISTORY TABLE */}
        <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
            <CardTitle className="text-base font-bold text-slate-900">Invoices & Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              rows={invoices}
              searchPlaceholder="Search invoices..."
              emptyTitle="No invoices found"
              emptyDescription="Generated invoices will appear here."
              columns={[
                {
                  key: "invoiceNumber",
                  header: "Invoice",
                  render: (invoice) => (
                    <Link className="font-bold text-[#1769aa]" to={`/billing/invoices/${invoice.id}`}>
                      {invoice.invoiceNumber}
                    </Link>
                  ),
                },
                {
                  key: "repair",
                  header: "Repair",
                  render: (invoice) => (invoice.ticket ? ticketLabel(invoice.ticket) : "Not set"),
                },
                {
                  key: "customer",
                  header: "Customer",
                  render: (invoice) => (invoice.customer?.fullName || "Not set"),
                },
                {
                  key: "totalAmount",
                  header: "Total",
                  render: (invoice) => formatCurrency(invoice.totalAmount),
                },
                {
                  key: "paidAmount",
                  header: "Paid",
                  render: (invoice) => formatCurrency(invoice.paidAmount),
                },
                {
                  key: "dueAmount",
                  header: "Due",
                  render: (invoice) => formatCurrency(invoice.dueAmount),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (invoice) => <StatusBadge status={invoice.status} />,
                },
                {
                  key: "action",
                  header: "Action",
                  render: (invoice) =>
                    Number(invoice.dueAmount || 0) > 0 ? (
                      <Link to={`/billing/invoices/${invoice.id}`}>
                        <Button size="sm" type="button" className="h-7 px-3 text-xs bg-[#1769aa] cursor-pointer">
                          Pay
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Paid</span>
                    ),
                },
                {
                  key: "pdf",
                  header: "PDF",
                  render: (invoice) => (
                    <Link to={`/billing/invoices/${invoice.id}?print=true`}>
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        className="h-7 px-2.5 text-xs font-bold gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#1769aa]" /> PDF
                      </Button>
                    </Link>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </OperationsWorkflowPage>
  );
}

function GeneratedInvoiceSummary({ invoice }) {
  return (
    <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-emerald-900">Invoice ready</p>
          <p className="mt-1 text-emerald-800">{invoice.invoiceNumber} · {formatCurrency(invoice.totalAmount)}</p>
          <p className="mt-1 text-emerald-700">Due {formatCurrency(invoice.dueAmount)} for {invoice.customer?.fullName || invoice.ticket?.title || "selected repair"}.</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={`/billing/invoices/${invoice.id}`}>
          <Button type="button" size="sm">Open Invoice</Button>
        </Link>
      </div>
    </div>
  );
}



function InvoiceDraftPreview({
  ticket,
  estimate,
  estimateItems,
  partsUsage,
  estimateAmount,
  usedPartsAmount,
  technicianExtraCost,
  extraCostReason,
  invoiceBaseAmount,
  taxRate,
  setTaxRate,
  taxAmount,
  discountAmount,
  setDiscountAmount,
  finalAmount,
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border)] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Invoice Draft</p>
        <p className="mt-1 font-semibold text-slate-900">{ticketLabel(ticket)}</p>
        <p className="text-xs text-[var(--muted)]">{ticket.customer?.fullName || "Customer not set"}</p>
      </div>

      <div className="space-y-4 p-3">
        <InvoiceSection
          title="Estimate Cost"
          subtitle={estimate?.estimateNumber || "Estimate not created"}
          amount={estimateAmount}
        >
          {estimateItems.length ? (
            estimateItems.map((item, index) => (
              <InvoiceLine
                key={item.id || index}
                name={item.name || item.itemType || "Estimate item"}
                meta={`${item.itemType || "ITEM"} · Qty ${item.quantity || 1}`}
                amount={Number(item.totalAmount || Number(item.quantity || 0) * Number(item.unitAmount || 0))}
              />
            ))
          ) : (
            <InvoiceLine name="Approved estimate total" meta="Customer estimate snapshot" amount={estimateAmount} />
          )}
        </InvoiceSection>

        <InvoiceSection
          title="Used Item Parts"
          subtitle={`${partsUsage.length} technician parts usage ${partsUsage.length === 1 ? "entry" : "entries"}`}
          amount={usedPartsAmount}
        >
          {partsUsage.length ? (
            partsUsage.map((item, index) => (
              <InvoiceLine
                key={item.id || index}
                name={item.inventoryItem?.partName || item.partName || item.partSku || "Part used"}
                meta={`Qty ${item.quantity || 0}${item.technician?.fullName ? ` · ${item.technician.fullName}` : ""}`}
                amount={Number(item.totalCost || Number(item.quantity || 0) * Number(item.unitCost || 0))}
              />
            ))
          ) : (
            <p className="text-xs text-[var(--muted)]">No used item parts recorded yet.</p>
          )}
        </InvoiceSection>

        <InvoiceSection
          title="Technician Extra Cost"
          subtitle={extraCostReason || "Additional technician charge from repair report"}
          amount={technicianExtraCost}
        >
          {technicianExtraCost > 0 ? (
            <InvoiceLine
              name="Technician Extra Cost"
              meta={extraCostReason || "Repair report extra charge"}
              amount={technicianExtraCost}
            />
          ) : (
            <p className="text-xs text-[var(--muted)]">No technician extra cost recorded.</p>
          )}
        </InvoiceSection>

        <div className="grid gap-3 rounded-md border border-blue-100 bg-blue-50 p-3 sm:grid-cols-2">
          <Field label="Tax Rate (%)">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="0"
              value={taxRate || ""}
              onChange={(event) => setTaxRate(event.target.value)}
            />
          </Field>
          <Field label="Discount">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={discountAmount || ""}
              onChange={(event) => setDiscountAmount(event.target.value)}
            />
          </Field>
        </div>

        <InvoiceTotals
          subtotal={invoiceBaseAmount}
          discount={discountAmount}
          tax={taxAmount}
          total={finalAmount}
        />
      </div>
    </div>
  );
}

function InvoiceDocument({ invoice, items }) {
  const ticket = invoice.ticket;
  const itemDevice = ticket?.items?.[0];
  const deviceDetail = itemDevice
    ? `${itemDevice.brand || ""} ${itemDevice.model || ""}`.trim() || itemDevice.itemType || "Device"
    : ticket?.device || "Device";
  const serialImei = itemDevice?.serialNumber || itemDevice?.imei || "N/A";

  const estimateItems = items.filter((item) => ["ESTIMATE", "LABOR"].includes(item.sourceType));
  const usedPartsItems = items.filter((item) => item.sourceType === "ACTUAL_USAGE");
  const manualItems = items.filter((item) => !["ESTIMATE", "LABOR", "ACTUAL_USAGE"].includes(item.sourceType));
  const subtotal = items.reduce((sum, item) => sum + Number(item.totalAmount || item.lineTotal || 0), 0);
  const discount = Number(invoice.discountAmount || 0);
  const tax = Number(invoice.taxAmount || 0);

  const payments = invoice.payments || invoice.repairPayments || [];
  const latestPayment = payments[payments.length - 1];
  const paymentMethod = latestPayment?.method || invoice.paymentMethod || "CASH / ONLINE";

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden rounded-xl bg-white print:border-none print:shadow-none print:m-0 print:p-0">
      <CardHeader className="bg-slate-50 border-b border-slate-200 p-6 print:bg-white print:border-b-2 print:border-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950 tracking-tight">
              {invoice.branch?.name || "Main Branch - KARIGER ERP"}
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Official Repair Invoice & Receipt</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">Invoice No.</span>
            <span className="text-lg font-black text-[#1769aa] font-mono">{invoice.invoiceNumber}</span>
            <div className="mt-1 flex justify-end gap-2 items-center">
              <span className="text-xs text-slate-500">{invoice.createdAt ? formatDate(invoice.createdAt) : ""}</span>
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Customer & Device Information Grid */}
        <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 print:border-slate-200">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Customer Information</span>
            <p className="mt-1 text-sm font-bold text-slate-900">{invoice.customer?.fullName || "Customer"}</p>
            {invoice.customer?.phone && <p className="text-xs text-slate-600 font-medium">Phone: {invoice.customer.phone}</p>}
            {invoice.customer?.email && <p className="text-xs text-slate-600">Email: {invoice.customer.email}</p>}
            {invoice.customer?.address && <p className="text-xs text-slate-600">Address: {invoice.customer.address}</p>}
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Repair & Device Details</span>
            <p className="mt-1 text-sm font-bold text-slate-900">{ticket ? ticketLabel(ticket) : "Repair Ticket"}</p>
            <p className="text-xs text-slate-700 font-semibold mt-0.5">Device: {deviceDetail}</p>
            <p className="text-xs text-slate-600">Serial / IMEI: {serialImei}</p>
            {ticket?.title && <p className="text-xs text-slate-500">Problem: {ticket.title}</p>}
          </div>
        </div>

        {/* Itemized Invoice Breakdown */}
        <div className="space-y-4">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">Invoice Line Items</span>

          <InvoiceSection title="Approved Estimate & Labor" subtitle="Initial diagnostic estimate" amount={sumInvoiceItems(estimateItems)}>
            {estimateItems.length ? estimateItems.map((item, index) => (
              <InvoiceLine
                key={item.id || index}
                name={item.name}
                meta={`${item.itemType || item.sourceType || "LABOR"} · Qty ${item.quantity || 1}`}
                amount={Number(item.totalAmount || item.lineTotal || 0)}
              />
            )) : <p className="p-3 text-xs text-slate-400 italic">No estimate charges.</p>}
          </InvoiceSection>

          <InvoiceSection title="Used Item Parts" subtitle="Actual replacement parts consumed" amount={sumInvoiceItems(usedPartsItems)}>
            {usedPartsItems.length ? usedPartsItems.map((item, index) => (
              <InvoiceLine
                key={item.id || index}
                name={item.name}
                meta={`${item.itemType || item.sourceType || "PARTS"} · Qty ${item.quantity || 1}`}
                amount={Number(item.totalAmount || item.lineTotal || 0)}
              />
            )) : <p className="p-3 text-xs text-slate-400 italic">No consumed parts recorded.</p>}
          </InvoiceSection>

          {manualItems.length ? (
            <InvoiceSection title="Other Charges / Technician Extra Cost" subtitle="Additional report charges" amount={sumInvoiceItems(manualItems)}>
              {manualItems.map((item, index) => (
                <InvoiceLine
                  key={item.id || index}
                  name={item.name}
                  meta={`${item.itemType || item.sourceType || "EXTRA"} · Qty ${item.quantity || 1}`}
                  amount={Number(item.totalAmount || item.lineTotal || 0)}
                />
              ))}
            </InvoiceSection>
          ) : null}
        </div>

        {/* Totals & Payment Breakdown */}
        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Payment Summary</span>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Payment Method:</span><span className="font-bold text-slate-800">{paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Amount Paid:</span><span className="font-bold text-emerald-700">{formatCurrency(invoice.paidAmount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Amount Due:</span><span className="font-bold text-slate-900">{formatCurrency(invoice.dueAmount)}</span></div>
            </div>
          </div>

          <div>
            <InvoiceTotals subtotal={subtotal} discount={discount} tax={tax} total={Number(invoice.totalAmount || 0)} />
          </div>
        </div>

        {/* Invoice Footer / Terms */}
        <div className="pt-4 text-center border-t border-slate-100 text-[11px] text-slate-400">
          <p className="font-semibold text-slate-600">Thank you for choosing {invoice.branch?.name || "Main Branch"}!</p>
          <p className="mt-0.5">Please retain this invoice as proof of service for warranty and support.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceSection({ title, subtitle, amount, children }) {
  return (
    <section className="rounded-md border border-[var(--border)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] bg-slate-50 p-3">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-[var(--muted)]">{subtitle}</p>
        </div>
        <p className="shrink-0 font-bold text-slate-900">{formatCurrency(amount)}</p>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {children}
      </div>
    </section>
  );
}

function InvoiceLine({ name, meta, amount }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="break-words text-sm font-medium text-slate-900">{name}</p>
        <p className="text-xs text-[var(--muted)]">{meta}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-slate-900">{formatCurrency(amount)}</p>
    </div>
  );
}

function InvoiceTotals({ subtotal, discount, tax, total, muted = false }) {
  return (
    <div className={cn("ml-auto max-w-sm rounded-md border p-3", muted ? "border-slate-200 bg-slate-50 text-slate-400" : "border-blue-100 bg-blue-50 text-blue-950")}>
      <SummaryLine label="Subtotal" value={formatCurrency(subtotal)} />
      <SummaryLine label="Discount" value={`-${formatCurrency(discount)}`} />
      <SummaryLine label="Tax" value={formatCurrency(tax)} />
      <div className="mt-2 flex items-center justify-between border-t border-current/15 pt-2">
        <span className="text-sm font-semibold uppercase tracking-wide">Total</span>
        <span className="text-xl font-black">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function sumInvoiceItems(items) {
  return items.reduce((sum, item) => sum + Number(item.totalAmount || item.lineTotal || 0), 0);
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function InvoiceDetails({ id }) {
  const [searchParams] = useSearchParams();
  const shouldAutoPrint = searchParams.get("print") === "true";
  const [error, setError] = useState("");
  const [paymentCollected, setPaymentCollected] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({ queryKey: ["billing", "invoice", id], queryFn: () => billingApi.invoice(id), enabled: Boolean(id) });
  const invoice = firstObject(data, ["invoice"]);
  const payments = invoice.payments || invoice.repairPayments || [];
  const items = invoice.items || invoice.invoiceItems || [];

  useEffect(() => {
    if (shouldAutoPrint && invoice?.id) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoPrint, invoice?.id]);

  const paymentMutation = useNotifyMutation({
    mutationFn: (payload) => billingApi.collectPayment(id, payload),
    successMessage: "Payment collected successfully.",
    onSuccess: () => {
      setError("");
      setPaymentCollected(true);
      queryClient.invalidateQueries({ queryKey: ["billing", "invoice", id] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (!invoice?.id) return <p className="text-sm text-[var(--muted)] p-6">Loading invoice...</p>;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <PageHeader title={invoice.invoiceNumber} description="Final invoice, payment collection, and receipt history for this repair." />
        <Button
          type="button"
          onClick={() => window.print()}
          className="bg-[#1769aa] hover:bg-[#125388] text-white font-bold text-xs h-9 px-4 gap-1.5 cursor-pointer shadow-sm"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4 print:hidden mb-5">
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Total</p><p className="mt-2 text-2xl font-bold">{formatCurrency(invoice.totalAmount)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Paid</p><p className="mt-2 text-2xl font-bold">{formatCurrency(invoice.paidAmount)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Due Amount</p><p className="mt-2 text-2xl font-bold">{formatCurrency(invoice.dueAmount)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Status</p><div className="mt-2"><StatusBadge status={invoice.status} /></div></CardContent></Card>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] print:block">
        <div className="space-y-5 print:w-full">
          <InvoiceDocument invoice={invoice} items={items} />
        </div>
        <div className="space-y-5 xl:sticky xl:top-5 xl:self-start print:hidden">
          <Card>
            <CardHeader>
              <CardTitle>Collect Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-blue-700">Amount Due</p>
                    <p className="mt-1 text-3xl font-black text-slate-950">{formatCurrency(invoice.dueAmount)}</p>
                    <p className="text-xs text-slate-600">{invoice.customer?.fullName || "Customer not set"}</p>
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  setError("");
                  paymentMutation.mutate({
                    amount: Number(form.get("amount") || 0),
                    method: form.get("method"),
                    transactionReference: form.get("transactionReference") || undefined,
                    notes: form.get("notes") || undefined,
                  });
                }}
              >
                <Field label="Payment Amount">
                  <Input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Amount"
                    defaultValue={Number(invoice.dueAmount || 0) || ""}
                    max={Number(invoice.dueAmount || 0)}
                  />
                </Field>
                <Field label="Payment Method">
                  <Select name="method">
                    <option>CASH</option>
                    <option>CARD</option>
                    <option>UPI</option>
                    <option>BANK_TRANSFER</option>
                    <option>WALLET</option>
                  </Select>
                </Field>
                <Field label="Transaction Reference">
                  <Input name="transactionReference" placeholder="UPI reference, card slip, or receipt number" />
                </Field>
                <Field label="Payment Notes">
                  <Textarea name="notes" placeholder="Notes for this payment..." />
                </Field>
                {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
                <Button className="w-full" disabled={paymentMutation.isPending || Number(invoice.dueAmount || 0) <= 0}>
                  {paymentMutation.isPending ? "Collecting..." : "Collect Payment"}
                </Button>
              </form>
              {(paymentCollected || Number(invoice.dueAmount || 0) <= 0) && (invoice.repairTicketId || invoice.ticket?.id) ? (
                <Link className="mt-3 block" to={`/handover?ticketId=${invoice.repairTicketId || invoice.ticket?.id}`}>
                  <Button className="w-full" type="button" variant="secondary">
                    Go to Handover
                  </Button>
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <PaymentHistory payments={payments} />
        </div>
      </div>
    </>
  );
}

function PaymentHistory({ payments }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {payments.length ? (
          <div className="divide-y divide-[var(--border)]">
            {payments.map((payment, index) => (
              <div key={payment.id || index} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-[var(--muted)]">{payment.method || "Payment method not set"}</p>
                  </div>
                  <StatusBadge status={payment.status || "PAID"} />
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">{payment.collectedAt || payment.paidAt || payment.createdAt || "Date not recorded"}</p>
                {payment.transactionReference ? (
                  <p className="mt-1 break-words text-xs text-slate-600">Ref: {payment.transactionReference}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-sm text-[var(--muted)]">
            No payment collected yet. Payment receipts will appear here after collection.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
