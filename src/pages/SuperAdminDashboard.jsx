import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  GitBranch,
  Inbox,
  Mail,
  Phone,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { superAdminApi } from "@/services/modules";
import { cn, formatDate, formatCurrency } from "@/utils/cn";
import { useQuery } from "@tanstack/react-query";

function ownerLabel(owner) {
  if (!owner) return "Owner not assigned";
  return owner.fullName ? `${owner.fullName} · ${owner.phone || owner.email}` : owner.email;
}

function subscriptionDisplayStatus(subscription) {
  if (subscription?.metadata?.paymentRequest?.status === "REQUESTED") {
    return "APPROVAL_REQUESTED";
  }
  return subscription?.status || "NO_PLAN";
}

const PLAN_THEMES = {
  STARTER: {
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    iconBg: "bg-blue-100 text-blue-700",
    borderHover: "hover:border-blue-300",
    icon: Zap,
    description: "Single-branch repair shops with standard quota",
  },
  GROWTH: {
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    iconBg: "bg-purple-100 text-purple-700",
    borderHover: "hover:border-purple-300",
    icon: TrendingUp,
    description: "Multi-branch shops with team technician workflows",
  },
  ENTERPRISE: {
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-700",
    borderHover: "hover:border-emerald-300",
    icon: ShieldCheck,
    description: "Large repair franchises with custom limits",
  },
  TRIAL: {
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    iconBg: "bg-amber-100 text-amber-700",
    borderHover: "hover:border-amber-300",
    icon: Clock,
    description: "New signups evaluating the platform",
  },
};

export function SuperAdminDashboard() {
  const dashboardQuery = useQuery({
    queryKey: ["super-admin-dashboard"],
    queryFn: superAdminApi.dashboard,
  });

  const data = dashboardQuery.data?.data;
  const overview = data?.overview || {};
  const planBreakdown = data?.planBreakdown || [];
  const pendingApprovals = data?.pendingApprovals || [];
  const recentBusinesses = data?.recentBusinesses || [];
  const recentContacts = data?.recentContacts || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Platform Command Center"
          description="SaaS multi-tenant control center for subscription tiers, tenant users, and activation approvals."
        />
        <div className="flex items-center gap-2">
          <Link to="/super-admin/businesses">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs font-semibold">
              <Building2 className="h-3.5 w-3.5" />
              All Businesses
            </Button>
          </Link>
          <Link to="/super-admin/contacts">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs font-semibold">
              <Mail className="h-3.5 w-3.5" />
              Inquiries
            </Button>
          </Link>
        </div>
      </div>

      <QueryState
        isLoading={dashboardQuery.isLoading}
        error={dashboardQuery.error}
        isEmpty={!data}
        onRetry={dashboardQuery.refetch}
      >
        <div className="space-y-6">
          {/* Executive Top Metrics */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Tenant Businesses"
              value={overview.totalBusinesses || 0}
              detail={`${overview.activeBusinesses || 0} active · ${overview.suspendedBusinesses || 0} suspended`}
              icon={<Building2 className="h-4 w-4" />}
            />
            <KpiCard
              label="Total Platform Users"
              value={overview.totalStaff || 0}
              detail="Owners, branch admins & technicians"
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard
              label="Paid Subscriptions"
              value={overview.activeSubscriptions || 0}
              detail={`${overview.trialSubscriptions || 0} trial · ${overview.expiredSubscriptions || 0} expired`}
              icon={<CreditCard className="h-4 w-4" />}
            />
            <KpiCard
              label="Pending Approvals"
              value={pendingApprovals.length || overview.pendingSubscriptions || 0}
              detail="Payment & renewal requests awaiting review"
              icon={<AlertCircle className="h-4 w-4" />}
              className={pendingApprovals.length > 0 ? "border-amber-300 bg-amber-50/40" : ""}
            />
          </div>

          {/* Urgent Pending Approvals Queue */}
          {pendingApprovals.length > 0 ? (
            <Card className="border-amber-300 bg-[linear-gradient(135deg,#fffdf5,#fef8e8)] shadow-sm">
              <CardHeader className="border-b border-amber-200/80 px-5 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                    </span>
                    <CardTitle className="text-sm font-bold text-amber-950">
                      Pending Subscription Payment Requests ({pendingApprovals.length})
                    </CardTitle>
                  </div>
                  <span className="text-xs font-medium text-amber-800">
                    Verification required to activate tenant services
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {pendingApprovals.map((business) => {
                  const req = business.paymentRequest || business.subscription?.metadata?.paymentRequest;
                  const owner = business.owner;
                  return (
                    <div
                      key={business.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-white p-4 shadow-2xs transition hover:shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-slate-900">{business.name}</h4>
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {business.slug}
                          </span>
                          {req?.id ? (
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                              {req.id}
                            </span>
                          ) : null}
                          <StatusBadge status="APPROVAL_REQUESTED" />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">Owner: {owner?.fullName || "Not assigned"}</span>
                          {owner?.phone ? (
                            <a
                              href={`tel:${owner.phone}`}
                              className="inline-flex items-center gap-1 font-mono text-blue-600 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {owner.phone}
                            </a>
                          ) : null}
                          {owner?.email ? (
                            <span className="text-slate-500">({owner.email})</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-900">
                            {req?.plan || business.subscription?.plan || "Plan"} · {req?.durationDays ? `${req.durationDays} days` : "Standard"}
                          </p>
                          <p className="text-xs font-black text-emerald-600">
                            {req?.price ? formatCurrency(req.price) : "Amount pending"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {req?.requestedAt ? formatDate(req.requestedAt) : "Recently requested"}
                          </p>
                        </div>
                        <Link to={`/super-admin/businesses/${business.id}`}>
                          <Button size="sm" className="h-8 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Review & Activate
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          {/* Business Plans & Platform Users Breakdown */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Business Plans & User Allocation</h3>
              <p className="text-xs text-slate-500">
                Tenant distribution and total platform users working across each subscription tier. Click any plan to manage its shops.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {planBreakdown.map((planItem) => {
                const theme = PLAN_THEMES[planItem.key] || PLAN_THEMES.TRIAL;
                const Icon = theme.icon;
                return (
                  <Card
                    key={planItem.key}
                    className={cn(
                      "flex flex-col justify-between border-slate-200/80 transition-all hover:shadow-md",
                      theme.borderHover
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("grid h-7 w-7 place-items-center rounded-lg font-bold", theme.iconBg)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={cn("rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wider", theme.badgeClass)}>
                            {planItem.key}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {planItem.businessCount} {planItem.businessCount === 1 ? "Shop" : "Shops"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 leading-tight">
                        {theme.description}
                      </p>
                    </CardHeader>

                    <CardContent className="p-4 pt-2">
                      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 my-2 border border-slate-100">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Platform Users</p>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-black text-slate-900">{planItem.userCount}</span>
                            <span className="text-[10px] text-slate-400">accounts</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Locations</p>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-black text-slate-900">{planItem.branchCount}</span>
                            <span className="text-[10px] text-slate-400">branches</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 px-1">
                        <span>Logged Devices:</span>
                        <span className="font-bold text-slate-700">{planItem.ticketCount} repairs</span>
                      </div>

                      <Link
                        to={`/super-admin/businesses?plan=${planItem.key}`}
                        className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[var(--primary)]"
                      >
                        <span>Manage {planItem.key === "TRIAL" ? "Trial" : planItem.key} Tenants</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* 2-Column: Recent Tenants & Latest Inquiries */}
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            {/* Recent Tenants */}
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Building2 className="h-4 w-4 text-[var(--primary)]" />
                  Recent Tenant Registrations
                </CardTitle>
                <Link
                  to="/super-admin/businesses"
                  className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
                >
                  View All ({overview.totalBusinesses || 0})
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {recentBusinesses.length ? (
                  recentBusinesses.map((business) => (
                    <Link
                      key={business.id}
                      to={`/super-admin/businesses/${business.id}`}
                      className="block rounded-xl border border-slate-200/70 p-3.5 transition hover:bg-slate-50 hover:border-slate-300"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{business.name}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                              {business.slug}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{ownerLabel(business.owner)}</p>
                        </div>
                        <StatusBadge status={subscriptionDisplayStatus(business.subscription)} />
                      </div>
                      <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-2">
                        <span className="font-medium text-slate-700">{business.counts?.branches || 0} branches</span>
                        <span>·</span>
                        <span className="font-medium text-slate-700">{business.counts?.staff || 0} platform users</span>
                        <span>·</span>
                        <span className="font-medium text-slate-700">{business.counts?.tickets || 0} repair tickets</span>
                        <span className="ml-auto text-[10px] text-slate-400">{formatDate(business.createdAt)}</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">No tenant businesses registered yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Latest Inquiries / Leads */}
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Inbox className="h-4 w-4 text-blue-600" />
                  Website Leads & Callback Inquiries
                </CardTitle>
                <Link
                  to="/super-admin/contacts"
                  className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
                >
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {recentContacts.length ? (
                  recentContacts.map((contact) => (
                    <div key={contact.id} className="rounded-xl border border-slate-200/70 p-3 bg-white">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-xs text-slate-900">{contact.shopName || "Repair Shop"}</p>
                        <span className="text-[10px] text-slate-400">{formatDate(contact.createdAt)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-slate-600">{contact.name}</span>
                        {contact.phone ? (
                          <a
                            href={`tel:${contact.phone}`}
                            className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </a>
                        ) : null}
                      </div>
                      {contact.message ? (
                        <p className="mt-1.5 text-[11px] text-slate-500 line-clamp-2 italic bg-slate-50 p-1.5 rounded">
                          "{contact.message}"
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">No website callback inquiries yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </QueryState>
    </div>
  );
}
