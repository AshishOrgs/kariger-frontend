import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  GitBranch,
  Phone,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field, Input, Select } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { superAdminApi } from "@/services/modules";
import { cn, formatDate, formatCurrency } from "@/utils/cn";
import { useToast } from "@/contexts/ToastContext";

function ownerLabel(owner) {
  if (!owner) return "Not assigned";
  return owner.fullName ? `${owner.fullName} (${owner.email})` : owner.email;
}

function planLabel(subscription) {
  if (!subscription) return "No plan";
  if (subscription.metadata?.paymentRequest?.status === "REQUESTED") {
    return `${subscription.plan || "No plan selected"} / APPROVAL REQUESTED`;
  }
  return `${subscription.plan || "No plan selected"} / ${subscription.status}`;
}

function hasApprovalRequest(subscription) {
  return subscription?.metadata?.paymentRequest?.status === "REQUESTED";
}

const PLAN_TABS = [
  { key: "ALL", label: "All Tenants" },
  { key: "STARTER", label: "Starter" },
  { key: "GROWTH", label: "Growth" },
  { key: "ENTERPRISE", label: "Enterprise" },
  { key: "TRIAL", label: "Free Trial" },
  { key: "PENDING", label: "Approvals Pending" },
];

export function SuperAdminBusinesses() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const activePlanTab = searchParams.get("plan") || "ALL";
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const businessesQuery = useQuery({
    queryKey: ["super-admin-businesses"],
    queryFn: () => superAdminApi.businesses(),
  });

  const allBusinesses = businessesQuery.data?.data?.businesses || [];

  const statusMutation = useMutation({
    mutationFn: ({ id, action }) =>
      action === "suspend" ? superAdminApi.suspend(id) : superAdminApi.activate(id),
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === "suspend" ? "Business suspended." : "Business activated."
      );
      queryClient.invalidateQueries({ queryKey: ["super-admin-businesses"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Business status update failed.");
    },
  });

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const counts = { ALL: allBusinesses.length, STARTER: 0, GROWTH: 0, ENTERPRISE: 0, TRIAL: 0, PENDING: 0 };
    for (const b of allBusinesses) {
      const plan = b.subscription?.plan;
      if (plan === "STARTER") counts.STARTER += 1;
      else if (plan === "GROWTH") counts.GROWTH += 1;
      else if (plan === "ENTERPRISE") counts.ENTERPRISE += 1;
      else counts.TRIAL += 1;

      if (hasApprovalRequest(b.subscription) || b.subscription?.status === "PENDING") {
        counts.PENDING += 1;
      }
    }
    return counts;
  }, [allBusinesses]);

  // Filter businesses
  const filteredBusinesses = useMemo(() => {
    return allBusinesses.filter((b) => {
      // 1. Plan Tab filter
      if (activePlanTab === "PENDING") {
        const isPending = hasApprovalRequest(b.subscription) || b.subscription?.status === "PENDING";
        if (!isPending) return false;
      } else if (activePlanTab === "TRIAL") {
        const isStandard = ["STARTER", "GROWTH", "ENTERPRISE"].includes(b.subscription?.plan);
        if (isStandard) return false;
      } else if (activePlanTab !== "ALL") {
        if (b.subscription?.plan !== activePlanTab) return false;
      }

      // 2. Status filter
      if (statusFilter !== "ALL" && b.status !== statusFilter) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (b.name || "").toLowerCase();
        const slug = (b.slug || "").toLowerCase();
        const ownerName = (b.owner?.fullName || "").toLowerCase();
        const ownerEmail = (b.owner?.email || "").toLowerCase();
        const ownerPhone = (b.owner?.phone || "").toLowerCase();
        const reqId = (b.subscription?.metadata?.paymentRequest?.id || "").toLowerCase();
        if (
          !name.includes(query) &&
          !slug.includes(query) &&
          !ownerName.includes(query) &&
          !ownerEmail.includes(query) &&
          !ownerPhone.includes(query) &&
          !reqId.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allBusinesses, activePlanTab, statusFilter, searchQuery]);

  const totalUsersInFiltered = useMemo(() => {
    return filteredBusinesses.reduce((acc, b) => acc + (b.counts?.staff || 0), 0);
  }, [filteredBusinesses]);

  const totalBranchesInFiltered = useMemo(() => {
    return filteredBusinesses.reduce((acc, b) => acc + (b.counts?.branches || 0), 0);
  }, [filteredBusinesses]);

  const handleSelectTab = (tabKey) => {
    const nextParams = new URLSearchParams(searchParams);
    if (tabKey === "ALL") {
      nextParams.delete("plan");
    } else {
      nextParams.set("plan", tabKey);
    }
    setSearchParams(nextParams);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Tenant Businesses"
          description="SaaS tenant control directory with plan filtering, platform user volume, and subscription management."
        />
        <div className="flex items-center gap-2">
          <Link to="/super-admin/dashboard">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs font-semibold">
              <Zap className="h-3.5 w-3.5" />
              Platform Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Plan-Wise Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/90 p-1 border border-slate-200/70">
        {PLAN_TABS.map((tab) => {
          const isActive = activePlanTab === tab.key;
          const count = tabCounts[tab.key] || 0;
          const isPendingTab = tab.key === "PENDING";
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleSelectTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                isActive
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  isPendingTab && count > 0
                    ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                    : isActive
                    ? "bg-slate-100 text-slate-800"
                    : "bg-slate-200/70 text-slate-500"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        {/* Compact Search and Secondary Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by business, slug, owner, phone..."
              className="h-8 pl-8 text-xs bg-white rounded-lg"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Status:</span>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 text-xs py-0.5 w-28 bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </Select>
            </div>

            <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span><strong>{filteredBusinesses.length}</strong> shops</span>
              <span>·</span>
              <span><strong>{totalUsersInFiltered}</strong> users</span>
              <span>·</span>
              <span><strong>{totalBranchesInFiltered}</strong> branches</span>
            </div>
          </div>
        </div>

        <DataTable
          rows={filteredBusinesses}
          isLoading={businessesQuery.isLoading}
          error={businessesQuery.error}
          onRetry={businessesQuery.refetch}
          searchable={false}
          emptyTitle="No businesses match the selected filters"
          columns={[
            {
              key: "name",
              header: "Business Tenant",
              render: (business) => (
                <div className="max-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-xs text-slate-900 truncate" title={business.name}>
                      {business.name}
                    </p>
                    <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">
                      {business.slug?.length > 14 ? `${business.slug.slice(0, 14)}...` : business.slug}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {formatDate(business.createdAt)}
                  </p>
                </div>
              ),
            },
            {
              key: "owner",
              header: "Owner & Contact",
              render: (business) => {
                const owner = business.owner;
                return (
                  <div className="max-w-[190px]">
                    <p className="font-semibold text-xs text-slate-800 truncate" title={owner?.fullName}>
                      {owner?.fullName || "Not assigned"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      {owner?.phone ? (
                        <a
                          href={`tel:${owner.phone}`}
                          className="inline-flex items-center gap-0.5 font-mono text-blue-600 hover:underline shrink-0"
                        >
                          <Phone className="h-2.5 w-2.5" />
                          {owner.phone}
                        </a>
                      ) : null}
                      {owner?.email ? (
                        <span className="truncate text-slate-400" title={owner.email}>
                          {owner.email}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              },
            },
            {
              key: "plan",
              header: "Plan & Tier",
              render: (business) => {
                const sub = business.subscription;
                const isPending = hasApprovalRequest(sub);
                const planName = sub?.plan || "TRIAL";
                return (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-slate-800">
                        {planName}
                      </span>
                      <StatusBadge status={isPending ? "APPROVAL_REQUESTED" : sub?.status || "NOT_SELECTED"} />
                    </div>
                    {sub?.daysRemaining !== undefined && sub?.daysRemaining !== null ? (
                      <p className="text-[10px] text-slate-400">
                        {sub.daysRemaining > 0 ? `${sub.daysRemaining}d left` : "Expired"}
                      </p>
                    ) : null}
                  </div>
                );
              },
            },
            {
              key: "staff",
              header: "Users",
              render: (business) => (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-slate-400" />
                  <span className="font-bold text-xs text-slate-800">{business.counts?.staff || 0}</span>
                </div>
              ),
            },
            {
              key: "branches",
              header: "Branches",
              render: (business) => (
                <div className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">{business.counts?.branches || 0}</span>
                </div>
              ),
            },
            {
              key: "devices",
              header: "Devices",
              render: (business) => (
                <span className="text-xs text-slate-600">{business.counts?.tickets || 0} tickets</span>
              ),
            },
            {
              key: "status",
              header: "State",
              render: (business) => <StatusBadge status={business.status} />,
            },
            {
              key: "actions",
              header: "Management",
              render: (business) => {
                const isSuspended = business.status === "SUSPENDED";
                const isPending = hasApprovalRequest(business.subscription);
                return (
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    {isPending ? (
                      <Link to={`/super-admin/businesses/${business.id}`}>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs whitespace-nowrap"
                        >
                          Approve
                        </Button>
                      </Link>
                    ) : null}
                    <Link to={`/super-admin/businesses/${business.id}`}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2.5 text-[11px] font-semibold whitespace-nowrap"
                      >
                        Manage
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant={isSuspended ? "primary" : "ghost"}
                      disabled={statusMutation.isPending}
                      className="h-7 px-2 text-[11px] text-slate-500 hover:text-rose-600 font-medium whitespace-nowrap"
                      onClick={() =>
                        statusMutation.mutate({
                          id: business.id,
                          action: isSuspended ? "activate" : "suspend",
                        })
                      }
                    >
                      {isSuspended ? "Activate" : "Suspend"}
                    </Button>
                  </div>
                );
              },
            },
          ]}
        />
      </Card>
    </div>
  );
}

function ActionLink({ to, children }) {
  return (
    <Link
      to={to}
      className={cn(
        "focus-ring inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-slate-50"
      )}
    >
      {children}
    </Link>
  );
}

export function SuperAdminBusinessDetails({ id }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const businessQuery = useQuery({
    queryKey: ["super-admin-business", id],
    queryFn: () => superAdminApi.business(id),
    enabled: Boolean(id),
  });
  const business = businessQuery.data?.data?.business;

  const subscriptionMutation = useMutation({
    mutationFn: (payload) => superAdminApi.updateSubscription(id, payload),
    onSuccess: () => {
      toast.success("Subscription updated.");
      queryClient.invalidateQueries({ queryKey: ["super-admin-business", id] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-businesses"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Subscription update failed.");
    },
  });

  return (
    <div>
      <PageHeader title="Business Details" description="Tenant profile and subscription snapshot." />
      <QueryState
        isLoading={businessQuery.isLoading}
        error={businessQuery.error}
        isEmpty={!business}
        onRetry={businessQuery.refetch}
      >
        <div className="space-y-3">
          {/* Compact Top Summary Metrics */}
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile
              label="Branches"
              value={business?.counts?.branches || business?.branches?.length || 0}
              detail="Shop locations"
              icon={<GitBranch className="h-4 w-4" />}
            />
            <SummaryTile
              label="Staff Accounts"
              value={business?.counts?.staff || 0}
              detail="Owners & technicians"
              icon={<Users className="h-4 w-4" />}
            />
            <SummaryTile
              label="Repair Devices"
              value={business?.counts?.tickets || 0}
              detail="Logged repair devices"
              icon={<Building2 className="h-4 w-4" />}
            />
          </div>

          {/* Unified Business & Owner Profile Card */}
          <BusinessProfileCard business={business} />

          {/* Subscription Control Form */}
          <SubscriptionAdminForm
            business={business}
            isSaving={subscriptionMutation.isPending}
            onSave={(payload) => subscriptionMutation.mutate(payload)}
          />

          {/* Branch & Staff Overview */}
          <BranchStaffDetails branches={business?.branches || []} />
        </div>
      </QueryState>
    </div>
  );
}

function SummaryTile({ label, value, detail, icon }) {
  return (
    <Card className="shadow-sm border border-slate-200/80">
      <CardContent className="flex items-center justify-between p-3.5">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="mt-0.5 text-xl font-black text-slate-900">{value}</p>
          <p className="text-[10px] text-slate-400">{detail}</p>
        </div>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[var(--primary)] border border-blue-100/60">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessProfileCard({ business }) {
  const owner = business?.owner;
  const address = [business?.address, business?.city, business?.state, business?.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="shadow-sm border border-slate-200/80">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100/70 text-[var(--primary)] font-bold">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{business?.name || "Business"}</h3>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 font-semibold">
                {business?.slug}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Created: {formatDate(business?.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={business?.status} />
        </div>
      </CardHeader>
      <CardContent className="p-3.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <InfoItem label="Owner" value={ownerLabel(owner)} />
          <InfoItem label="Phone" value={business?.phone || owner?.phone || "Not set"} />
          <InfoItem label="Email" value={business?.email || owner?.email || "Not set"} />
          <InfoItem label="Plan" value={planLabel(business?.subscription)} highlight />
          <InfoItem label="GST Number" value={business?.gstNumber || "Not set"} />
          <InfoItem label="Website" value={business?.website || "Not set"} />
          <InfoItem label="Owner Account" value={owner?.isActive ? "Active" : "Inactive"} />
          <InfoItem label="Address" value={address || "Not set"} className="col-span-2 sm:col-span-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value, highlight, className = "" }) {
  return (
    <div className={cn("rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 transition hover:bg-slate-50", className)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className={cn("mt-0.5 text-xs font-semibold truncate", highlight ? "text-[var(--primary)] font-bold" : "text-slate-800")}>
        {value}
      </div>
    </div>
  );
}

function BranchStaffDetails({ branches }) {
  return (
    <Card className="shadow-sm border border-slate-200/80">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-4 py-2.5">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Branch, Admin & Staff Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3.5 space-y-3">
        {branches.length ? (
          branches.map((branch) => (
            <div key={branch.id} className="rounded-lg border border-slate-200/80 p-3 bg-white shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-900">{branch.name}</p>
                  {branch.isMainBranch ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      Main
                    </span>
                  ) : null}
                  <span className="text-[11px] text-slate-400">({branch.code})</span>
                </div>
                <StatusBadge status={branch.status} />
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                <MiniMetric label="Admins" value={branch.staffCounts?.admins || 0} />
                <MiniMetric label="Technicians" value={branch.staffCounts?.technicians || 0} />
                <MiniMetric label="Active Staff" value={branch.staffCounts?.active || 0} />
                <MiniMetric label="Devices" value={branch._count?.tickets || 0} />
              </div>
              <div className="mt-2.5 overflow-hidden rounded-lg border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                    <tr>
                      <th className="px-2.5 py-1.5">Name</th>
                      <th className="px-2.5 py-1.5">Role</th>
                      <th className="px-2.5 py-1.5">Email</th>
                      <th className="px-2.5 py-1.5">Mobile</th>
                      <th className="px-2.5 py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branch.staff?.length ? (
                      branch.staff.map((member) => (
                        <tr key={member.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="px-2.5 py-1.5 font-medium text-slate-900">{member.fullName}</td>
                          <td className="px-2.5 py-1.5 text-slate-600">{member.role}</td>
                          <td className="px-2.5 py-1.5 text-slate-500">{member.email}</td>
                          <td className="px-2.5 py-1.5 text-slate-500">{member.phone || "Not set"}</td>
                          <td className="px-2.5 py-1.5">
                            <StatusBadge status={member.isActive ? "ACTIVE" : "INACTIVE"} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-2.5 py-2 text-slate-400 text-center" colSpan={5}>
                          No staff assigned to this branch.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400">No branches created yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-2 py-1 text-center">
      <p className="text-[9px] font-bold uppercase text-slate-400">{label}</p>
      <p className="text-xs font-bold text-slate-800">{value}</p>
    </div>
  );
}

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatAuditDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

function SubscriptionAdminForm({ business, isSaving, onSave }) {
  const subscription = business?.subscription;
  const request = subscription?.metadata?.paymentRequest;
  const approvalRequested = hasApprovalRequest(subscription);
  const [plan, setPlan] = useState(subscription?.plan || "STARTER");
  const [status, setStatus] = useState(subscription?.status || "NOT_SELECTED");
  const [startsAt, setStartsAt] = useState(dateInputValue(subscription?.startsAt));
  const [expiresAt, setExpiresAt] = useState(dateInputValue(subscription?.expiresAt));
  const [addDays, setAddDays] = useState("");
  const [activationReason, setActivationReason] = useState("Manual Payment Verified");
  const [internalNote, setInternalNote] = useState("");

  useEffect(() => {
    setPlan(subscription?.plan || "STARTER");
    setStatus(subscription?.status || "NOT_SELECTED");
    setStartsAt(dateInputValue(subscription?.startsAt));
    setExpiresAt(dateInputValue(subscription?.expiresAt));
    setAddDays("");
    setActivationReason("Manual Payment Verified");
    setInternalNote("");
  }, [subscription]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      plan,
      status,
      startsAt: startsAt || undefined,
      expiresAt: expiresAt || null,
      addDays: addDays ? Number(addDays) : undefined,
      activationReason,
      internalNote: internalNote || undefined,
    };
    onSave(payload);
  };

  const handleActivate = () => {
    onSave({
      plan,
      status: "ACTIVE",
      startsAt: startsAt || undefined,
      expiresAt: expiresAt || undefined,
      addDays: addDays ? Number(addDays) : undefined,
      activationReason,
      internalNote: internalNote || undefined,
    });
  };

  const audit = subscription?.metadata?.subscriptionAudit || [];
  const history = subscription?.metadata?.subscriptionHistory || audit;
  const daysLeft = subscription?.daysRemaining;

  return (
    <Card className="shadow-sm border border-slate-200/80">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-2.5">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Subscription Control
        </CardTitle>
        <span className="text-[11px] font-semibold text-slate-500">
          Remaining: <span className="font-bold text-slate-800">{daysLeft === null || daysLeft === undefined ? "No expiry" : `${daysLeft} days`}</span>
        </span>
      </CardHeader>
      <CardContent className="p-3.5 space-y-3">
        {/* Compact Owner Activation Request Banner */}
        {request ? (
          <div className="rounded-xl border border-amber-200 bg-[linear-gradient(135deg,#fffdf5,#fef3c7)] p-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase text-amber-950 tracking-wider">
                      Activation Request
                    </span>
                    <span className="font-mono text-[11px] font-bold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded">
                      {request.paymentRequestId || request.id || "REQ"}
                    </span>
                    <StatusBadge status={request.status || "REQUESTED"} />
                  </div>
                  <p className="mt-0.5 text-xs text-amber-800 font-medium">
                    {request.serviceName} · {request.durationDays} days · <span className="font-bold">{formatCurrency(request.price)}</span>
                    <span className="text-amber-700/70 ml-2">({formatAuditDate(request.requestedAt)})</span>
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={isSaving}
                onClick={handleActivate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs shadow-xs"
              >
                {isSaving ? "Activating..." : "Approve & Activate Now"}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Compact 4-Column Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Field label={<span className="text-[11px] font-semibold text-slate-600">Plan</span>}>
              <Select className="h-8.5 text-xs py-1" value={plan} onChange={(event) => setPlan(event.target.value)}>
                <option value="STARTER">Starter</option>
                <option value="GROWTH">Growth</option>
                <option value="ENTERPRISE">Enterprise</option>
              </Select>
            </Field>

            <Field label={<span className="text-[11px] font-semibold text-slate-600">Status</span>}>
              <Select className="h-8.5 text-xs py-1" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="NOT_SELECTED">Not selected</option>
                <option value="PENDING">Pending</option>
                <option value="DONE">Done</option>
                <option value="ACTIVE">Active</option>
                <option value="TRIALING">{approvalRequested ? "Trialing (Req)" : "Trialing"}</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </Field>

            <Field label={<span className="text-[11px] font-semibold text-slate-600">Activation Reason</span>}>
              <Select className="h-8.5 text-xs py-1" value={activationReason} onChange={(event) => setActivationReason(event.target.value)}>
                <option value="Manual Payment Verified">Manual Payment Verified</option>
                <option value="UPI Payment">UPI Payment</option>
                <option value="Renewal">Renewal</option>
                <option value="Extension">Extension</option>
                <option value="Trial Upgrade">Trial Upgrade</option>
              </Select>
            </Field>

            <Field label={<span className="text-[11px] font-semibold text-slate-600">Add Days</span>}>
              <Input
                className="h-8.5 text-xs py-1"
                min="1"
                max="3650"
                type="number"
                value={addDays}
                onChange={(event) => setAddDays(event.target.value)}
                placeholder="Days (e.g. 30)"
              />
            </Field>

            <Field label={<span className="text-[11px] font-semibold text-slate-600">Start Date</span>}>
              <Input className="h-8.5 text-xs py-1" type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            </Field>

            <Field label={<span className="text-[11px] font-semibold text-slate-600">Expiry Date</span>}>
              <Input className="h-8.5 text-xs py-1" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            </Field>

            <Field className="sm:col-span-2" label={<span className="text-[11px] font-semibold text-slate-600">Internal Note</span>}>
              <Input
                className="h-8.5 text-xs py-1"
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                placeholder="Internal verification note (e.g. Paid ₹499 via UPI)"
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="submit" size="sm" variant="secondary" className="h-8.5 text-xs" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Subscription"}
            </Button>
            <Button type="button" size="sm" className="h-8.5 text-xs" disabled={isSaving} onClick={handleActivate}>
              {isSaving ? "Activating..." : approvalRequested ? "Approve Request & Activate" : "Activate Subscription"}
            </Button>
          </div>
        </form>

        {/* Compact Audit History */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Activation / Renewal Audit ({history.length})
          </p>
          {history.length ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {history.slice().reverse().map((entry, index) => (
                <div key={`${entry.at}-${index}`} className="rounded-md border border-slate-100 bg-white px-2.5 py-1.5 text-xs shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-semibold text-slate-800">
                      {entry.action || "UPDATED"} · <span className="font-bold text-[var(--primary)]">{entry.plan || "No plan"}</span> · {entry.status}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatAuditDate(entry.at)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {entry.reason ? `Reason: ${entry.reason}` : ""}
                    {entry.addDays ? ` · Extended ${entry.addDays}d` : ""}
                    {entry.internalNote ? ` · Note: "${entry.internalNote}"` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">No activation or renewal audit yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
