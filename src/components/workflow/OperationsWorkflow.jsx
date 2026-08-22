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
  const activeTicketId = ticketId || ticket?.id || "";
  const hasTicket = Boolean(ticket);
  const shouldShowSummary = showSummary && hasTicket;

  return (
    <div className="space-y-5">
      {shouldShowSummary ? (
        <Card className="border border-slate-200 bg-slate-50/70 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="rounded-md bg-[#1769aa] px-3 py-1 text-xs font-black text-white tracking-wide">
                  {ticketLabel(ticket)}
                </span>
                <StatusBadge status={ticket?.status || "RECEIVED"} />
                <StatusBadge status={ticket?.priority || "NORMAL"} />
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Active Ticket Summary
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div>
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Customer</span>
                <span className="mt-0.5 block text-sm font-bold text-slate-900">{detail(ticket?.customer?.fullName)}</span>
              </div>
              <div>
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Device</span>
                <span className="mt-0.5 block text-sm font-bold text-slate-900">{ticketDevice(ticket)}</span>
              </div>
              <div>
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">IMEI / Serial</span>
                <span className="mt-0.5 block text-sm font-bold text-slate-900 font-mono">{ticketImei(ticket)}</span>
              </div>
              <div>
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Assigned Technician</span>
                <span className="mt-0.5 block text-sm font-bold text-slate-900">{assignedTechnician(ticket)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {children}
    </div>
  );
}
