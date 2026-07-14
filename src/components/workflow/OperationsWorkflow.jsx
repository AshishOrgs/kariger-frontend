import { Link } from "react-router-dom";
import { Check, Circle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/utils/cn";
import { ticketLabel } from "@/utils/ticketLabel";

export const operationSteps = [
  { key: "customer", label: "Customer", path: "/customers" },
  { key: "estimate", label: "Estimate", path: "/repair/estimates" },
  { key: "assignment", label: "Assignment", path: "/assignments" },
  { key: "repair", label: "Repair", path: "/repair" },
  { key: "billing", label: "Billing", path: "/billing" },
  { key: "handover", label: "Handover", path: "/handover" },
];

const detail = (value, fallback = "Not set") => value || fallback;

function ticketDevice(ticket) {
  const item = ticket?.items?.[0] || ticket?.repairItems?.[0];
  if (!item) return "Device not selected";
  return [item.brand, item.model, item.itemType].filter(Boolean).join(" ") || "Device";
}

function ticketImei(ticket) {
  const item = ticket?.items?.[0] || ticket?.repairItems?.[0];
  return item?.imei || item?.serialNumber || ticket?.imei || "Not recorded";
}

function assignedTechnician(ticket) {
  if (ticket?.assignedTechnicianName) return ticket.assignedTechnicianName;
  const active = (ticket?.assignments || []).find((assignment) => !assignment.unassignedAt);
  return active?.assignedTo?.fullName || active?.technician?.fullName || active?.assignedToName || "Unassigned";
}

function withTicket(path, ticketId) {
  if (!ticketId) return path;
  return `${path}?ticketId=${encodeURIComponent(ticketId)}`;
}

export function OperationsWorkflowPage({ current, ticket, ticketId, showContinue, showSummary = true, children }) {
  const currentIndex = operationSteps.findIndex((step) => step.key === current);
  const nextStep = operationSteps[currentIndex + 1];
  const activeTicketId = ticketId || ticket?.id || "";
  const shouldShowContinue = showContinue ?? Boolean(activeTicketId);

  return (
    <div className="space-y-5">
      <div className="-mx-4 bg-[var(--background)] px-4 pb-2 pt-1 lg:-mx-6 lg:px-6">
        <Card className="bg-white/95 shadow-sm backdrop-blur">
          <CardContent className="space-y-3 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Operations Workflow</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Follow the repair from intake to customer handover.</p>
              </div>
              <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
                Step {currentIndex + 1}
              </span>
            </div>
            <div className="-mx-1 overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2 px-1">
                {operationSteps.map((step, index) => {
                const completed = index < currentIndex;
                const active = index === currentIndex;
                return (
                  <Link
                    key={step.key}
                    to={withTicket(step.path, activeTicketId)}
                    className={cn(
                      "flex h-14 min-w-[136px] items-center gap-2 rounded-md border px-3 transition hover:bg-slate-50 sm:min-w-[154px]",
                      completed && "border-emerald-200 bg-emerald-50 text-emerald-900",
                      active && "border-blue-200 bg-blue-50 text-blue-950",
                      !completed && !active && "border-slate-200 bg-white text-slate-500"
                    )}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white shadow-sm">
                      {completed ? <Check className="h-4 w-4 text-emerald-600" /> : active ? <ArrowRight className="h-4 w-4 text-blue-600" /> : <Circle className="h-4 w-4 text-slate-400" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-wider">{active ? "Current" : completed ? "Done" : "Next"}</span>
                      <span className="block truncate text-sm font-black">{step.label}</span>
                    </span>
                  </Link>
                );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showSummary ? (
        <Card>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <SummaryItem label="Ticket No" value={ticket ? ticketLabel(ticket) : "No ticket"} />
              <SummaryItem label="Customer" value={detail(ticket?.customer?.fullName)} />
              <SummaryItem label="Device" value={ticketDevice(ticket)} />
              <SummaryItem label="IMEI" value={ticketImei(ticket)} />
              <SummaryItem label="Current Status" value={ticket?.status ? <StatusBadge status={ticket.status} /> : "Not set"} />
              <SummaryItem label="Assigned Technician" value={assignedTechnician(ticket)} />
              <SummaryItem label="Priority" value={ticket?.priority ? <StatusBadge status={ticket.priority} /> : "NORMAL"} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {children}

      {nextStep && shouldShowContinue ? (
        <div className="flex justify-end">
          <Link to={withTicket(nextStep.path, activeTicketId)}>
            <Button type="button">
              Continue to {nextStep.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-2 min-w-0 break-words text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}
