import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { Timeline } from "@/components/ui/Timeline";
import { OperationsWorkflowPage } from "@/components/workflow/OperationsWorkflow";
import { repairApi } from "@/services/modules";
import { cn, formatCurrency, unwrapArray } from "@/utils/cn";
import { firstObject } from "@/utils/data";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import { ticketLabel } from "@/utils/ticketLabel";
import { Calculator, CheckCircle2, FileText, Wrench } from "lucide-react";

function estimateNoteFromTicket(ticket) {
  if (!ticket) return "";
  const issueText = Array.isArray(ticket.issues)
    ? ticket.issues
        .map((issue) => issue.description || issue.title || issue.issue || "")
        .filter(Boolean)
        .join("\n")
    : "";

  return [
    ticket.diagnosis,
    ticket.initialNotes,
    ticket.customerComplaint,
    ticket.complaint,
    issueText,
    ticket.title,
  ]
    .filter(Boolean)
    .join("\n");
}

export function Estimates() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedTicketId = searchParams.get("ticketId") || "";
  const [selectedTicketId, setSelectedTicketId] = useState(preselectedTicketId);
  const { data, isLoading } = useQuery({ queryKey: ["repair", "estimate-candidates"], queryFn: () => repairApi.list({ limit: 100 }) });
  const estimateStatuses = ["RECEIVED", "DIAGNOSING", "ESTIMATE_PENDING"];
  const allTickets = unwrapArray(data, ["tickets"]);
  const tickets = allTickets.filter((ticket) => estimateStatuses.includes(ticket.status));
  const estimateHistory = allTickets
    .flatMap((ticket) => {
      const estimates = ticket.estimates?.length
        ? ticket.estimates
        : ticket.latestEstimate
        ? [ticket.latestEstimate]
        : [];
      return estimates.map((estimate) => ({ ...estimate, ticket }));
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  const createCandidates = tickets.filter((ticket) => ["RECEIVED", "DIAGNOSING", "ESTIMATE_PENDING"].includes(ticket.status));
  const activeTicketId = createCandidates.some((ticket) => ticket.id === selectedTicketId) ? selectedTicketId : createCandidates[0]?.id || "";
  const activeTicketQuery = useQuery({
    queryKey: ["repair", "estimate-selected", activeTicketId],
    queryFn: () => repairApi.get(activeTicketId),
    enabled: Boolean(activeTicketId),
  });
  const mutation = useNotifyMutation({
    mutationFn: ({ ticketId, payload }) => repairApi.createEstimate(ticketId, payload),
    successMessage: "Estimate created and marked done.",
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repair", "estimate-candidates"] }),
  });
  const createdEstimate = mutation.data?.data?.estimate;
  const visibleCreatedEstimate = createdEstimate;
  const visibleCreatedEstimateStatus = visibleCreatedEstimate?.status || createdEstimate?.status;
  const selectedTicketDetails = activeTicketQuery.data?.data?.ticket || activeTicketQuery.data?.data || null;
  const selectedTicket =
    selectedTicketDetails ||
    allTickets.find((ticket) => ticket.id === (activeTicketId || preselectedTicketId)) ||
    null;
  const workflowTicket = selectedTicket || allTickets[0] || null;
  const createdEstimateTicketId = visibleCreatedEstimate?.repairTicketId || visibleCreatedEstimate?.ticketId || "";

  return (
    <OperationsWorkflowPage current="estimate" ticket={workflowTicket} ticketId={createdEstimateTicketId || preselectedTicketId || activeTicketId} showContinue={false} showSummary={false}>
      <PageHeader title="Repair Estimates" description="Initial diagnosis, estimated repair cost, customer discussion, and estimated delivery time." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
        <div className="space-y-5">
          <Card className="border border-slate-200/80 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-[#1769aa]" />
                <CardTitle className="text-lg font-bold text-slate-900">Estimate Candidates</CardTitle>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Select a repair ticket below to fill and create an estimate proposal
              </p>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {tickets.map((ticket) => {
                const latestEstimate = ticket.latestEstimate || ticket.estimates?.[0] || null;
                const selected = ticket.id === activeTicketId;

                return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={cn(
                    "w-full rounded-lg border p-3.5 text-left transition",
                    selected
                      ? "border-blue-500 bg-blue-50/70 shadow-sm ring-1 ring-blue-400"
                      : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                  )}
                >
                  <div className="flex justify-between gap-3 items-start">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-slate-900 flex items-center gap-1.5">
                        {ticketLabel(ticket)}
                        {selected && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-extrabold text-white tracking-wider">
                            SELECTED
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">{ticket.title}</p>
                      {ticket.customer?.fullName && (
                        <p className="text-xs text-slate-400 mt-0.5">Customer: {ticket.customer.fullName}</p>
                      )}
                      {latestEstimate?.id ? (
                        <span className="mt-2 block text-xs font-bold text-[#1769aa]">
                          {latestEstimate.estimateNumber || "Open estimate"} · {formatCurrency(latestEstimate.totalAmount)}
                        </span>
                      ) : null}
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                </button>
                );
              })}
              {!tickets.length ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  {isLoading ? "Loading estimate candidates..." : "No tickets are currently ready for estimate creation."}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border border-slate-200/80 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" />
                <CardTitle className="text-lg font-bold text-slate-900">Estimate History</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {estimateHistory.map((estimate) => {
                const ticketId = estimate.repairTicketId || estimate.ticketId || estimate.ticket?.id || "";
                return (
                  <div key={estimate.id} className="rounded-lg border border-slate-200 p-3.5 bg-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-bold text-slate-900">{estimate.ticket ? ticketLabel(estimate.ticket) : "Repair ticket"}</p>
                        <p className="mt-1 text-xs text-slate-500 font-semibold">
                          {estimate.estimateNumber || "Estimate"} · {formatCurrency(estimate.totalAmount)}
                        </p>
                      </div>
                      <StatusBadge status={estimate.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link to={`/repair/estimates/${estimate.id}`}>
                        <Button size="sm" variant="secondary" type="button" className="h-8 text-xs">View Estimate</Button>
                      </Link>
                      {estimate.status === "APPROVED" ? (
                        <Link to={`/assignments?ticketId=${ticketId}`}>
                          <Button size="sm" type="button" className="h-8 text-xs">Go to Assignment</Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {!estimateHistory.length ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  No estimates have been created yet. Created and approved estimates will appear here.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* CREATE ESTIMATE FORM COLUMN */}
        <Card className="border border-blue-200/80 shadow-md self-start">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[#1769aa]" />
              <CardTitle className="text-lg font-bold text-slate-900">Create Estimate Proposal</CardTitle>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Fill in repair diagnosis, parts cost, and labor cost</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <form
              key={`${activeTicketId}-${selectedTicketDetails?.id || "candidate"}`}
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const repairNote = String(form.get("repairNote") || "").trim();
                mutation.mutate({
                  ticketId: form.get("ticketId"),
                  payload: {
                    diagnosis: {
                      diagnosis: repairNote,
                      estimatedRepairNotes: repairNote,
                      estimatedTurnaroundHours: Number(form.get("estimatedTurnaroundHours") || 24),
                    },
                    items: [
                      { itemType: "LABOR", name: "Labor Cost", quantity: 1, unitAmount: Number(form.get("laborCost") || 0) },
                      { itemType: "PART", name: "Parts Cost", quantity: 1, unitAmount: Number(form.get("partsCost") || 0) },
                    ],
                    notes: repairNote,
                  },
                });
              }}
            >
              <input type="hidden" name="ticketId" value={activeTicketId} />

              {selectedTicket ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3.5 space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">Selected Ticket for Estimate</p>
                  <p className="font-bold text-slate-900 text-base">{ticketLabel(selectedTicket)}</p>
                  <p className="text-xs text-slate-700 font-semibold">{selectedTicket.title || "Selected repair"}</p>
                  {selectedTicket.customer?.fullName && (
                    <p className="text-xs text-slate-500">Customer: <span className="font-medium text-slate-800">{selectedTicket.customer.fullName}</span></p>
                  )}
                  {activeTicketQuery.isLoading ? <p className="mt-1 text-xs text-blue-700 animate-pulse">Loading repair details...</p> : null}
                </div>
              ) : null}

              {!createCandidates.length ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No tickets are eligible for estimate creation right now.
                </p>
              ) : null}

              <Field label="Diagnosis & Repair Notes">
                <Textarea
                  name="repairNote"
                  placeholder="Enter initial diagnosis, estimated repair requirements, or customer discussion notes..."
                  required
                  rows={3}
                  disabled={!createCandidates.length}
                  defaultValue={estimateNoteFromTicket(selectedTicket)}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Turnaround (Hrs)">
                  <Input
                    name="estimatedTurnaroundHours"
                    type="number"
                    defaultValue="24"
                    min="1"
                    placeholder="24"
                    disabled={!createCandidates.length}
                  />
                </Field>
                <Field label="Labor Cost (₹)">
                  <Input
                    name="laborCost"
                    type="number"
                    defaultValue="0"
                    min="0"
                    placeholder="0"
                    disabled={!createCandidates.length}
                  />
                </Field>
                <Field label="Parts Cost (₹)">
                  <Input
                    name="partsCost"
                    type="number"
                    defaultValue="0"
                    min="0"
                    placeholder="0"
                    disabled={!createCandidates.length}
                  />
                </Field>
              </div>

              <Button
                className="w-full h-11 text-xs sm:text-sm font-bold gap-2 bg-[#1769aa] hover:bg-[#125388]"
                disabled={mutation.isPending || createCandidates.length === 0}
              >
                {mutation.isPending ? "Submitting Estimate..." : "Create & Submit Estimate"}
              </Button>
            </form>

            {visibleCreatedEstimate ? (
              <div className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-sm">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Estimate Approved!
                </div>
                <div>
                  <StatusBadge status={visibleCreatedEstimateStatus} />
                  <p className="mt-2 font-bold text-slate-900 text-base">Total Estimate: {formatCurrency(visibleCreatedEstimate.totalAmount)}</p>
                  <p className="mt-0.5 text-xs text-slate-600">Estimate is ready. Next step: assign a technician to begin work.</p>
                </div>
                <Link to={`/assignments?ticketId=${visibleCreatedEstimate.repairTicketId || visibleCreatedEstimate.ticketId || ""}`}>
                  <Button className="w-full h-10 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" type="button">
                    Go to Assignment
                  </Button>
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </OperationsWorkflowPage>
  );
}

export function EstimateDetails({ id }) {
  const { data } = useQuery({ queryKey: ["estimate", id], queryFn: () => repairApi.getEstimate(id), enabled: Boolean(id) });
  const estimate = firstObject(data, ["estimate"]);

  // Fetch ticket details dynamically
  const ticketQuery = useQuery({
    queryKey: ["repair-ticket-estimate-details", estimate?.repairTicketId],
    queryFn: () => repairApi.get(estimate.repairTicketId),
    enabled: Boolean(estimate?.repairTicketId),
  });
  const ticket = ticketQuery.data?.data?.ticket || ticketQuery.data?.data || null;

  const items = estimate.items || estimate.estimateItems || [];
  const history = estimate.auditLogs || estimate.statusLogs || [
    estimate.createdAt ? { id: "created", type: "CREATED", createdAt: estimate.createdAt } : null,
    estimate.approvedAt ? { id: "approved", type: "APPROVED", createdAt: estimate.approvedAt } : null,
    estimate.rejectedAt ? { id: "rejected", type: "REJECTED", createdAt: estimate.rejectedAt } : null,
  ].filter(Boolean);

  if (!estimate?.id) return <p className="text-sm text-[var(--muted)]">Loading estimate...</p>;

  const device = ticket?.items?.[0] || null;
  const issues = ticket?.issues || [];

  // Variance calculations
  const estimatedCost = Number(estimate.totalAmount || 0);
  const approvedCost = estimate.status === "APPROVED" ? Number(estimate.totalAmount || 0) : 0;
  const actualCost = Number(ticket?.totalRepairCost || 0);
  const variance = actualCost - approvedCost;

  return (
    <>
      <PageHeader title={estimate.estimateNumber || "Estimate Details"} description="Comprehensive estimate proposal, customer approval state, and actual operation cost comparison." />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {/* Main Info Strip */}
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 py-4">
              <Info label="Status" value={<StatusBadge status={estimate.status} />} />
              <Info label="Labor Estimate" value={formatCurrency(estimate.laborAmount)} />
              <Info label="Parts Estimate" value={formatCurrency(estimate.partsAmount)} />
              <Info label="Tax & Discount" value={`${formatCurrency(estimate.taxAmount)} / -${formatCurrency(estimate.discountAmount)}`} />
              <Info label="Final Estimate" value={<span className="font-bold text-slate-800">{formatCurrency(estimate.totalAmount)}</span>} />
            </CardContent>
          </Card>

          {/* Customer, Ticket, Device and Problem Details */}
          {ticket && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase font-bold text-slate-500">Customer & Ticket Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div>
                    <span className="text-slate-500 font-medium">Customer:</span>{" "}
                    <span className="font-semibold text-slate-800">{ticket.customer?.fullName}</span>
                  </div>
                  {ticket.customer?.phone && (
                    <div>
                      <span className="text-slate-500 font-medium">Phone:</span>{" "}
                      <span className="text-slate-700">{ticket.customer.phone}</span>
                    </div>
                  )}
                  {ticket.customer?.email && (
                    <div>
                      <span className="text-slate-500 font-medium">Email:</span>{" "}
                      <span className="text-slate-700">{ticket.customer.email}</span>
                    </div>
                  )}
                  <hr className="border-slate-100 my-2" />
                  <div>
                    <span className="text-slate-500 font-medium">Ticket ID / Code:</span>{" "}
                    <span className="font-semibold text-slate-800">{ticket.ticketNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Ticket Title:</span>{" "}
                    <span className="text-slate-700">{ticket.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Priority:</span>{" "}
                    <span className="font-semibold text-slate-800">{ticket.priority}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase font-bold text-slate-500">Device & Problems Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {device ? (
                    <>
                      <div>
                        <span className="text-slate-500 font-medium">Item Type:</span>{" "}
                        <span className="font-semibold text-slate-800">{device.itemType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Brand & Model:</span>{" "}
                        <span className="text-slate-700">{device.brand} {device.model}</span>
                      </div>
                      {(device.serialNumber || device.imei) && (
                        <div>
                          <span className="text-slate-500 font-medium">SN / IMEI:</span>{" "}
                          <span className="text-slate-700 font-mono text-xs">{device.serialNumber || device.imei}</span>
                        </div>
                      )}
                      {device.condition && (
                        <div>
                          <span className="text-slate-500 font-medium">Intake Condition:</span>{" "}
                          <span className="text-slate-700 text-xs">{device.condition}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-400 italic">No device details found.</p>
                  )}
                  <hr className="border-slate-100 my-2" />
                  <div>
                    <span className="text-slate-500 font-medium">Problem Description:</span>
                    <p className="text-slate-700 text-xs mt-1 bg-slate-50 p-2 rounded max-h-16 overflow-y-auto">
                      {ticket.description || "No description provided"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Admin Comparison vs Actual Cost Variance Console */}
          {ticket && (
            <Card className="border-indigo-100 bg-indigo-50/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-black tracking-wide text-indigo-700 flex items-center gap-1.5">
                  Cost Variance Console (Estimated vs Actual)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Estimated Cost</p>
                    <p className="text-base font-bold text-slate-800 mt-1">{formatCurrency(estimatedCost)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Approved Cost</p>
                    <p className="text-base font-bold text-slate-800 mt-1">{formatCurrency(approvedCost)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Actual Cost</p>
                    <p className="text-base font-bold text-slate-800 mt-1">{formatCurrency(actualCost)}</p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border shadow-sm",
                    variance > 0 ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"
                  )}>
                    <p className="text-[10px] font-bold uppercase">Cost Variance</p>
                    <p className="text-base font-black font-mono mt-1">
                      {variance > 0 ? "+" : ""}{formatCurrency(variance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diagnosis & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs uppercase font-bold text-slate-500">Technician Repair Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-700 space-y-2">
                <div>
                  <span className="font-semibold text-slate-600 block">Diagnosis:</span>
                  <p className="mt-1 bg-slate-50 p-2.5 rounded min-h-12 italic text-slate-800">
                    {ticket?.diagnosis || "No diagnosis logged yet."}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 block">Repair notes:</span>
                  <p className="mt-1 bg-slate-50 p-2.5 rounded min-h-12 italic text-slate-800">
                    {ticket?.repairNotes || "No technical notes logged yet."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs uppercase font-bold text-slate-500">Admin Estimate Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-700">
                <span className="font-semibold text-slate-600 block">Estimate notes:</span>
                <p className="mt-1 bg-slate-50 p-2.5 rounded min-h-12 italic text-slate-800">
                  {estimate.notes || "No estimate notes provided."}
                </p>
                {estimate.approvedAt && (
                  <div className="mt-4 text-[11px] text-slate-500">
                    Approved date: {new Date(estimate.approvedAt).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Estimate Line Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <thead>
                  <tr>
                    <Th>Item</Th>
                    <Th>Type</Th>
                    <Th>Quantity</Th>
                    <Th>Unit</Th>
                    <Th>Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id || index}>
                      <Td>{item.name}</Td>
                      <Td>{item.itemType}</Td>
                      <Td>{String(item.quantity)}</Td>
                      <Td>{formatCurrency(item.unitAmount)}</Td>
                      <Td>{formatCurrency(item.totalAmount)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle>Estimate History</CardTitle></CardHeader><CardContent><Timeline items={history} /></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Next Step</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--muted)]">Estimate is approved. Assign a technician, then record repair work before parts usage.</p>
            {estimate.status === "APPROVED" && estimate.repairTicketId ? (
              <Link to={`/assignments?ticketId=${estimate.repairTicketId}`}>
                <Button className="w-full" type="button">Go to Assignment</Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><div className="mt-1 text-sm">{value}</div></div>;
}
