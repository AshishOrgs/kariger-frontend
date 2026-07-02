import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { repairApi } from "@/services/modules";
import { formatCurrency, unwrapArray } from "@/utils/cn";
import { ticketLabel } from "@/utils/ticketLabel";

const expenseTicketStatuses = ["APPROVED", "IN_REPAIR", "WAITING_PARTS", "READY_FOR_DELIVERY", "DELIVERED"];

const getEstimateTotal = (ticket) => Number((ticket?.latestEstimate || ticket?.estimates?.[0])?.totalAmount || 0);
const getUsageCost = (item) => Number(item.totalCost || Number(item.quantity || 0) * Number(item.unitCost || 0));

export function Expenses() {
  const [searchParams] = useSearchParams();
  const [selectedTicketId, setSelectedTicketId] = useState(searchParams.get("ticketId") || "");
  const ticketsQuery = useQuery({ queryKey: ["repair", "expenses"], queryFn: () => repairApi.list({ limit: 100 }) });
  const tickets = unwrapArray(ticketsQuery.data, ["tickets"]).filter((ticket) => expenseTicketStatuses.includes(ticket.status));
  const usageQueries = useQueries({
    queries: tickets.map((ticket) => ({
      queryKey: ["parts-usage", ticket.id],
      queryFn: () => repairApi.partsUsage(ticket.id),
      enabled: Boolean(ticket.id),
    })),
  });

  const rows = useMemo(() => tickets.map((ticket, index) => {
    const usage = unwrapArray(usageQueries[index]?.data, ["partsUsage", "usages", "usage"]);
    const expenseTotal = usage.reduce((sum, item) => sum + getUsageCost(item), 0);
    const estimateAmount = getEstimateTotal(ticket);
    const technicians = [...new Set(usage.map((item) => item.technician?.fullName).filter(Boolean))];

    return {
      ticket,
      usage,
      estimateAmount,
      expenseTotal,
      billingPreview: estimateAmount + expenseTotal,
      technicians,
    };
  }), [tickets, usageQueries]);

  const activeTicketId = selectedTicketId || rows[0]?.ticket.id || "";
  const activeRow = rows.find((row) => row.ticket.id === activeTicketId);

  return (
    <>
      <PageHeader title="Expenses" description="Actual technician parts cost by ticket before final billing." />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <Card>
          <CardContent className="p-0">
            <DataTable
              rows={rows}
              emptyTitle={ticketsQuery.isLoading ? "Loading expenses..." : "No expense records found"}
              columns={[
                {
                  key: "ticket",
                  header: "Ticket",
                  render: (row) => (
                    <div>
                      <p className="font-semibold">{ticketLabel(row.ticket)}</p>
                      <p className="text-sm text-[var(--muted)]">{row.ticket.customer?.fullName || "Customer not set"}</p>
                    </div>
                  ),
                },
                {
                  key: "technician",
                  header: "Technician",
                  render: (row) => row.technicians.join(", ") || "Not recorded",
                },
                {
                  key: "estimate",
                  header: "Estimate",
                  render: (row) => formatCurrency(row.estimateAmount),
                },
                {
                  key: "expense",
                  header: "Parts Expense",
                  render: (row) => formatCurrency(row.expenseTotal),
                },
                {
                  key: "total",
                  header: "Billing Total",
                  render: (row) => formatCurrency(row.billingPreview),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <StatusBadge status={row.ticket.status} />,
                },
                {
                  key: "action",
                  header: "Action",
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/repair/parts-usage?ticketId=${row.ticket.id}`}>
                        <Button size="sm" variant="secondary" type="button">Usage</Button>
                      </Link>
                      <Link to={`/billing?ticketId=${row.ticket.id}`}>
                        <Button size="sm" type="button">Billing</Button>
                      </Link>
                    </div>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expense Detail</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={activeTicketId} onChange={(event) => setSelectedTicketId(event.target.value)}>
              {rows.map((row) => <option key={row.ticket.id} value={row.ticket.id}>{ticketLabel(row.ticket)}</option>)}
            </Select>
            {activeRow ? (
              <>
                <div className="rounded-md border border-[var(--border)] p-3">
                  <p className="font-semibold">{ticketLabel(activeRow.ticket)}</p>
                  <p className="text-sm text-[var(--muted)]">{activeRow.ticket.customer?.fullName || "Customer not set"}</p>
                </div>
                <SummaryRow label="Estimate" value={formatCurrency(activeRow.estimateAmount)} />
                <SummaryRow label="Actual parts expense" value={formatCurrency(activeRow.expenseTotal)} />
                <SummaryRow label="Technician" value={activeRow.technicians.join(", ") || "Not recorded"} />
                <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-semibold uppercase text-blue-800">Final billing base</p>
                  <p className="mt-1 text-2xl font-bold text-blue-950">{formatCurrency(activeRow.billingPreview)}</p>
                </div>
                <Link to={`/billing?ticketId=${activeRow.ticket.id}`}>
                  <Button className="w-full" type="button">Go to Billing</Button>
                </Link>
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">No ticket selected.</p>
            )}
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
