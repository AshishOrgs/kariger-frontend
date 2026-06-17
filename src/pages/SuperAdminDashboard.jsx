import { Link } from "react-router-dom";
import {
  Building2,
  ClipboardList,
  CreditCard,
  GitBranch,
  Inbox,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { superAdminApi } from "@/services/modules";
import { formatDate } from "@/utils/cn";
import { useQuery } from "@tanstack/react-query";

function ownerLabel(owner) {
  if (!owner) return "Owner not assigned";
  return owner.fullName ? `${owner.fullName} · ${owner.email}` : owner.email;
}

export function SuperAdminDashboard() {
  const dashboardQuery = useQuery({
    queryKey: ["super-admin-dashboard"],
    queryFn: superAdminApi.dashboard,
  });
  const data = dashboardQuery.data?.data;
  const overview = data?.overview || {};
  const recentBusinesses = data?.recentBusinesses || [];
  const recentContacts = data?.recentContacts || [];

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        description="SaaS company control center for tenants, subscriptions, branches, and service usage."
      />
      <QueryState
        isLoading={dashboardQuery.isLoading}
        error={dashboardQuery.error}
        isEmpty={!data}
        onRetry={dashboardQuery.refetch}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Tenant Businesses"
              value={overview.totalBusinesses || 0}
              detail={`${overview.activeBusinesses || 0} active · ${overview.suspendedBusinesses || 0} suspended`}
              icon={<Building2 className="h-4 w-4" />}
            />
            <KpiCard
              label="Pending Payments"
              value={overview.pendingSubscriptions || 0}
              detail={`${overview.activeSubscriptions || 0} active paid subscriptions`}
              icon={<CreditCard className="h-4 w-4" />}
            />
            <KpiCard
              label="Branches"
              value={overview.totalBranches || 0}
              detail={`${overview.totalStaff || 0} total owner/admin/staff accounts`}
              icon={<GitBranch className="h-4 w-4" />}
            />
            <KpiCard
              label="Repair Devices"
              value={overview.totalTickets || 0}
              detail={`${overview.trialSubscriptions || 0} trial · ${overview.expiredSubscriptions || 0} expired`}
              icon={<ClipboardList className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Recent Tenants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentBusinesses.length ? (
                  recentBusinesses.map((business) => (
                    <Link
                      key={business.id}
                      to={`/super-admin/businesses/${business.id}`}
                      className="block rounded-md border border-[var(--border)] p-4 transition hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{business.name}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{ownerLabel(business.owner)}</p>
                        </div>
                        <StatusBadge status={business.subscription?.status || "NO_PLAN"} />
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-3">
                        <span>{business.counts?.branches || 0} branches</span>
                        <span>{business.counts?.staff || 0} staff</span>
                        <span>{business.counts?.tickets || 0} devices</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted)]">No tenant businesses yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  Latest Inquiries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentContacts.length ? (
                  recentContacts.map((contact) => (
                    <div key={contact.id} className="rounded-md border border-[var(--border)] p-4">
                      <p className="font-semibold">{contact.shopName}</p>
                      <p className="mt-1 text-sm">{contact.name} · {contact.phone}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">{formatDate(contact.createdAt)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted)]">No inquiries yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Subscription Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Attention label="Payment Pending" value={overview.pendingSubscriptions || 0} />
              <Attention label="Trial Running" value={overview.trialSubscriptions || 0} />
              <Attention label="Expired" value={overview.expiredSubscriptions || 0} />
            </CardContent>
          </Card>
        </div>
      </QueryState>
    </div>
  );
}

function Attention({ label, value }) {
  return (
    <div className="rounded-md border border-[var(--border)] p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
