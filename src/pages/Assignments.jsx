import { useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { unwrapArray } from "@/utils/cn";
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
  const queueQuery = useQuery({ queryKey: ["assignments", "queue"], queryFn: () => assignmentsApi.queue() });
  const dashboardQuery = useQuery({ queryKey: ["assignments", "dashboard"], queryFn: () => assignmentsApi.dashboard() });
  const ticketsQuery = useQuery({ queryKey: ["repair"], queryFn: () => repairApi.list() });
  const staffQuery = useQuery({ queryKey: ["staff", "assignment-technicians"], queryFn: staffApi.list });
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
  const assignmentQueries = useQueries({
    queries: tickets.map((ticket) => ({
      queryKey: ["assignments", ticket.id, "candidate-history"],
      queryFn: () => repairApi.assignments(ticket.id),
      enabled: Boolean(ticket.id),
    })),
  });
  const assignmentRecordsByTicket = new Map(
    tickets.map((ticket, index) => [
      ticket.id,
      unwrapArray(assignmentQueries[index]?.data, ["assignments", "history", "logs"]),
    ])
  );
  const ticketHasActiveAssignment = (ticket) => (assignmentRecordsByTicket.get(ticket.id) || []).some(isActiveAssignment);
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
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Card>
            <CardContent className="text-sm text-[var(--muted)]">
              Select the customer repair by short ticket code and customer name. After assignment succeeds, continue to the repair execution workspace.
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(dashboard)
              .filter(([, value]) => typeof value !== "object")
              .slice(0, 4)
              .map(([key, value]) => (
                <Card key={key}>
                  <CardContent>
                    <p className="text-xs uppercase text-slate-500">{key}</p>
                    <p className="mt-2 text-2xl font-bold">{displayValue(value)}</p>
                  </CardContent>
                </Card>
              ))}
          </div>
          {queue.length ? (
          <Card>
            <CardHeader><CardTitle>Active Technician Queue</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <thead><tr><Th>Repair</Th><Th>Ticket Status</Th><Th>Priority</Th><Th>Assignment</Th></tr></thead>
                <tbody>
                  {queue.map((item, index) => (
                    <tr key={item.id || index}>
                      <Td>{item.ticket ? ticketLabel(item.ticket) : displayValue(item.ticketNumber, "Repair")}</Td>
                      <Td><StatusBadge status={item.ticket?.status || item.status || "ASSIGNED"} /></Td>
                      <Td>{displayValue(item.ticket?.priority, "NORMAL")}</Td>
                      <Td>{displayValue(item.status, "Active")}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>
          ) : null}
          <Card>
            <CardHeader><CardTitle>Assignment History</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={activeTicketId} onChange={(event) => setSelectedTicketId(event.target.value)}>
                {tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticketLabel(ticket)}</option>)}
              </Select>
              <Table>
                <thead><tr><Th>Technician</Th><Th>Status</Th><Th>Assigned By</Th><Th>Assigned At</Th></tr></thead>
                <tbody>
                  {history.map((item, index) => (
                    <tr key={item.id || index}>
                      <Td>{displayValue(item.assignedTo || item.assignedToStaffId)}</Td>
                      <Td><StatusBadge status={item.status || item.type} /></Td>
                      <Td>{displayValue(item.assignedBy || item.assignedByStaffId, "System")}</Td>
                      <Td>{displayValue(item.assignedAt || item.createdAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Timeline items={history.map((item) => ({ ...item, status: item.status || item.type }))} titleKey="status" dateKey="assignedAt" description={(item) => `Technician ${displayValue(item.assignedTo || item.assignedToStaffId, "unknown")}`} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-5">
          <AssignmentForm
            mode={assignmentMode}
            setMode={setAssignmentMode}
            defaultTicketId={preselectedTicketId}
            pending={assignmentMode === "assign" ? mutation.isPending : reassign.isPending}
            assignableTickets={assignableTickets}
            reassignableTickets={reassignableTickets}
            technicians={technicians}
            onSubmit={(ticketId, payload) => {
              if (assignmentMode === "reassign") {
                reassign.mutate({ ticketId, payload });
                return;
              }
              mutation.mutate({ ticketId, payload });
            }}
          />
          {lastAssignedTicketId ? (
            <Button className="w-full" type="button" variant="secondary" onClick={() => navigate(`/technician/repairs?tab=assigned&ticketId=${lastAssignedTicketId}`)}>
              Go to My Repairs
            </Button>
          ) : null}
        </div>
      </div>
    </OperationsWorkflowPage>
  );
}

function AssignmentForm({ mode, setMode, defaultTicketId, assignableTickets, reassignableTickets, technicians, pending, onSubmit }) {
  const isReassign = mode === "reassign";
  const tickets = isReassign ? reassignableTickets : assignableTickets;
  const title = isReassign ? "Reassign Technician" : "Assign Technician";
  const emptyMessage = isReassign
    ? "No active assignments are available for reassignment."
    : "No unassigned, non-terminal repair tickets are available for assignment.";
  const safeDefaultTicketId = tickets.some((ticket) => ticket.id === defaultTicketId) ? defaultTicketId : tickets[0]?.id;

  return (
    <Card>
      <CardHeader><CardTitle>Technician Assignment</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSubmit(form.get("ticketId"), {
            technicianId: form.get("technicianId"),
            reason: form.get("reason") || undefined,
          });
        }}>
          <Select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="assign">Assign Technician</option>
            <option value="reassign">Reassign Technician</option>
          </Select>
          <Select key={mode} name="ticketId" disabled={!tickets.length} defaultValue={safeDefaultTicketId}>
            {tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticketLabel(ticket)}</option>)}
          </Select>
          {!tickets.length ? <p className="text-xs text-[var(--muted)]">{emptyMessage}</p> : null}
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Assign To</p>
            <Select name="technicianId" disabled={!technicians.length}>
              {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
            </Select>
          </div>
          {!technicians.length ? <p className="text-xs text-[var(--muted)]">No active staff member with repair work access is available for assignment.</p> : null}
          {isReassign ? <Input name="reason" placeholder="Reassignment reason" required /> : null}
          <Button className="w-full" disabled={pending || !tickets.length || !technicians.length}>{title}</Button>
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
