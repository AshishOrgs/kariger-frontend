import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { repairApi } from "@/services/modules";
import { formatCurrency, unwrapArray } from "@/utils/cn";
import { ticketLabel } from "@/utils/ticketLabel";

const usageTicketStatuses = ["APPROVED", "IN_REPAIR", "WAITING_PARTS", "READY_FOR_DELIVERY", "DELIVERED"];

const estimateTotal = (ticket) => Number((ticket?.latestEstimate || ticket?.estimates?.[0])?.totalAmount || 0);

const usageCost = (item) => Number(item.totalCost || Number(item.quantity || 0) * Number(item.unitCost || 0));

export function PartsUsage() {
  const [searchParams] = useSearchParams();
  const [selectedTicketId, setSelectedTicketId] = useState(searchParams.get("ticketId") || "");
  const ticketsQuery = useQuery({ queryKey: ["repair", "parts-usage-history"], queryFn: () => repairApi.list({ limit: 100 }) });
  const tickets = unwrapArray(ticketsQuery.data, ["tickets"]).filter((ticket) => usageTicketStatuses.includes(ticket.status));
  const ticketNumberById = new Map(tickets.map((ticket) => [ticket.id, ticketLabel(ticket)]));
  const activeTicketId = selectedTicketId || tickets[0]?.id || "";
  const activeTicket = tickets.find((ticket) => ticket.id === activeTicketId);
  const usageQuery = useQuery({ queryKey: ["parts-usage", activeTicketId], queryFn: () => repairApi.partsUsage(activeTicketId), enabled: Boolean(activeTicketId) });
  const usage = unwrapArray(usageQuery.data, ["partsUsage", "usages", "usage"]);
  const partsExpense = usage.reduce((sum, item) => sum + usageCost(item), 0);
  const estimateAmount = estimateTotal(activeTicket);
  const billingPreview = estimateAmount + partsExpense;

  return (
    <>
      <PageHeader title="Parts Usage History" description="Admin view for technician-recorded actual parts usage and expense handoff." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <Card>
          <CardContent className="space-y-4">
            <Select value={activeTicketId} onChange={(event) => setSelectedTicketId(event.target.value)}>
              {tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticketLabel(ticket)}</option>)}
            </Select>
            {activeTicket ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-slate-50 p-3">
                <div>
                  <p className="font-semibold">{ticketLabel(activeTicket)}</p>
                  <p className="text-sm text-[var(--muted)]">{activeTicket.customer?.fullName || "Customer not set"}</p>
                </div>
                <StatusBadge status={activeTicket.status} />
              </div>
            ) : null}
            <Table>
              <thead>
                <tr>
                  <Th>Part</Th>
                  <Th>Quantity</Th>
                  <Th>Repair Ticket</Th>
                  <Th>Technician</Th>
                  <Th>Cost</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody>
                {usage.map((item, index) => (
                  <tr key={item.id || index}>
                    <Td>{item.inventoryItem?.partName || item.partName || item.partSku || "Part"}</Td>
                    <Td>{String(item.quantity)}</Td>
                    <Td>{item.ticket ? ticketLabel(item.ticket) : ticketNumberById.get(item.repairTicketId) || ticketNumberById.get(activeTicketId) || item.repairTicketId || activeTicketId}</Td>
                    <Td>{item.technician?.fullName || item.technicianId || "Not set"}</Td>
                    <Td>{formatCurrency(usageCost(item))}</Td>
                    <Td>{item.usedAt || item.createdAt}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!usage.length ? <p className="text-sm text-[var(--muted)]">No technician parts usage has been recorded for this ticket yet.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expense Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <SummaryRow label="Estimate amount" value={formatCurrency(estimateAmount)} />
            <SummaryRow label="Actual parts expense" value={formatCurrency(partsExpense)} />
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs font-semibold uppercase text-blue-800">Billing Preview</p>
              <p className="mt-1 text-2xl font-bold text-blue-950">{formatCurrency(billingPreview)}</p>
            </div>
            <Link to={`/expenses?ticketId=${activeTicketId}`}>
              <Button className="w-full" type="button" variant="secondary" disabled={!activeTicketId}>Open Expense</Button>
            </Link>
            <Link to={`/billing?ticketId=${activeTicketId}`}>
              <Button className="w-full" type="button" disabled={!activeTicketId}>Go to Billing</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
