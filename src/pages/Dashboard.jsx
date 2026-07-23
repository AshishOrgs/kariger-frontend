import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgePlus,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  GitBranch,
  Handshake,
  PackageSearch,
  ShieldCheck,
  UserRoundCog,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { analyticsApi, assignmentsApi, billingApi, inventoryApi, repairApi } from "@/services/modules";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/utils/permissions";
import { cn, formatCurrency, formatDate } from "@/utils/cn";
import { ticketLabel } from "@/utils/ticketLabel";

const activeRepairStatuses = [
  "RECEIVED",
  "DIAGNOSING",
  "ESTIMATE_PENDING",
  "APPROVED",
  "IN_REPAIR",
  "WAITING_PARTS",
  "WAITING_APPROVAL",
  "READY_FOR_REVIEW",
  "SENT_TO_VENDOR",
];

const billingStatuses = ["READY_FOR_REVIEW", "READY_FOR_DELIVERY"];

const dashboardWidgetPermissions = {
  todayWorkSummary: [PERMISSIONS.REPAIR_WORK, PERMISSIONS.REPAIR_JOBS_VIEW],
  pendingRepairsSummary: [PERMISSIONS.REPAIR_JOBS_VIEW],
  billingQueueSummary: [PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_CREATE, PERMISSIONS.PAYMENT_COLLECT],
  inventoryAlertsSummary: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.INVENTORY_CONSUME],
  todayWorkPanel: [PERMISSIONS.REPAIR_WORK, PERMISSIONS.REPAIR_JOBS_VIEW],
  pendingRepairsPanel: [PERMISSIONS.REPAIR_JOBS_VIEW],
  billingQueuePanel: [PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_CREATE, PERMISSIONS.PAYMENT_COLLECT],
  inventoryAlertsPanel: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.INVENTORY_CONSUME],
  recentActivityPanel: [
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPAIR_JOBS_VIEW,
    PERMISSIONS.REPAIR_WORK,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_CREATE,
    PERMISSIONS.PAYMENT_COLLECT,
  ],
};

const quickActions = [
  {
    label: "Create Repair",
    detail: "Start customer intake",
    path: "/repair/new",
    icon: BadgePlus,
    permissions: [PERMISSIONS.REPAIR_INTAKE],
    tone: "bg-teal-50 text-teal-700",
  },
  {
    label: "Repair Jobs",
    detail: "Open repair queue",
    path: "/repair",
    icon: ClipboardList,
    permissions: [PERMISSIONS.REPAIR_JOBS_VIEW],
    tone: "bg-blue-50 text-blue-700",
  },
  {
    label: "Repair Work",
    detail: "Continue assigned work",
    path: "/technician/repairs",
    icon: Wrench,
    permissions: [PERMISSIONS.REPAIR_WORK],
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Estimate",
    detail: "Prepare or review quotes",
    path: "/repair/estimates",
    icon: ShieldCheck,
    permissions: [PERMISSIONS.REPAIR_ESTIMATE, PERMISSIONS.ESTIMATE_CREATE],
    tone: "bg-indigo-50 text-indigo-700",
  },
  {
    label: "Assign",
    detail: "Move work to staff",
    path: "/assignments",
    icon: UserRoundCog,
    permissions: [PERMISSIONS.REPAIR_ASSIGN],
    tone: "bg-violet-50 text-violet-700",
  },
  {
    label: "Billing",
    detail: "Invoice and collect",
    path: "/billing",
    icon: CreditCard,
    permissions: [PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_CREATE, PERMISSIONS.PAYMENT_COLLECT],
    tone: "bg-amber-50 text-amber-700",
  },
  {
    label: "Inventory",
    detail: "Parts and stock",
    path: "/inventory",
    icon: Boxes,
    permissions: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.INVENTORY_CONSUME],
    tone: "bg-cyan-50 text-cyan-700",
  },
  {
    label: "Handover",
    detail: "Ready delivery queue",
    path: "/handover",
    icon: Handshake,
    permissions: [PERMISSIONS.HANDOVER_VIEW, PERMISSIONS.HANDOVER_MANAGE],
    tone: "bg-lime-50 text-lime-700",
  },
  {
    label: "Team",
    detail: "Staff operations",
    path: "/staff",
    icon: UserRoundCog,
    permissions: [PERMISSIONS.STAFF_VIEW, PERMISSIONS.STAFF_MANAGE],
    tone: "bg-slate-100 text-slate-700",
  },
  {
    label: "Branches",
    detail: "Business locations",
    path: "/branches",
    icon: GitBranch,
    permissions: [PERMISSIONS.BRANCH_VIEW, PERMISSIONS.BRANCH_MANAGE],
    tone: "bg-sky-50 text-sky-700",
  },
];

export function Dashboard() {
  const { user, hasPermission } = useAuth();
  const canViewRepairQueue = hasPermission(PERMISSIONS.REPAIR_JOBS_VIEW);
  const canWorkRepairs = hasPermission(PERMISSIONS.REPAIR_WORK);
  const canUseInventory = hasPermission(PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.INVENTORY_CONSUME);
  const canUseBilling = hasPermission(PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_CREATE, PERMISSIONS.PAYMENT_COLLECT);
  const canViewReports = hasPermission(PERMISSIONS.REPORTS_VIEW);
  const canShowWidget = (widgetKey) => hasPermission(...dashboardWidgetPermissions[widgetKey]);
  const showTodayWorkSummary = canShowWidget("todayWorkSummary");
  const showPendingRepairsSummary = canShowWidget("pendingRepairsSummary");
  const showBillingQueueSummary = canShowWidget("billingQueueSummary");
  const showInventoryAlertsSummary = canShowWidget("inventoryAlertsSummary");
  const showTodayWorkPanel = canShowWidget("todayWorkPanel");
  const showPendingRepairsPanel = canShowWidget("pendingRepairsPanel");
  const showBillingQueuePanel = canShowWidget("billingQueuePanel");
  const showInventoryAlertsPanel = canShowWidget("inventoryAlertsPanel");
  const showRecentActivityPanel = canShowWidget("recentActivityPanel");
  const showSummarySection =
    showTodayWorkSummary ||
    showPendingRepairsSummary ||
    showBillingQueueSummary ||
    showInventoryAlertsSummary;
  const showWorkSection = showTodayWorkPanel || showPendingRepairsPanel;
  const showQueueSection =
    showBillingQueuePanel ||
    showInventoryAlertsPanel ||
    showRecentActivityPanel;

  const repairQuery = useQuery({
    queryKey: ["dashboard", "repair-queue"],
    queryFn: () => repairApi.list({ page: 1, limit: 30, sort: "updatedAt" }),
    enabled: canViewRepairQueue,
  });

  const assignmentQuery = useQuery({
    queryKey: ["dashboard", "assigned-repairs"],
    queryFn: () => assignmentsApi.queue({ page: 1, limit: 12, sort: "priority" }),
    enabled: canWorkRepairs,
  });

  const inventoryQuery = useQuery({
    queryKey: ["dashboard", "inventory-alerts"],
    queryFn: () => inventoryApi.list({ page: 1, limit: 20 }),
    enabled: canUseInventory,
  });

  const billingQuery = useQuery({
    queryKey: ["dashboard", "billing-queue"],
    queryFn: () => billingApi.invoices({ page: 1, limit: 20 }),
    enabled: canUseBilling,
  });

  const analyticsQuery = useQuery({
    queryKey: ["dashboard", "owner-summary"],
    queryFn: () => analyticsApi.ownerDashboard(),
    enabled: canViewReports,
  });

  const tickets = rowsFrom(repairQuery.data, ["tickets", "repairs", "rows"]);
  const assignments = rowsFrom(assignmentQuery.data, ["assignments", "tickets", "rows"]);
  const inventoryItems = rowsFrom(inventoryQuery.data, ["items", "inventoryItems", "products", "rows"]);
  const invoices = rowsFrom(billingQuery.data, ["invoices", "rows"]);
  const analytics = analyticsQuery.data?.data || {};

  const assignedTickets = assignments.map((assignment) => assignment.ticket || assignment).filter(Boolean);
  const todayWork = canWorkRepairs ? assignedTickets : tickets;
  const pendingRepairs = tickets.filter((ticket) => activeRepairStatuses.includes(ticket.status)).slice(0, 5);
  const billingQueue = buildBillingQueue({ invoices, tickets }).slice(0, 5);
  const inventoryAlerts = inventoryItems.filter(isLowStock).slice(0, 5);
  const recentActivity = buildRecentActivity({ analytics, tickets, invoices, assignedTickets }).slice(0, 6);

  const visibleActions = quickActions.filter((action) => hasPermission(...action.permissions));
  const pendingCount = pendingRepairs.length;
  const todayCount = todayWork.length;
  const billingCount = billingQueue.length;
  const inventoryAlertCount = inventoryAlerts.length;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      <PageHeader
        title="Dashboard"
        description={`Good ${dayPart()}, ${user?.fullName || "there"}. Here is what needs attention now.`}
        actions={
          hasPermission(PERMISSIONS.REPAIR_INTAKE) ? (
            <Link to="/repair/new">
              <Button type="button">
                <BadgePlus className="h-4 w-4" />
                Create Repair
              </Button>
            </Link>
          ) : null
        }
      />

      {showSummarySection ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {showTodayWorkSummary ? (
            <SummaryCard label="Today's Work" value={todayCount} detail="Jobs needing action" icon={Wrench} tone="bg-blue-50 text-blue-700" />
          ) : null}
          {showPendingRepairsSummary ? (
            <SummaryCard label="Pending Repairs" value={pendingCount} detail="Open repair flow" icon={ClipboardList} tone="bg-emerald-50 text-emerald-700" />
          ) : null}
          {showBillingQueueSummary ? (
            <SummaryCard label="Billing Queue" value={billingCount} detail="Invoice or payment follow-up" icon={CreditCard} tone="bg-amber-50 text-amber-700" />
          ) : null}
          {showInventoryAlertsSummary ? (
            <SummaryCard label="Inventory Alerts" value={inventoryAlertCount} detail="Low or attention stock" icon={PackageSearch} tone="bg-cyan-50 text-cyan-700" />
          ) : null}
        </section>
      ) : null}

      {visibleActions.length ? (
        <Card className="rounded-2xl border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-slate-100">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {visibleActions.map((action) => (
                <ActionCard key={action.path} action={action} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showWorkSection ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          {showTodayWorkPanel ? (
            <WorkPanel
              title="Today's Work"
              items={todayWork.slice(0, 6)}
              emptyTitle="No work waiting"
              emptyDescription="New work will appear here as soon as your permissions allow access to repair queues."
              loading={repairQuery.isLoading || assignmentQuery.isLoading}
            />
          ) : null}

          {showPendingRepairsPanel ? (
            <QueuePanel
              title="Pending Repairs"
              icon={ClipboardList}
              items={pendingRepairs}
              loading={repairQuery.isLoading}
              emptyTitle="No pending repairs"
              emptyDescription="Open repair jobs will appear here."
              renderItem={(ticket) => <TicketRow key={ticket.id} ticket={ticket} />}
            />
          ) : null}
        </section>
      ) : null}

      {showQueueSection ? (
        <section className="grid gap-5 xl:grid-cols-3">
        {showBillingQueuePanel ? (
          <QueuePanel
            title="Billing Queue"
            icon={CreditCard}
            items={billingQueue}
            loading={billingQuery.isLoading || repairQuery.isLoading}
            emptyTitle="Billing is clear"
            emptyDescription="Invoices and ready-for-billing repairs will appear here."
            renderItem={(item) => <BillingRow key={item.id || item.ticketId} item={item} />}
          />
        ) : null}

        {showInventoryAlertsPanel ? (
          <QueuePanel
            title="Inventory Alerts"
            icon={Boxes}
            items={inventoryAlerts}
            loading={inventoryQuery.isLoading}
            emptyTitle="Stock looks healthy"
            emptyDescription="Low stock alerts will appear here."
            renderItem={(item) => <InventoryRow key={item.id || item.sku} item={item} />}
          />
        ) : null}

        {showRecentActivityPanel ? (
          <QueuePanel
            title="Recent Activity"
            icon={BriefcaseBusiness}
            items={recentActivity}
            loading={analyticsQuery.isLoading || repairQuery.isLoading || billingQuery.isLoading}
            emptyTitle="No recent activity"
            emptyDescription="Recent repairs, invoices, and operational updates will appear here."
            renderItem={(item) => <ActivityRow key={item.id} item={item} />}
          />
        ) : null}
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, detail, icon: Icon, tone }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-[0_14px_35px_rgba(15,23,42,0.05)]">
      <CardContent className="flex items-center gap-4 p-4">
        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", tone)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-black tracking-normal text-slate-950">{value}</p>
          <p className="text-sm font-bold text-slate-700">{label}</p>
          <p className="truncate text-xs text-slate-500">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCard({ action }) {
  const Icon = action.icon;
  return (
    <Link
      to={action.path}
      className="group flex min-h-[104px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("grid h-11 w-11 place-items-center rounded-2xl", action.tone)}>
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[var(--primary)]" />
      </div>
      <div>
        <p className="text-sm font-black text-slate-950">{action.label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{action.detail}</p>
      </div>
    </Link>
  );
}

function WorkPanel({ title, items, emptyTitle, emptyDescription, loading }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <CardHeader className="border-slate-100">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <SkeletonRows />
        ) : items.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
          </div>
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </CardContent>
    </Card>
  );
}

function QueuePanel({ title, icon: Icon, items, loading, emptyTitle, emptyDescription, renderItem }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <CardHeader className="flex flex-row items-center justify-between border-slate-100">
        <CardTitle>{title}</CardTitle>
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <SkeletonRows />
        ) : items.length ? (
          <div className="space-y-3">{items.map(renderItem)}</div>
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </CardContent>
    </Card>
  );
}

function TicketCard({ ticket }) {
  return (
    <Link to={`/repair/${ticket.id}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{ticketLabel(ticket)}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{ticket.customer?.fullName || ticket.title || "Repair customer"}</p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>{ticket.priority || "NORMAL"}</span>
        <span>{formatDate(ticket.updatedAt || ticket.createdAt)}</span>
      </div>
    </Link>
  );
}

function TicketRow({ ticket }) {
  return (
    <Link to={`/repair/${ticket.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:shadow-sm">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-950">{ticketLabel(ticket)}</p>
        <p className="truncate text-xs text-slate-500">{ticket.customer?.fullName || ticket.title || "Repair job"}</p>
      </div>
      <StatusBadge status={ticket.status} />
    </Link>
  );
}

function BillingRow({ item }) {
  const label = item.ticket ? ticketLabel(item.ticket) : item.invoiceNumber || item.number || "Invoice";
  const amount = item.totalAmount || item.amount || item.balanceDue || item.finalInvoiceAmount || 0;
  const path = item.id && item.invoiceNumber ? `/billing/invoices/${item.id}` : "/billing";

  return (
    <Link to={path} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:shadow-sm">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-950">{label}</p>
        <p className="truncate text-xs text-slate-500">{item.customer?.fullName || item.ticket?.customer?.fullName || "Billing follow-up"}</p>
      </div>
      <p className="shrink-0 text-sm font-black text-slate-900">{formatCurrency(amount)}</p>
    </Link>
  );
}

function InventoryRow({ item }) {
  const current = item.currentStock ?? item.stock ?? item.quantity ?? 0;
  const minimum = item.lowStockThreshold ?? item.minimumStock ?? item.reorderLevel ?? 0;
  return (
    <Link to={item.id ? `/inventory/${item.id}` : "/inventory"} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:shadow-sm">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-950">{item.name || item.itemName || item.sku || "Inventory item"}</p>
        <p className="truncate text-xs text-slate-500">Minimum {minimum}</p>
      </div>
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">{current} left</span>
    </Link>
  );
}

function ActivityRow({ item }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
        {item.type === "billing" ? <CreditCard className="h-4 w-4" /> : item.type === "repair" ? <Wrench className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-950">{item.title}</p>
        <p className="truncate text-xs text-slate-500">{item.detail}</p>
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}

function rowsFrom(response, keys) {
  const data = response?.data || response || {};
  for (const key of keys) {
    const value = data?.[key] || data?.data?.[key];
    if (Array.isArray(value)) return value;
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function isLowStock(item) {
  const current = Number(item.currentStock ?? item.stock ?? item.quantity ?? 0);
  const minimum = Number(item.lowStockThreshold ?? item.minimumStock ?? item.reorderLevel ?? 0);
  return minimum > 0 ? current <= minimum : current <= 2;
}

function buildBillingQueue({ invoices, tickets }) {
  const invoiceRows = invoices.map((invoice) => ({ ...invoice, type: "invoice" }));
  const ticketRows = tickets
    .filter((ticket) => billingStatuses.includes(ticket.status))
    .map((ticket) => ({
      id: ticket.id,
      ticketId: ticket.id,
      ticket,
      finalInvoiceAmount: ticket.finalInvoiceAmount,
      type: "ticket",
    }));
  return [...invoiceRows, ...ticketRows];
}

function buildRecentActivity({ analytics, tickets, invoices, assignedTickets }) {
  const backendRows = Array.isArray(analytics.recentActivities)
    ? analytics.recentActivities.map((activity, index) => ({
        id: activity.id || `activity-${index}`,
        title: activity.title || activity.message || activity.description || "Activity",
        detail: activity.type || activity.action || activity.createdAt || "Recent update",
        type: activity.type || "activity",
      }))
    : [];

  const repairRows = [...tickets, ...assignedTickets].slice(0, 4).map((ticket) => ({
    id: `repair-${ticket.id}`,
    title: ticketLabel(ticket),
    detail: `${ticket.status || "Repair"} · ${formatDate(ticket.updatedAt || ticket.createdAt)}`,
    type: "repair",
  }));

  const invoiceRows = invoices.slice(0, 3).map((invoice) => ({
    id: `invoice-${invoice.id}`,
    title: invoice.invoiceNumber || "Invoice",
    detail: `${formatCurrency(invoice.totalAmount || invoice.amount || 0)} · ${invoice.status || "Billing"}`,
    type: "billing",
  }));

  return [...backendRows, ...repairRows, ...invoiceRows];
}

function dayPart() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
