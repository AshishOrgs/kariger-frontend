import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BadgePlus, Calculator, Search, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { OperationsWorkflowPage } from "@/components/workflow/OperationsWorkflow";
import { repairApi } from "@/services/modules";
import { formatCurrency, formatDate, unwrapArray } from "@/utils/cn";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import { getAllowedRepairTransitions, isActiveAssignment, ticketStatuses } from "@/utils/workflow";
import { ticketLabel } from "@/utils/ticketLabel";

export function Repair() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { data } = useQuery({ queryKey: ["repair", search, status], queryFn: () => repairApi.list({ search: search || undefined, status: status || undefined }) });
  const tickets = unwrapArray(data, ["tickets"]);
  const custodyQueries = useQueries({
    queries: tickets.map((ticket) => ({
      queryKey: ["repair", ticket.id, "current-custody"],
      queryFn: () => repairApi.currentCustody(ticket.id),
      enabled: Boolean(ticket.id),
    })),
  });
  const assignmentQueries = useQueries({
    queries: tickets.map((ticket) => ({
      queryKey: ["repair", ticket.id, "assignments"],
      queryFn: () => repairApi.assignments(ticket.id),
      enabled: Boolean(ticket.id),
    })),
  });
  const ticketsWithWorkflow = tickets.map((ticket, index) => {
    const withCustody = mergeTicketCustody(ticket, custodyQueries[index]?.data);
    return mergeTicketAssignment(withCustody, assignmentQueries[index]?.data);
  });
  const requestedTicketId = searchParams.get("ticketId") || "";
  const workflowTicket = ticketsWithWorkflow.find((ticket) => ticket.id === requestedTicketId) || null;
  const selectedTicketId = requestedTicketId;
  const selectedTicketQuery = useQuery({
    queryKey: ["repair", selectedTicketId],
    queryFn: () => repairApi.get(selectedTicketId),
    enabled: Boolean(selectedTicketId),
  });
  const selectedTicketRaw = selectedTicketQuery.data?.data?.ticket || selectedTicketQuery.data?.data || workflowTicket;
  const selectedTicket = selectedTicketRaw
    ? {
        ...selectedTicketRaw,
        assignedTechnicianName: selectedTicketRaw.assignedTechnicianName || workflowTicket?.assignedTechnicianName || getAssignedTechnicianName(selectedTicketRaw),
      }
    : null;
  const selectedPartsUsageQuery = useQuery({
    queryKey: ["parts-usage", selectedTicketId],
    queryFn: () => repairApi.partsUsage(selectedTicketId),
    enabled: Boolean(selectedTicketId),
  });
  const selectedPartsUsage = unwrapArray(selectedPartsUsageQuery.data, ["partsUsage", "usages", "usage"]);

  if (requestedTicketId) {
    return <TechnicianReportView ticket={selectedTicket} partsUsage={selectedPartsUsage} isLoading={selectedTicketQuery.isLoading} />;
  }

  return (
    <OperationsWorkflowPage current="repair" ticket={workflowTicket} ticketId={requestedTicketId} showContinue={false} showSummary={false}>
      <PageHeader title="Technician Report" description="Technician execution workspace for status, timeline, notes, progress, device condition, and quality review." />
      <Card className="mb-4">
        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search repairs" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{ticketStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <DataTable
            rows={ticketsWithWorkflow}
            searchable={false}
            emptyTitle="No repair tickets"
            emptyDescription="Create a repair ticket to begin the workflow."
            columns={[
              { key: "ticketNumber", header: "Repair", render: (ticket) => <Link className="font-semibold text-[var(--primary)]" to={`/repair/${ticket.id}`}>{ticketLabel(ticket)}</Link> },
              { key: "customer", header: "Customer", render: (ticket) => ticket.customer?.fullName || ticket.customerId },
              { key: "device", header: "Device", render: (ticket) => ticket.items?.[0] ? `${ticket.items[0].brand || ""} ${ticket.items[0].model || ""}`.trim() || ticket.items[0].itemType : "Device" },
              { key: "status", header: "Status", render: (ticket) => <StatusBadge status={ticket.status} /> },
              { key: "priority", header: "Priority" },
              { key: "assigned", header: "Assigned Technician", render: (ticket) => ticket.assignedTechnicianName || "Unassigned" },
              { key: "paymentStatus", header: "Payment Status", render: (ticket) => <StatusBadge status={ticket.paymentStatus} /> },
              { key: "custody", header: "Current Custody Holder", render: (ticket) => <StatusBadge status={ticket.currentHolderType || "RECEPTION"} /> },
              { key: "next", header: "Next Step", render: (ticket) => <NextRepairStep ticket={ticket} /> },
            ]}
          />
        </CardContent>
      </Card>
    </OperationsWorkflowPage>
  );
}

export function CreateRepair() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [estimateTicket, setEstimateTicket] = useState(null);
  const [openEstimateModal, setOpenEstimateModal] = useState(false);
  const [redirectToAssign, setRedirectToAssign] = useState(false);
  const [detailTicket, setDetailTicket] = useState(null);
  const [openDetailModal, setOpenDetailModal] = useState(false);

  const mutation = useNotifyMutation({
    mutationFn: repairApi.create,
    successMessage: "Repair ticket created successfully.",
    limitResource: "devices",
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["repair"] });
      const newTicket = res?.data?.ticket;
      if (newTicket) {
        setEstimateTicket(newTicket);
        setOpenEstimateModal(true);
      }
    },
  });

  const estimateMutation = useNotifyMutation({
    mutationFn: ({ ticketId, payload }) => repairApi.createEstimate(ticketId, payload),
    successMessage: "Estimate created successfully.",
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["repair"] });
      setOpenEstimateModal(false);
      const targetTicketId = variables?.ticketId || estimateTicket?.id;
      setEstimateTicket(null);
      if (redirectToAssign && targetTicketId) {
        navigate(`/assignments?ticketId=${targetTicketId}`);
      }
    },
  });

  const pendingQuery = useQuery({
    queryKey: ["repair", "pending-estimates"],
    queryFn: () => repairApi.list({ limit: 100 }),
  });

  const allTickets = unwrapArray(pendingQuery.data, ["tickets"]);
  const pendingTickets = allTickets.filter((t) => {
    if (isTerminalTicketStatus(t.status)) return false;
    const hasEstimate = Array.isArray(t.estimates) && t.estimates.length > 0;
    const hasAssignment = (t.assignments || []).some(isActiveAssignment) || Boolean(t.assignedTechnicianName);
    return !hasEstimate || !hasAssignment;
  });

  const createdTicket = mutation.data?.data?.ticket;

  return (
    <OperationsWorkflowPage current="customer" ticket={createdTicket} showContinue={false} showSummary={false}>
      <PageHeader
        title="Repair Intake"
        description="Customer intake creates customer information, device registration, ticket details, and immediate estimate."
      />

      <div className="space-y-6">
        <Card className="border border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BadgePlus className="h-5 w-5 text-[#1769aa]" />
              New Repair Intake
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const itemName = String(form.get("itemName") || "").trim();
                const issueDescription = String(form.get("issueDescription") || "").trim();
                const itemIdentifier = String(form.get("itemIdentifier") || "").trim();
                const issueTitle = issueDescription.slice(0, 120) || `Issue with ${itemName}`;
                const identifierPayload = itemIdentifier
                  ? /^\d{14,16}$/.test(itemIdentifier)
                    ? { imei: itemIdentifier }
                    : { serialNumber: itemIdentifier }
                  : {};
                try {
                  await mutation.mutateAsync({
                    customer: { fullName: form.get("fullName"), phone: form.get("phone") },
                    title: `${itemName} repair`,
                    description: issueDescription,
                    priority: form.get("priority"),
                    items: [{ itemType: "PHONE", brand: itemName, model: itemName, ...identifierPayload }],
                    issues: [{ title: issueTitle, description: issueDescription }],
                  });
                  event.currentTarget.reset();
                } catch {
                }
              }}
            >
              <Input name="fullName" placeholder="Customer Name" required />
              <Input name="phone" placeholder="Phone Number" required />
              <Input name="itemName" placeholder="Device / Item Name" required />
              <Select name="priority" defaultValue="NORMAL">
                <option>LOW</option>
                <option>NORMAL</option>
                <option>HIGH</option>
                <option>URGENT</option>
              </Select>
              <Input className="md:col-span-2" name="itemIdentifier" placeholder="IMEI / Serial Number (optional)" />
              <Textarea className="md:col-span-2" name="issueDescription" placeholder="Issue Description / Problem Note" required rows={3} />
              <Button className="md:col-span-2 h-11 text-sm font-bold bg-[#1769aa] hover:bg-[#125388]" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating Repair Ticket..." : "Create Repair Ticket"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg font-bold text-slate-900">Pending Estimates & Assign Technician</CardTitle>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {pendingTickets.length} Pending
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Tickets waiting for repair cost estimate or technician assignment</p>
          </CardHeader>
          <CardContent className="pt-4">
            {pendingTickets.length ? (
              <div className="divide-y divide-slate-100">
                {pendingTickets.map((t) => {
                  const hasEstimate = Array.isArray(t.estimates) && t.estimates.length > 0;
                  const hasAssignment = (t.assignments || []).some(isActiveAssignment) || Boolean(t.assignedTechnicianName);

                  return (
                    <div key={t.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailTicket(t);
                              setOpenDetailModal(true);
                            }}
                            onDoubleClick={() => {
                              setOpenDetailModal(false);
                            }}
                            className="text-[#1769aa] hover:underline font-bold text-left cursor-pointer"
                            title="Click to view details, double-click to hide"
                          >
                            {ticketLabel(t)}
                          </button>
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">{t.title}</p>
                        {t.customer?.fullName && (
                          <p className="text-xs text-slate-400">Customer: {t.customer.fullName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Step 1: Estimate */}
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Step 1</span>
                          {hasEstimate ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                              ✓ Estimate Created
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              type="button"
                              className="bg-[#1769aa] hover:bg-[#125388] text-white font-bold text-xs h-9 px-3"
                              onClick={() => {
                                setEstimateTicket(t);
                                setOpenEstimateModal(true);
                              }}
                            >
                              + Create Estimate
                            </Button>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
                        {/* Step 2: Assign Technician */}
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Step 2</span>
                          <Link to={`/assignments?ticketId=${t.id}`}>
                            <Button
                              size="sm"
                              type="button"
                              className={
                                hasEstimate && !hasAssignment
                                  ? "bg-[#1769aa] hover:bg-[#125388] text-white font-bold text-xs h-9 px-3 animate-pulse"
                                  : "border border-slate-300 text-slate-600 font-bold text-xs h-9 px-3 hover:bg-slate-50"
                              }
                              variant={hasEstimate && !hasAssignment ? "default" : "secondary"}
                            >
                              Assign Technician
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No tickets currently pending estimate creation or technician assignment.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {openEstimateModal && estimateTicket ? (() => {
        const existingEst = Array.isArray(estimateTicket.estimates) && estimateTicket.estimates.length > 0 ? estimateTicket.estimates[0] : null;
        const existingLabor = existingEst?.items?.find((i) => i.itemType === "LABOR")?.unitAmount ?? (existingEst?.laborCost || 0);
        const existingParts = existingEst?.items?.find((i) => i.itemType === "PART")?.unitAmount ?? (existingEst?.partsCost || 0);
        const existingTurnaround = existingEst?.diagnosis?.estimatedTurnaroundHours || 24;
        const existingNotes = existingEst?.diagnosis?.diagnosis || existingEst?.notes || estimateTicket.description || "";
        const isEditMode = Boolean(existingEst);

        return (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
            <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="bg-[#1769aa] px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-white font-black text-xs">1</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      {isEditMode ? "Update Estimate" : "Create Estimate"}
                    </h2>
                    <p className="text-[11px] text-blue-100 mt-0.5">
                      {ticketLabel(estimateTicket)} · {estimateTicket.customer?.fullName || ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenEstimateModal(false)}
                  className="text-white/70 hover:text-white font-bold text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex border-b border-slate-100">
                <div className="flex-1 py-2 px-4 bg-blue-50 border-b-2 border-[#1769aa] text-center">
                  <span className="text-[11px] font-bold text-[#1769aa]">① Estimate Details</span>
                </div>
                <div className="flex-1 py-2 px-4 text-center">
                  <span className="text-[11px] font-bold text-slate-400">② Assign Technician</span>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const repairNote = String(form.get("repairNote") || "").trim();
                  estimateMutation.mutate({
                    ticketId: estimateTicket.id,
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
                className="p-5 space-y-4"
              >
                <Field label="Diagnosis & Repair Notes">
                  <Textarea
                    name="repairNote"
                    placeholder="Enter initial diagnosis, estimated repair requirements, or customer discussion notes..."
                    required
                    rows={3}
                    defaultValue={existingNotes}
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Turnaround (Hrs)">
                    <Input name="estimatedTurnaroundHours" type="number" defaultValue={existingTurnaround} min="1" required />
                  </Field>
                  <Field label="Labor Cost (₹)">
                    <Input name="laborCost" type="number" defaultValue={existingLabor} min="0" required />
                  </Field>
                  <Field label="Parts Cost (₹)">
                    <Input name="partsCost" type="number" defaultValue={existingParts} min="0" required />
                  </Field>
                </div>

                {/* Primary action: Save Estimate */}
                <Button
                  type="submit"
                  className="w-full h-11 bg-[#1769aa] hover:bg-[#125388] text-white font-bold text-sm"
                  disabled={estimateMutation.isPending}
                  onClick={() => setRedirectToAssign(false)}
                >
                  {estimateMutation.isPending && !redirectToAssign
                    ? "Saving..."
                    : isEditMode
                    ? "✓ Update Estimate"
                    : "✓ Save Estimate"}
                </Button>

                {/* Secondary action: Save + go to assign */}
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-bold text-[#1769aa] hover:text-[#125388] underline underline-offset-2 transition-colors"
                  disabled={estimateMutation.isPending}
                  onClick={() => setRedirectToAssign(true)}
                >
                  {estimateMutation.isPending && redirectToAssign
                    ? "Saving..."
                    : "Save Estimate & go to Assign Technician →"}
                </button>

                <button
                  type="button"
                  className="w-full py-1 text-xs text-slate-400 hover:text-slate-600"
                  onClick={() => setOpenEstimateModal(false)}
                >
                  Cancel — fill later from Pending Estimates & Assign Technician
                </button>
              </form>
            </div>
          </div>
        );
      })() : null}

      {openDetailModal && detailTicket ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
          onDoubleClick={() => setOpenDetailModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setOpenDetailModal(false);
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#1769aa] px-2.5 py-1 text-xs font-black text-white">
                  {ticketLabel(detailTicket)}
                </span>
                <StatusBadge status={detailTicket.status || "RECEIVED"} />
              </div>
              <button
                type="button"
                onClick={() => setOpenDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Customer</span>
                <span className="mt-0.5 block text-xs font-bold text-slate-900">{detailTicket.customer?.fullName || detailTicket.customerId || "N/A"}</span>
                {detailTicket.customer?.phone && <span className="text-[11px] text-slate-500">{detailTicket.customer.phone}</span>}
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Device</span>
                <span className="mt-0.5 block text-xs font-bold text-slate-900">{detailTicket.items?.[0] ? `${detailTicket.items[0].brand || ""} ${detailTicket.items[0].model || ""}`.trim() || detailTicket.items[0].itemType : detailTicket.title || "Device"}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">IMEI / Serial</span>
                <span className="mt-0.5 block text-xs font-bold text-slate-900 font-mono">{detailTicket.items?.[0]?.imei || detailTicket.items?.[0]?.serialNumber || "N/A"}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Assigned Technician</span>
                <span className="mt-0.5 block text-xs font-bold text-slate-900">{detailTicket.assignedTechnicianName || "Unassigned"}</span>
              </div>
            </div>

            {detailTicket.description && (
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Issue Note</span>
                <p className="mt-1 text-slate-700 font-medium whitespace-pre-wrap">{detailTicket.description}</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </OperationsWorkflowPage>
  );
}

export function RepairDetails({ id }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["repair", id], queryFn: () => repairApi.get(id), enabled: Boolean(id) });
  const custodyQuery = useQuery({ queryKey: ["repair", id, "current-custody"], queryFn: () => repairApi.currentCustody(id), enabled: Boolean(id) });
  const ticket = mergeTicketCustody(data?.data?.ticket || data?.data, custodyQuery.data);
  const allowedTransitions = getAllowedRepairTransitions(ticket?.status);
  const statusMutation = useNotifyMutation({ mutationFn: (payload) => repairApi.updateStatus(id, payload), successMessage: "Repair status updated.", onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repair", id] }) });

  if (!ticket) return <p className="text-sm text-[var(--muted)]">Loading repair...</p>;

  return (
    <>
      <PageHeader title={ticket.ticketNumber} description={ticket.title} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card><CardContent className="grid gap-4 md:grid-cols-3"><Info label="Customer" value={ticket.customer?.fullName || ticket.customerId} /><Info label="Status" value={<StatusBadge status={ticket.status} />} /><Info label="Priority" value={ticket.priority} /><Info label="Payment Status" value={<StatusBadge status={ticket.paymentStatus} />} /><Info label="Current Holder" value={<StatusBadge status={ticket.currentHolderType || "RECEPTION"} />} /><Info label="Location" value={ticket.currentLocation || "Not set"} /></CardContent></Card>
        <Card><CardContent>{allowedTransitions.length ? <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); statusMutation.mutate({ status: form.get("status"), reason: form.get("reason") }); }}><Select name="status" defaultValue={allowedTransitions[0]}>{allowedTransitions.map((status) => <option key={status}>{status}</option>)}</Select><Input name="reason" placeholder="Reason" /><Button className="w-full" disabled={statusMutation.isPending}>Update Status</Button></form> : <p className="text-sm text-[var(--muted)]">No backend-valid status transitions are available from {ticket.status}.</p>}</CardContent></Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card><CardContent className="p-0"><Table><thead><tr><Th>Item Type</Th><Th>Brand</Th><Th>Model</Th><Th>Serial / IMEI</Th><Th>Condition</Th></tr></thead><tbody>{(ticket.items || []).map((item, index) => <tr key={item.id || index}><Td>{item.itemType}</Td><Td>{item.brand || "Not set"}</Td><Td>{item.model || "Not set"}</Td><Td>{item.serialNumber || item.imei || "Not set"}</Td><Td>{item.condition || "Not set"}</Td></tr>)}</tbody></Table></CardContent></Card>
        <Card><CardContent className="p-0"><Table><thead><tr><Th>Issue</Th><Th>Description</Th><Th>Confirmed</Th></tr></thead><tbody>{(ticket.issues || []).map((issue, index) => <tr key={issue.id || index}><Td>{issue.title}</Td><Td>{issue.description || "Not set"}</Td><Td>{issue.isConfirmed ? "Yes" : "No"}</Td></tr>)}</tbody></Table></CardContent></Card>
      </div>
    </>
  );
}

function NextRepairStep({ ticket }) {
  const status = ticket.status;

  if (["DELIVERED", "CANCELLED", "CLOSED"].includes(status)) {
    return <span className="text-sm text-[var(--muted)]">{status}</span>;
  }

  return (
    <Link to={`/repair?ticketId=${ticket.id}`}>
      <Button size="sm" type="button" className="bg-[#1769aa] hover:bg-[#125388] text-white font-bold">
        Technician Report
      </Button>
    </Link>
  );
}

function TechnicianReportView({ ticket, partsUsage = [], isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Technician report" description="Loading technician report..." />
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--muted)]">Loading report...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticket?.id) {
    return (
      <div className="space-y-5">
        <PageHeader title="Technician report" description="Repair ticket report was not found." />
        <Card>
          <CardContent>
            <p className="text-sm text-[var(--muted)]">No technician report is available for this ticket.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const technicianName = getReportTechnicianName(ticket, partsUsage);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Technician Report"
          description="Review technician work, used item parts, and final repair cost before billing."
        />
        <Link to="/repair">
          <Button type="button" variant="secondary">← Back to Technician Report</Button>
        </Link>
      </div>

      <Card className="border-l-4 border-l-[var(--primary)]">
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <SummaryBlock label="Ticket ID" value={ticketLabel(ticket)} />
            <SummaryBlock label="Technician Name" value={technicianName} />
            <SummaryBlock label="Status" value={<StatusBadge status={ticket.status} />} />
            <SummaryBlock label="Extra Cost" value={formatCurrency(ticket.extraCost)} />
            <SummaryBlock label="Parts Total" value={formatCurrency(getPartsTotal(partsUsage))} />
          </div>
          <div className="mt-4 flex justify-end">
            <Link to={`/billing?ticketId=${ticket.id}`}>
              <Button type="button">Go to Billing / Invoicing</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <TechnicianReportPanel ticket={{ ...ticket, assignedTechnicianName: technicianName }} partsUsage={partsUsage} />
    </div>
  );
}

function TechnicianReportPanel({ ticket, partsUsage = [] }) {
  if (!ticket?.id) {
    return null;
  }

  const partsTotal = getPartsTotal(partsUsage);
  const technicianReport = ticket.diagnosis || ticket.workPerformed || ticket.repairNotes || "";

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">Technician Report</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Read-only repair report and used item parts submitted for this ticket.
            </p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Technician Report</p>
          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-900">
            {technicianReport || "No technician report submitted yet."}
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
          <SummaryBlock label="Extra Cost" value={formatCurrency(ticket.extraCost)} />
          <SummaryBlock label="Why Extra Cost?" value={ticket.extraCostReason} />
        </div>

        <div className="mt-4 rounded-md border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">Used Item Parts</p>
            <p className="text-sm font-bold text-slate-950">{formatCurrency(partsTotal)}</p>
          </div>
          {partsUsage.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Part</Th>
                  <Th>Technician</Th>
                  <Th>Qty</Th>
                  <Th>Cost</Th>
                  <Th>Used At</Th>
                </tr>
              </thead>
              <tbody>
                {partsUsage.map((usage, index) => (
                  <tr key={usage.id || index}>
                    <Td>{usage.inventoryItem?.partName || usage.partName || usage.partSku || "Part"}</Td>
                    <Td>{usage.technician?.fullName || usage.technician?.name || "Technician"}</Td>
                    <Td>{String(usage.quantity)}</Td>
                    <Td>{formatCurrency(usage.totalCost || Number(usage.quantity || 0) * Number(usage.unitCost || 0))}</Td>
                    <Td>{formatDate(usage.usedAt || usage.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="p-3 text-sm text-[var(--muted)]">No consumed parts recorded yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryBlock({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-900">{value || "Not recorded"}</p>
    </div>
  );
}

function getPartsTotal(partsUsage = []) {
  return partsUsage.reduce((sum, usage) => sum + Number(usage.totalCost || Number(usage.quantity || 0) * Number(usage.unitCost || 0)), 0);
}

function getAssignedTechnicianName(ticket) {
  const activeAssignment = (ticket?.assignments || []).find(isActiveAssignment) || ticket?.assignments?.[0];
  return getTechnicianName(activeAssignment);
}

function getReportTechnicianName(ticket, partsUsage = []) {
  const usageTechnician = partsUsage.find((usage) => usage.technician)?.technician;
  return (
    ticket?.assignedTechnicianName ||
    usageTechnician?.fullName ||
    usageTechnician?.name ||
    getAssignedTechnicianName(ticket) ||
    "Not recorded"
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><div className="mt-1 text-sm">{value}</div></div>;
}

function mergeTicketCustody(ticket, custodyData) {
  if (!ticket) return ticket;

  const custodyTicket = custodyData?.data?.ticket;
  const custody = custodyData?.data?.custody;

  return {
    ...ticket,
    currentHolderType: custody?.currentHolderType || custodyTicket?.currentHolderType || ticket.currentHolderType,
    currentHolderId: custody?.currentHolderId || custodyTicket?.currentHolderId || ticket.currentHolderId,
    currentLocation: custody?.currentLocation || custodyTicket?.currentLocation || ticket.currentLocation,
    lastHandoverAt: custody?.lastHandoverAt || custodyTicket?.lastHandoverAt || ticket.lastHandoverAt,
  };
}

function mergeTicketAssignment(ticket, assignmentData) {
  if (!ticket) return ticket;

  const assignmentRecords = unwrapArray(assignmentData, ["assignments", "history", "logs"]);
  const activeAssignment =
    assignmentRecords.find(isActiveAssignment) ||
    (ticket.assignments || []).find(isActiveAssignment) ||
    assignmentRecords[0] ||
    ticket.assignments?.[0];

  return {
    ...ticket,
    assignedTechnicianName: getTechnicianName(activeAssignment),
  };
}

function getTechnicianName(assignment) {
  const staff = assignment?.assignedTo || assignment?.technician || assignment?.assignedToStaff;
  return (
    staff?.fullName ||
    staff?.name ||
    assignment?.assignedToName ||
    assignment?.technicianName ||
    assignment?.assignedToStaffName ||
    ""
  );
}
