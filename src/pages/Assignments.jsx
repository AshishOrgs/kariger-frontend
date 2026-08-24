import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { Timeline } from "@/components/ui/Timeline";
import { OperationsWorkflowPage } from "@/components/workflow/OperationsWorkflow";
import { useNotifyMutation } from "@/hooks/useNotifyMutation";
import { assignmentsApi, repairApi, staffApi } from "@/services/modules";
import { useAuth } from "@/contexts/AuthContext";
import { cn, unwrapArray } from "@/utils/cn";
import { displayValue } from "@/utils/data";
import { isActiveAssignment, isTerminalTicketStatus } from "@/utils/workflow";
import { ticketLabel } from "@/utils/ticketLabel";

export function Assignments() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const preselectedTicketId = searchParams.get("ticketId") || "";
  const [selectedTicketId, setSelectedTicketId] = useState(preselectedTicketId);
  const [lastAssignedTicketId, setLastAssignedTicketId] = useState("");
  const [assignmentMode, setAssignmentMode] = useState("assign");
  const [activeQueueTab, setActiveQueueTab] = useState("pending");
  const queueQuery = useQuery({ queryKey: ["assignments", "queue"], queryFn: () => assignmentsApi.queue(), staleTime: 2 * 60_000 });
  const dashboardQuery = useQuery({ queryKey: ["assignments", "dashboard"], queryFn: () => assignmentsApi.dashboard(), staleTime: 3 * 60_000 });
  // Reuse shared repair list cache — same key used by Repair/Estimates/Billing/Handover
  const ticketsQuery = useQuery({ queryKey: ["repair", "", ""], queryFn: () => repairApi.list({ limit: 50 }), staleTime: 2 * 60_000 });
  const staffQuery = useQuery({ queryKey: ["staff", "assignment-technicians"], queryFn: staffApi.list, staleTime: 5 * 60_000 });
  const queue = unwrapArray(queueQuery.data, ["assignments", "tickets"]);
  const tickets = unwrapArray(ticketsQuery.data, ["tickets"]);
  const branchTechnicians = (staffQuery.data?.data?.staff || [])
    .filter((member) => member.role === "TECHNICIAN" && member.isActive)
    .map((member) => ({
      id: member.id,
      name: member.fullName,
      email: member.email,
      branchId: member.branchId,
      branchName: member.branch?.name,
    }));
  const selfTechnician = user?.id || user?.staffId
    ? [{
        id: user.id || user.staffId,
        name: "Myself",
        email: user.email,
        branchId: user.branchId,
        branchName: user.branch?.name,
        isSelf: true,
      }]
    : [];
  const dashboard = dashboardQuery.data?.data || {};
  const activeTicketId = selectedTicketId || tickets[0]?.id || "";
  const historyQuery = useQuery({
    queryKey: ["assignments", activeTicketId, "history"],
    queryFn: () => repairApi.assignments(activeTicketId),
    enabled: Boolean(activeTicketId),
  });
  const history = unwrapArray(historyQuery.data, ["assignments", "history", "logs"]);
  const assignmentRecordsByTicket = new Map(
    tickets.map((ticket) => [ticket.id, ticket.assignments || []])
  );
  const ticketHasActiveAssignment = (ticket) =>
    Boolean(ticket.assignedTechnicianName && ticket.assignedTechnicianName !== "Unassigned") ||
    Boolean(ticket.assignedTo) ||
    Boolean(ticket.assignedToStaffId) ||
    (ticket.assignments || []).some(isActiveAssignment) ||
    (assignmentRecordsByTicket.get(ticket.id) || []).some(isActiveAssignment);
  const technicians = branchTechnicians.length
    ? mergeTechnicians(
        branchTechnicians,
        uniqueTechnicians([
          ...queue,
          ...history,
          ...[...assignmentRecordsByTicket.values()].flat(),
          ...tickets.flatMap((ticket) => ticket.assignments || []),
        ])
      )
    : selfTechnician;
  const assignableTickets = tickets.filter((ticket) => !isTerminalTicketStatus(ticket.status) && !ticketHasActiveAssignment(ticket));
  const reassignableTickets = tickets.filter((ticket) => !isTerminalTicketStatus(ticket.status) && ticketHasActiveAssignment(ticket));
  const mutation = useNotifyMutation({
    mutationFn: ({ ticketId, payload }) => repairApi.assign(ticketId, payload),
    successMessage: "Technician assigned.",
    onSuccess: async (_data, variables) => {
      setLastAssignedTicketId(variables.ticketId);
      setSelectedTicketId(variables.ticketId);
      await refreshAssignmentWorkflowQueries(queryClient, variables.ticketId);
      navigate(`/technician/repairs?tab=assigned&ticketId=${variables.ticketId}`);
    },
  });
  const reassign = useNotifyMutation({
    mutationFn: ({ ticketId, payload }) => repairApi.reassign(ticketId, payload),
    successMessage: "Technician reassigned.",
    onSuccess: (_data, variables) => refreshAssignmentWorkflowQueries(queryClient, variables.ticketId),
  });
  const workflowTicket = tickets.find((ticket) => ticket.id === activeTicketId) || tickets[0] || null;

  return (
    <OperationsWorkflowPage current="assignment" ticket={workflowTicket} ticketId={activeTicketId} showContinue={false} showSummary={false}>
      <PageHeader title="Assignments" description="Assign technicians, track assignment history, and keep operational notes aligned with each repair." />

      <div className="space-y-6">
        {/* 1. Technician Assignment Form — full width */}
        <AssignmentForm
          mode={assignmentMode}
          setMode={setAssignmentMode}
          defaultTicketId={selectedTicketId}
          pending={assignmentMode === "assign" ? mutation.isPending : reassign.isPending}
          assignableTickets={assignableTickets}
          reassignableTickets={reassignableTickets}
          technicians={technicians}
          dashboard={dashboard}
          onSubmit={(ticketId, payload) => {
            if (assignmentMode === "reassign") {
              reassign.mutate({ ticketId, payload });
              return;
            }
            mutation.mutate({ ticketId, payload });
          }}
        />

        {/* Bottom: Two columns — Queue left, History right */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 items-start">

          {/* LEFT: Repairs Queue */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Repairs Queue</CardTitle>
                <p className="text-[11px] text-slate-400 mt-0.5">Pending or already assigned tickets</p>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => { setActiveQueueTab("pending"); setAssignmentMode("assign"); }}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-bold rounded transition-colors",
                    activeQueueTab === "pending" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveQueueTab("assigned"); setAssignmentMode("reassign"); }}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-bold rounded transition-colors",
                    activeQueueTab === "assigned" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Assigned
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {activeQueueTab === "pending" ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Ticket</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignableTickets.length ? (
                      assignableTickets.map((ticket) => (
                        <tr key={ticket.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900 text-xs">{ticketLabel(ticket)}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{ticket.title}</div>
                          </td>
                          <td className="px-3 py-2"><StatusBadge status={ticket.status} /></td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="text-[11px] font-bold text-[#1769aa] hover:underline whitespace-nowrap"
                              onClick={() => { setSelectedTicketId(ticket.id); setAssignmentMode("assign"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                            >
                              Assign ↑
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" className="px-3 py-6 text-center text-slate-400 italic text-xs">No pending tickets.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Ticket</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reassignableTickets.length ? (
                      reassignableTickets.map((ticket) => (
                        <tr key={ticket.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900 text-xs">{ticketLabel(ticket)}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{ticket.title}</div>
                          </td>
                          <td className="px-3 py-2"><StatusBadge status={ticket.status} /></td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="text-[11px] font-bold text-slate-600 hover:underline whitespace-nowrap"
                              onClick={() => { setSelectedTicketId(ticket.id); setAssignmentMode("reassign"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                            >
                              Reassign ↑
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" className="px-3 py-6 text-center text-slate-400 italic text-xs">No assigned tickets.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* RIGHT: Assignment History Log */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">Assignment History Log</CardTitle>
              {activeTicketId && tickets.find(t => t.id === activeTicketId) && (
                <p className="text-[11px] text-[#1769aa] font-semibold mt-0.5">
                  {ticketLabel(tickets.find(t => t.id === activeTicketId))}
                </p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {history.length ? (
                <div>
                  {/* compact table */}
                  <table className="w-full text-xs border-b border-slate-100">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Technician</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item, index) => (
                        <tr key={item.id || index} className="border-b border-slate-50 hover:bg-slate-50/60">
                          <td className="px-3 py-2 font-semibold text-slate-700">{displayValue(item.assignedTo || item.assignedToStaffId)}</td>
                          <td className="px-3 py-2"><StatusBadge status={item.status || item.type} /></td>
                          <td className="px-3 py-2 text-slate-400 text-[10px]">{displayValue(item.assignedAt || item.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* timeline */}
                  <div className="p-4">
                    <Timeline
                      items={history.map((item) => ({ ...item, status: item.status || item.type }))}
                      titleKey="status"
                      dateKey="assignedAt"
                      description={(item) => `Technician ${displayValue(item.assignedTo || item.assignedToStaffId, "unknown")}`}
                    />
                  </div>
                </div>
              ) : (
                <p className="px-4 py-6 text-xs text-slate-400 italic text-center">No assignment logs for this ticket.</p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </OperationsWorkflowPage>
  );
}

function AssignmentForm({ mode, setMode, defaultTicketId, assignableTickets, reassignableTickets, technicians, pending, onSubmit, dashboard }) {
  const isReassign = mode === "reassign";
  const tickets = isReassign ? reassignableTickets : assignableTickets;
  const title = isReassign ? "Reassign Technician" : "Assign Technician";
  const emptyMessage = isReassign
    ? "No active assignments are available for reassignment."
    : "No unassigned, non-terminal repair tickets are available for assignment.";
  const safeDefaultTicketId = tickets.some((ticket) => ticket.id === defaultTicketId) ? defaultTicketId : tickets[0]?.id;

  return (
    <Card className="border border-slate-200 shadow-sm">
      {/* Header row: title + mode tabs + stats */}
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: title + mode toggle */}
          <div className="flex items-center gap-4">
            <CardTitle className="text-base font-bold text-slate-900">Technician Assignment</CardTitle>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setMode("assign")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold transition-colors",
                  !isReassign
                    ? "bg-[#1769aa] text-white"
                    : "bg-white text-slate-500 hover:text-slate-800"
                )}
              >
                Assign
              </button>
              <button
                type="button"
                onClick={() => setMode("reassign")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold transition-colors border-l border-slate-200",
                  isReassign
                    ? "bg-[#1769aa] text-white"
                    : "bg-white text-slate-500 hover:text-slate-800"
                )}
              >
                Reassign
              </button>
            </div>
          </div>

          {/* Right: stats */}
          {dashboard && (
            <div className="flex gap-4">
              {Object.entries(dashboard)
                .filter(([, value]) => typeof value !== "object")
                .slice(0, 4)
                .map(([key, value]) => (
                  <div key={key} className="text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">{key}</p>
                    <p className="text-base font-black text-slate-800">{displayValue(value)}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <form onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSubmit(form.get("ticketId"), {
            technicianId: form.get("technicianId"),
            reason: form.get("reason") || undefined,
          });
        }}>
          {/* Form fields in a horizontal row */}
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] lg:grid-cols-[1fr_1fr_220px_auto] items-end">
            {/* Repair Ticket */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Repair Ticket</label>
              <Select key={mode} name="ticketId" disabled={!tickets.length} defaultValue={safeDefaultTicketId}>
                {tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticketLabel(ticket)}</option>)}
              </Select>
              {!tickets.length ? <p className="text-xs text-[var(--muted)]">{emptyMessage}</p> : null}
            </div>

            {/* Technician */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assign To Technician</label>
              <Select name="technicianId" disabled={!technicians.length}>
                {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
              </Select>
              {!technicians.length ? <p className="text-xs text-[var(--muted)]">No active staff available.</p> : null}
            </div>

            {/* Reassignment Reason (only shown on reassign) */}
            {isReassign && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reason</label>
                <Input name="reason" placeholder="Why reassigning?" required />
              </div>
            )}

            {/* Submit */}
            <div className={isReassign ? "" : "lg:col-start-4"}>
              <Button className="w-full h-10 font-bold text-sm bg-[#1769aa] hover:bg-[#125388] text-white whitespace-nowrap" disabled={pending || !tickets.length || !technicians.length}>
                {title}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function uniqueTechnicians(records) {
  const map = new Map();
  for (const record of records) {
    const staff = record.assignedTo || record.technician || record.ticket?.assignments?.[0]?.assignedTo;
    const id = staff?.id || record.assignedToStaffId || record.technicianId;
    const name = staff?.fullName || staff?.name || id;
    if (id) map.set(id, { id, name });
  }
  return [...map.values()];
}

function mergeTechnicians(primary, fallback) {
  const map = new Map();
  for (const tech of [...primary, ...fallback]) {
    if (tech?.id) map.set(tech.id, tech);
  }
  return [...map.values()];
}

async function refreshAssignmentWorkflowQueries(queryClient, ticketId) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["assignments", "queue"] }),
    queryClient.invalidateQueries({ queryKey: ["assignments", "dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["assignments", ticketId] }),
    queryClient.invalidateQueries({ queryKey: ["repair"] }),
    queryClient.invalidateQueries({ queryKey: ["technician-assigned-repairs"] }),
  ]);
}
