import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select, Textarea, Field } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { CustodyTimeline } from "@/components/ui/CustodyTimeline";
import { OperationsWorkflowPage } from "@/components/workflow/OperationsWorkflow";
import { repairApi, vendorsApi } from "@/services/modules";
import { cn, unwrapArray } from "@/utils/cn";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import { getValidHandoverTypes } from "@/utils/workflow";
import { ticketLabel } from "@/utils/ticketLabel";

export function Handover() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedTicketId, setSelectedTicketId] = useState(searchParams.get("ticketId") || "");
  const [lastHandoverTicketId, setLastHandoverTicketId] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  const { data } = useQuery({ queryKey: ["repair", "", ""], queryFn: () => repairApi.list({ limit: 50 }), staleTime: 2 * 60_000 });
  const vendorsQuery = useQuery({ queryKey: ["vendors"], queryFn: () => vendorsApi.list(), staleTime: 5 * 60_000 });

  const tickets = unwrapArray(data, ["tickets"]);

  // Filter ONLY tickets where payment is completed (PAID)
  const paidTickets = tickets.filter(
    (t) => t.paymentStatus === "PAID" || (Array.isArray(t.invoices) && t.invoices.some((i) => i.status === "PAID"))
  );

  const pendingTickets = paidTickets.filter((t) => !["DELIVERED", "CLOSED"].includes(t.status));
  const completedTickets = paidTickets.filter((t) => ["DELIVERED", "CLOSED"].includes(t.status));

  const visibleTickets = activeTab === "pending" ? pendingTickets : completedTickets;
  const vendors = unwrapArray(vendorsQuery.data, ["vendors"]);
  const activeTicketId = selectedTicketId || visibleTickets[0]?.id || paidTickets[0]?.id || "";
  const activeTicket = visibleTickets.find((ticket) => ticket.id === activeTicketId) || paidTickets.find((ticket) => ticket.id === activeTicketId);
  const validHandoverTypes = getValidHandoverTypes(activeTicket);

  const mutation = useNotifyMutation({
    mutationFn: ({ ticketId, payload }) => repairApi.handover(ticketId, payload),
    successMessage: "Handover recorded successfully.",
    onSuccess: async (_data, variables) => {
      setLastHandoverTicketId(variables.ticketId);
      await refreshHandoverWorkflowQueries(queryClient, variables.ticketId);
    },
  });

  const closeMutation = useNotifyMutation({
    mutationFn: (ticketId) => repairApi.updateStatus(ticketId, { status: "CLOSED", reason: "Repair delivered and closed from handover workflow." }),
    successMessage: "Repair closed successfully.",
    onSuccess: (_data, ticketId) => refreshHandoverWorkflowQueries(queryClient, ticketId),
  });

  return (
    <OperationsWorkflowPage current="handover" ticket={activeTicket} ticketId={activeTicketId} showSummary={false}>
      <PageHeader title="Handover" description="Customer delivery confirmation, custody history, and customer signature and delivery notes." />
      
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900">Handover Queue</CardTitle>
            </div>
            {/* Tabs */}
            <div className="mt-3 flex gap-2 border-b border-slate-200 pb-1">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer",
                  activeTab === "pending"
                    ? "bg-[#1769aa] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                Pending Handovers ({pendingTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("completed")}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer",
                  activeTab === "completed"
                    ? "bg-[#1769aa] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                Completed Handovers ({completedTickets.length})
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {visibleTickets.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Ticket</Th>
                    <Th>Customer</Th>
                    <Th>Status</Th>
                    <Th>Current Holder</Th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={cn(
                        "hover:bg-slate-50/60 cursor-pointer",
                        ticket.id === activeTicketId ? "bg-blue-50/40" : ""
                      )}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <Td>
                        <button className="text-left font-bold text-[#1769aa]" type="button">
                          {ticketLabel(ticket)}
                        </button>
                      </Td>
                      <Td className="font-semibold text-slate-800">{ticket.customer?.fullName || "Customer"}</Td>
                      <Td><StatusBadge status={ticket.status} /></Td>
                      <Td><StatusBadge status={ticket.currentHolderType || "RECEPTION"} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <div className="p-6">
                <EmptyState
                  title={activeTab === "pending" ? "No pending handovers" : "No completed handovers"}
                  description={
                    activeTab === "pending"
                      ? "Only repair tickets with completed payments appear here for customer delivery."
                      : "Delivered or closed repairs will appear here in the completed log."
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        <HandoverForm
          activeTicketId={activeTicketId}
          mutation={mutation}
          onTicketChange={setSelectedTicketId}
          tickets={pendingTickets}
          validTypes={validHandoverTypes}
          vendors={vendors}
        />
      </div>

      {lastHandoverTicketId ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Delivery handover recorded. Final step: close the repair.</span>
            <Button type="button" size="sm" disabled={closeMutation.isPending} onClick={() => closeMutation.mutate(lastHandoverTicketId)}>
              Close Repair
            </Button>
          </div>
        </div>
      ) : null}
      
      {activeTicketId ? <div className="mt-5"><CustodyTimeline ticketId={activeTicketId} /></div> : null}
    </OperationsWorkflowPage>
  );
}

function getActiveTechnicianName(ticket, fallbackTicket) {
  const target = ticket || fallbackTicket;
  if (!target) return "Unassigned";
  if (target.assignedTechnicianName) return target.assignedTechnicianName;

  const activeAssignment = (target.assignments || []).find(
    (a) => !a.unassignedAt && ["ASSIGNED", "REASSIGNED", "IN_PROGRESS", "PAUSED", "COMPLETED"].includes(a.status || a.type)
  ) || target.assignments?.[0];

  const staff = activeAssignment?.assignedTo || activeAssignment?.technician || activeAssignment?.assignedToStaff;
  return (
    staff?.fullName ||
    staff?.name ||
    activeAssignment?.assignedToName ||
    target.assignedTo?.fullName ||
    target.assignedToName ||
    "Unassigned"
  );
}

function HandoverForm({ activeTicketId, mutation, onTicketChange, tickets }) {
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const ticketQuery = useQuery({
    queryKey: ["repair-ticket-handover-detail", activeTicketId],
    queryFn: () => repairApi.get(activeTicketId),
    enabled: Boolean(activeTicketId),
  });
  const ticketDetail = ticketQuery.data?.data?.ticket || ticketQuery.data?.data || null;
  const activeTicketInList = tickets.find((t) => t.id === activeTicketId);
  const ticket = ticketDetail || activeTicketInList;

  const customerName = ticket?.customer?.fullName || activeTicketInList?.customer?.fullName || "Loading...";
  const technicianName = getActiveTechnicianName(ticketDetail, activeTicketInList);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!activeTicketId) return;

    try {
      await mutation.mutateAsync({
        ticketId: activeTicketId,
        payload: {
          type: "RECEPTION_TO_CUSTOMER",
          receiverName: customerName || "Customer",
          notes: notes || undefined,
          metadata: {
            deliveryDate,
          },
        },
      });
      setNotes("");
      setDeliveryDate(new Date().toISOString().split("T")[0]);
    } catch {
      // Error toast is handled by the mutation.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Handover</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Select Repair Ticket">
            <Select
              name="ticketId"
              value={activeTicketId}
              onChange={(event) => {
                onTicketChange(event.target.value);
                setNotes("");
              }}
            >
              <option value="" disabled>-- Select Ticket --</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {ticketLabel(t)} · {t.title}
                </option>
              ))}
            </Select>
          </Field>

          {activeTicketId ? (
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
              <div>
                <span className="text-slate-500 font-medium">Customer Name:</span>{" "}
                <span className="font-bold text-slate-800">{customerName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Technician Name:</span>{" "}
                <span className="font-bold text-slate-800">{technicianName}</span>
              </div>
            </div>
          ) : null}

          <Field label="Delivery Date">
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              required
            />
          </Field>

          <Field label="Handover Notes">
            <Textarea
              placeholder="Record any remarks for delivery..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <Button
            className="w-full"
            type="submit"
            disabled={mutation.isPending || !activeTicketId}
          >
            {mutation.isPending ? "Recording Handover..." : "Record Handover & Deliver"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

async function refreshHandoverWorkflowQueries(queryClient, ticketId) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["repair"] }),
    queryClient.invalidateQueries({ queryKey: ["repair", ticketId] }),
    queryClient.invalidateQueries({ queryKey: ["repair", ticketId, "current-custody"] }),
    queryClient.invalidateQueries({ queryKey: ["repair-ticket-handover-detail", ticketId] }),
  ]);
}

