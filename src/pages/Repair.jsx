import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { BadgePlus, Calculator, Search } from "lucide-react";
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
      <PageHeader title="Repair" description="Technician execution workspace for status, timeline, notes, progress, device condition, and quality review." />
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
  const [estimateTicket, setEstimateTicket] = useState(null);
  const [openEstimateModal, setOpenEstimateModal] = useState(false);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair"] });
      setOpenEstimateModal(false);
      setEstimateTicket(null);
    },
  });

  const pendingQuery = useQuery({
    queryKey: ["repair", "pending-estimates"],
    queryFn: () => repairApi.list({ limit: 100 }),
  });

  const allTickets = unwrapArray(pendingQuery.data, ["tickets"]);
  const estimateStatuses = ["RECEIVED", "DIAGNOSING", "ESTIMATE_PENDING"];
  const pendingTickets = allTickets.filter(
    (t) => estimateStatuses.includes(t.status) && (!t.estimates || t.estimates.length === 0)
  );

  const createdTicket = mutation.data?.data?.ticket;

  return (
    <OperationsWorkflowPage current="customer" ticket={createdTicket} showContinue={false}>
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

            {createdTicket ? (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900 md:flex-row md:items-center md:justify-between">
                <span className="font-semibold">
                  Repair Created: <span className="font-bold">{ticketLabel(createdTicket)}</span>
                </span>
                <Button
                  size="sm"
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={() => {
                    setEstimateTicket(createdTicket);
                    setOpenEstimateModal(true);
                  }}
                >
                  + Add Estimate Now
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg font-bold text-slate-900">Pending Estimates</CardTitle>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {pendingTickets.length} Pending
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Tickets waiting for repair cost & labor estimate</p>
          </CardHeader>
          <CardContent className="pt-4">
            {pendingTickets.length ? (
              <div className="divide-y divide-slate-100">
                {pendingTickets.map((t) => (
                  <div key={t.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {ticketLabel(t)}
                        <StatusBadge status={t.status} />
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">{t.title}</p>
                      {t.customer?.fullName && (
                        <p className="text-xs text-slate-400">Customer: {t.customer.fullName}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      type="button"
                      className="bg-[#1769aa] hover:bg-[#125388] text-white font-bold text-xs h-9 px-4"
                      onClick={() => {
                        setEstimateTicket(t);
                        setOpenEstimateModal(true);
                      }}
                    >
                      + Create Estimate
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No tickets currently pending estimate creation.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {openEstimateModal && estimateTicket ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-[#1769aa]" />
                  Create Estimate for {ticketLabel(estimateTicket)}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {estimateTicket.title} {estimateTicket.customer?.fullName ? `· Customer: ${estimateTicket.customer.fullName}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenEstimateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
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
              className="space-y-4"
            >
              <Field label="Diagnosis & Repair Notes">
                <Textarea
                  name="repairNote"
                  placeholder="Enter initial diagnosis, estimated repair requirements, or customer discussion notes..."
                  required
                  rows={3}
                  defaultValue={estimateTicket.description || ""}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Turnaround (Hrs)">
                  <Input name="estimatedTurnaroundHours" type="number" defaultValue="24" min="1" required />
                </Field>
                <Field label="Labor Cost (₹)">
                  <Input name="laborCost" type="number" defaultValue="0" min="0" required />
                </Field>
                <Field label="Parts Cost (₹)">
                  <Input name="partsCost" type="number" defaultValue="0" min="0" required />
                </Field>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpenEstimateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1769aa] hover:bg-[#125388] text-white font-bold"
                  disabled={estimateMutation.isPending}
                >
                  {estimateMutation.isPending ? "Submitting..." : "Submit Estimate"}
                </Button>
              </div>
            </form>
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
  const assigned = Boolean(ticket.assignedTechnicianName);
  const status = ticket.status;

  if (!assigned && !["DELIVERED", "CANCELLED", "CLOSED"].includes(status)) {
    return <Link to={`/assignments?ticketId=${ticket.id}`}><Button size="sm" type="button">Assign</Button></Link>;
  }

  if (["RECEIVED", "DIAGNOSING", "ESTIMATE_PENDING"].includes(status)) {
    return <Link to={`/repair/estimates?ticketId=${ticket.id}`}><Button size="sm" type="button">Estimate</Button></Link>;
  }

  if (["APPROVED", "IN_REPAIR", "WAITING_PARTS", "READY_FOR_REVIEW"].includes(status)) {
    return <Link to={`/repair?ticketId=${ticket.id}`}><Button size="sm" type="button">Technician Report</Button></Link>;
  }

  if (status === "READY_FOR_DELIVERY") {
    if (ticket.paymentStatus !== "PAID") {
      return <Link to={`/repair?ticketId=${ticket.id}`}><Button size="sm" type="button">Technician Report</Button></Link>;
    }

    return <Link to={`/handover?ticketId=${ticket.id}`}><Button size="sm" type="button">Handover</Button></Link>;
  }

  if (status === "DELIVERED") {
    return <span className="text-sm text-[var(--muted)]">Delivered</span>;
  }

  return <span className="text-sm text-[var(--muted)]">Review</span>;
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
          title="Technician report"
          description="Review technician work, used item parts, and final repair cost before billing."
        />
        <Link to="/repair">
          <Button type="button" variant="secondary">Back to Repairs</Button>
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
            <h3 className="text-lg font-black text-slate-950">Technician report</h3>
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
