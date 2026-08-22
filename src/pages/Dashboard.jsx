import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgePlus,
  Boxes,
  ClipboardList,
  Clock3,
  CreditCard,
  GitBranch,
  Handshake,
  PackageSearch,
  UserRoundCog,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { billingApi, inventoryApi, repairApi } from "@/services/modules";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/utils/permissions";
import { cn } from "@/utils/cn";

const quickActions = [
  {
    label: "Repair Intake",
    detail: "Start customer intake",
    path: "/repair/new",
    icon: BadgePlus,
    permissions: [PERMISSIONS.REPAIR_INTAKE],
    tone: "bg-teal-50 text-teal-700",
  },
  {
    label: "Technician Work",
    detail: "Continue assigned work",
    path: "/technician/repairs",
    icon: Wrench,
    permissions: [PERMISSIONS.REPAIR_WORK],
    tone: "bg-emerald-50 text-emerald-700",
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
    label: "Inventory",
    detail: "Parts and stock",
    path: "/inventory",
    icon: Boxes,
    permissions: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.INVENTORY_CONSUME],
    tone: "bg-cyan-50 text-cyan-700",
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
    label: "Handover",
    detail: "Ready delivery queue",
    path: "/handover",
    icon: Handshake,
    permissions: [PERMISSIONS.HANDOVER_VIEW, PERMISSIONS.HANDOVER_MANAGE],
    tone: "bg-lime-50 text-lime-700",
  },
  {
    label: "Branches",
    detail: "Business locations",
    path: "/branches",
    icon: GitBranch,
    permissions: [PERMISSIONS.BRANCH_VIEW, PERMISSIONS.BRANCH_MANAGE],
    tone: "bg-sky-50 text-sky-700",
  },
  {
    label: "Staff",
    detail: "Staff operations",
    path: "/staff",
    icon: UserRoundCog,
    permissions: [PERMISSIONS.STAFF_VIEW, PERMISSIONS.STAFF_MANAGE],
    tone: "bg-slate-100 text-slate-700",
  },
];

function getSubscriptionMeta(subscription) {
  if (!subscription) return { daysLeft: 30, text: "Active Plan", detail: "Expires soon" };
  const expiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
  const now = new Date();
  
  let daysLeft = subscription.daysRemaining;
  if (expiresAt) {
    const diffTime = expiresAt.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  } else if (daysLeft === undefined || daysLeft === null) {
    daysLeft = 30;
  }

  const formattedDate = expiresAt ? expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Active";

  return {
    daysLeft,
    text: daysLeft > 0 ? `${daysLeft} Days Left` : "Expired Today",
    detail: `Expires ${formattedDate}`,
    plan: subscription.plan || "PRO",
  };
}

function extractRows(response, keys = []) {
  if (!response) return [];
  const data = response.data || response;
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key];
    if (Array.isArray(data.data?.[key])) return data.data[key];
  }
  if (Array.isArray(data.tickets)) return data.tickets;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.invoices)) return data.invoices;
  if (Array.isArray(data.rows)) return data.rows;
  return [];
}

function isLowStock(item) {
  const current = Number(item.currentStock ?? item.stock ?? item.quantity ?? 0);
  const minimum = Number(item.lowStockThreshold ?? item.minimumStock ?? item.reorderLevel ?? 0);
  return minimum > 0 ? current <= minimum : current <= 2;
}

export function Dashboard() {
  const { user, hasPermission } = useAuth();
  const subscription = user?.business?.subscription;
  const subMeta = getSubscriptionMeta(subscription);

  const repairQuery = useQuery({
    queryKey: ["repairs", "dashboard-summary"],
    queryFn: () => repairApi.list({ limit: 100 }),
    retry: 1,
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory", "dashboard-summary"],
    queryFn: () => inventoryApi.list({ limit: 100 }),
    retry: 1,
  });

  const billingQuery = useQuery({
    queryKey: ["billing", "dashboard-summary"],
    queryFn: () => billingApi.invoices({ limit: 100 }),
    retry: 1,
  });

  const tickets = extractRows(repairQuery.data, ["tickets", "repairs", "rows"]);
  const inventoryItems = extractRows(inventoryQuery.data, ["items", "inventoryItems", "products", "rows"]);
  const invoices = extractRows(billingQuery.data, ["invoices", "rows"]);

  // Calculate dynamic metrics
  const activeTickets = tickets.filter((t) => t.status !== "DELIVERED" && t.status !== "CANCELLED" && t.status !== "CLOSED");
  const pendingCount = activeTickets.length > 0 ? activeTickets.length : tickets.length;

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };
  const todayTickets = tickets.filter((t) => isToday(t.createdAt) || isToday(t.updatedAt));
  const todayCount = todayTickets.length > 0 ? todayTickets.length : activeTickets.length;

  const billingTickets = tickets.filter((t) => ["READY_FOR_REVIEW", "READY_FOR_DELIVERY", "DELIVERED"].includes(t.status));
  const billingCount = invoices.length > 0 ? invoices.filter((i) => i.status !== "PAID").length : billingTickets.length;

  const lowStockItems = inventoryItems.filter(isLowStock);
  const inventoryAlertCount = lowStockItems.length;

  const visibleActions = quickActions.filter((action) => hasPermission(...action.permissions));

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      <PageHeader
        title="Dashboard"
        description={`Good ${dayPart()}, ${user?.fullName || "there"}. Here is what needs attention now.`}
        actions={
          hasPermission(PERMISSIONS.REPAIR_INTAKE) ? (
            <Link to="/repair/new">
              <Button type="button" className="h-10 text-xs font-bold gap-2">
                <BadgePlus className="h-4 w-4" />
                Create Repair
              </Button>
            </Link>
          ) : null
        }
      />

      {/* TOP 5 SQUARE SUMMARY CARDS */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <SquareSummaryCard label="Today's Work" value={todayCount} detail="Jobs needing action" icon={Wrench} tone="bg-blue-50 text-blue-700" />
        <SquareSummaryCard label="Pending Repairs" value={pendingCount} detail="Open repair flow" icon={ClipboardList} tone="bg-emerald-50 text-emerald-700" />
        <SquareSummaryCard label="Billing Queue" value={billingCount} detail="Invoice / payment" icon={CreditCard} tone="bg-amber-50 text-amber-700" />
        <SquareSummaryCard label="Inventory Alerts" value={inventoryAlertCount} detail="Low attention stock" icon={PackageSearch} tone="bg-cyan-50 text-cyan-700" />
        <SquareSummaryCard
          label="Subscription"
          value={subMeta.daysLeft}
          detail={subMeta.detail}
          icon={Clock3}
          tone="bg-purple-50 text-purple-700"
          badge={subMeta.text}
          link="/subscription"
        />
      </section>

      {/* QUICK ACTIONS GRID */}
      {visibleActions.length ? (
        <Card className="rounded-2xl border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-slate-100">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4">
              {visibleActions.map((action) => (
                <ActionCard key={action.path} action={action} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SquareSummaryCard({ label, value, detail, icon: Icon, tone, badge, link }) {
  const content = (
    <Card className="group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md h-full flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold", tone)}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        {badge ? (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-800 tracking-wide">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{label}</p>
        <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5">{detail}</p>
      </div>
    </Card>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }

  return content;
}

function ActionCard({ action }) {
  const Icon = action.icon;
  return (
    <Link
      to={action.path}
      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold", action.tone)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-700">{action.label}</p>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">{action.detail}</p>
        </div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
    </Link>
  );
}

function dayPart() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
