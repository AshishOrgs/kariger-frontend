import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Circle, Plus, Search, Ticket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { operationSteps } from "@/components/workflow/OperationsWorkflow";
import { billingApi, customersApi, repairApi } from "@/services/modules";
import { cn, formatCurrency, unwrapArray } from "@/utils/cn";
import { ticketLabel } from "@/utils/ticketLabel";

export function Customers() {
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const normalizedSearch = search.trim();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["customers", normalizedSearch],
    queryFn: () => customersApi.search({ query: normalizedSearch, limit: 20 }),
    enabled: normalizedSearch.length > 0,
  });
  const ticketsQuery = useQuery({
    queryKey: ["customers", "repair-ticket-customers", normalizedSearch],
    queryFn: () => repairApi.list({ limit: 100, search: normalizedSearch || undefined }),
  });
  const searchedCustomers = unwrapArray(data, ["customers"]);
  const repairTickets = unwrapArray(ticketsQuery.data, ["tickets"]);
  const ticketCustomers = uniqueTicketCustomers(repairTickets);
  const customers = normalizedSearch ? searchedCustomers : ticketCustomers;
  const requestedTicketId = searchParams.get("ticketId") || "";
  const workflowTicket = repairTickets.find((ticket) => ticket.id === requestedTicketId) || repairTickets[0] || null;
  const loading = normalizedSearch ? isLoading : ticketsQuery.isLoading;
  const loadError = normalizedSearch ? error : ticketsQuery.error;
  const retry = normalizedSearch ? refetch : ticketsQuery.refetch;

  return (
    <div className="space-y-5">

      <Card className="border-l-4 border-l-[var(--primary)]">
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[var(--primary)]">Step 1</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">Create Ticket</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Register the customer, device, IMEI, issue details, and priority in one ticket.
            </p>
          </div>
          <Link to="/repair/new" className="block">
            <Button className="h-12 w-full justify-center text-base">
              <Plus className="h-4 w-4" />
              Create Ticket
            </Button>
          </Link>
          {workflowTicket ? (
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Latest Ticket</p>
              <p className="mt-1 font-black text-slate-950">{ticketLabel(workflowTicket)}</p>
              <p className="text-xs text-slate-600">{workflowTicket.customer?.fullName || "Customer not set"}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
            Search Customer Or Ticket
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              placeholder="Search by phone, email, customer name, or ticket"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {loadError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="space-y-3">
            <p className="font-black text-red-700">Unable to load customer history</p>
            <p className="text-sm text-red-700">{loadError.message || "Please retry."}</p>
            <Button variant="secondary" onClick={retry}>Retry</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <CustomerHistoryCard customers={customers} isLoading={loading} normalizedSearch={normalizedSearch} />
          <TicketHistoryCard tickets={repairTickets} isLoading={ticketsQuery.isLoading} />
        </div>
      )}
    </div>
  );
}

export function CustomerDetails({ id }) {
  const ticketsQuery = useQuery({ queryKey: ["customers", id, "tickets"], queryFn: () => customersApi.tickets(id), enabled: Boolean(id) });
  const ledgerQuery = useQuery({ queryKey: ["customers", id, "ledger"], queryFn: () => billingApi.customerLedger(id), enabled: Boolean(id) });
  const tickets = unwrapArray(ticketsQuery.data, ["tickets"]);
  const ledger = unwrapArray(ledgerQuery.data, ["ledger", "entries"]);
  const balance = ledger.reduce((sum, entry) => sum + Number(entry.debit || 0) - Number(entry.credit || 0), 0);
  const invoices = ledger.filter((entry) => String(entry.type || entry.entryType || "").includes("INVOICE"));
  const payments = ledger.filter((entry) => String(entry.type || entry.entryType || "").includes("PAYMENT"));

  return (
    <>
      <PageHeader title="Customer Details" description="Repair history, invoice history, payment history, customer ledger, and outstanding balance." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Open Repairs</p><p className="mt-2 text-2xl font-bold">{tickets.filter((ticket) => !["DELIVERED", "CANCELLED", "CLOSED"].includes(ticket.status)).length}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Invoices</p><p className="mt-2 text-2xl font-bold">{invoices.length}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-[var(--muted)]">Outstanding Balance</p><p className="mt-2 text-2xl font-bold">{formatCurrency(balance)}</p></CardContent></Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card><CardContent className="p-0"><Table><thead><tr><Th>Repair</Th><Th>Status</Th><Th>Payment</Th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><Td>{ticket.ticketNumber}</Td><Td><StatusBadge status={ticket.status} /></Td><Td><StatusBadge status={ticket.paymentStatus} /></Td></tr>)}</tbody></Table></CardContent></Card>
        <Card><CardContent className="p-0"><Table><thead><tr><Th>Ledger Type</Th><Th>Debit</Th><Th>Credit</Th><Th>Balance</Th></tr></thead><tbody>{ledger.map((entry, index) => <tr key={entry.id || index}><Td>{entry.type || entry.entryType}</Td><Td>{formatCurrency(entry.debit)}</Td><Td>{formatCurrency(entry.credit)}</Td><Td>{formatCurrency(entry.runningBalance || entry.balance)}</Td></tr>)}</tbody></Table></CardContent></Card>
        <Card><CardContent className="p-0"><Table><thead><tr><Th>Invoice History</Th><Th>Amount</Th><Th>Date</Th></tr></thead><tbody>{invoices.map((entry, index) => <tr key={entry.id || index}><Td>{entry.referenceEntityId || entry.referenceId || "Invoice"}</Td><Td>{formatCurrency(entry.debit)}</Td><Td>{entry.createdAt}</Td></tr>)}</tbody></Table></CardContent></Card>
        <Card><CardContent className="p-0"><Table><thead><tr><Th>Payment History</Th><Th>Amount</Th><Th>Date</Th></tr></thead><tbody>{payments.map((entry, index) => <tr key={entry.id || index}><Td>{entry.referenceEntityId || entry.referenceId || "Payment"}</Td><Td>{formatCurrency(entry.credit)}</Td><Td>{entry.createdAt}</Td></tr>)}</tbody></Table></CardContent></Card>
      </div>
    </>
  );
}

function uniqueTicketCustomers(tickets) {
  const customers = new Map();
  for (const ticket of tickets) {
    const customer = ticket.customer;
    if (!customer?.id) continue;

    const previous = customers.get(customer.id);
    customers.set(customer.id, {
      ...customer,
      ticketCount: (previous?.ticketCount || 0) + 1,
    });
  }
  return [...customers.values()];
}

function CustomerWorkflowTracker({ ticketId }) {
  const currentIndex = operationSteps.findIndex((step) => step.key === "customer");
  return (
    <Card className="bg-white/95 shadow-sm backdrop-blur">
      <CardContent className="space-y-3 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Repair Workflow</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Follow the repair from customer intake to handover.</p>
          </div>
          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
            Step 1
          </span>
        </div>
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2 px-1">
            {operationSteps.map((step, index) => {
              const completed = index < currentIndex;
              const active = index === currentIndex;
              const path = ticketId ? `${step.path}?ticketId=${encodeURIComponent(ticketId)}` : step.path;
              return (
                <Link
                  key={step.key}
                  to={path}
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
  );
}

function CustomerHistoryCard({ customers, isLoading, normalizedSearch }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Customer History</CardTitle>
          <p className="mt-1 text-sm text-[var(--muted)]">Customers registered through repair tickets.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{customers.length}</span>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <HistoryEmpty title="Loading customers..." />
        ) : customers.length ? (
          <div className="divide-y divide-[var(--border)]">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                to={`/customers/${customer.id}`}
                className="grid gap-2 p-4 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{customer.fullName}</p>
                  <p className="mt-1 text-sm text-slate-600">{customer.phone || "Phone not set"}</p>
                  <p className="text-xs text-slate-500">{customer.email || "Email not set"}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tickets</p>
                  <p className="font-black text-slate-900">{customer.ticketCount ?? customer._count?.tickets ?? 0}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <HistoryEmpty
            title="No customers found"
            description={normalizedSearch ? "No matching customers were returned by the backend." : "Create a ticket to register your first customer."}
          />
        )}
      </CardContent>
    </Card>
  );
}

function TicketHistoryCard({ tickets, isLoading }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Ticket History</CardTitle>
          <p className="mt-1 text-sm text-[var(--muted)]">Recently created repair tickets and their current step.</p>
        </div>
        <Ticket className="h-5 w-5 text-[var(--primary)]" />
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <HistoryEmpty title="Loading tickets..." />
        ) : tickets.length ? (
          <div className="divide-y divide-[var(--border)]">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{ticketLabel(ticket)}</p>
                  <p className="mt-1 text-sm text-slate-600">{ticket.customer?.fullName || "Customer not set"}</p>
                  <p className="text-xs text-slate-500">{ticket.title || ticket.issueDescription || "Issue not recorded"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <StatusBadge status={ticket.status} />
                  <StatusBadge status={ticket.priority || "NORMAL"} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <HistoryEmpty title="No tickets created yet" description="Ticket history will appear after the first repair ticket is created." />
        )}
      </CardContent>
    </Card>
  );
}

function HistoryEmpty({ title, description }) {
  return (
    <div className="p-6 text-center">
      <p className="font-black text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}
