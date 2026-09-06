import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2, GitBranch, Users } from "lucide-react";
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

export function SuperAdminBusinesses() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const businessesQuery = useQuery({
    queryKey: ["super-admin-businesses"],
    queryFn: () => superAdminApi.businesses(),
  });

  const businesses = businessesQuery.data?.data?.businesses || [];

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

  return (
    <div>
      <PageHeader
        title="Businesses"
        description="SaaS tenant list for super admin operations."
      />

      <Card>
        <CardHeader>
          <CardTitle>Business Tenants</CardTitle>
        </CardHeader>
        <DataTable
          rows={businesses}
          isLoading={businessesQuery.isLoading}
          error={businessesQuery.error}
          onRetry={businessesQuery.refetch}
          searchable
          emptyTitle="No businesses found"
          columns={[
            {
              key: "name",
              header: "Business",
              render: (business) => (
                <div>
                  <p className="font-semibold">{business.name}</p>
                  <p className="text-xs text-[var(--muted)]">{business.slug}</p>
                </div>
              ),
            },
            {
              key: "owner",
              header: "Owner",
              render: (business) => ownerLabel(business.owner),
            },
            {
              key: "plan",
              header: "Plan",
              render: (business) => planLabel(business.subscription),
            },
            {
              key: "branches",
              header: "Branches",
              render: (business) => business.counts?.branches || 0,
            },
            {
              key: "staff",
              header: "Staff",
              render: (business) => business.counts?.staff || 0,
            },
            {
              key: "devices",
              header: "Devices",
              render: (business) => business.counts?.tickets || 0,
            },
            {
              key: "status",
              header: "Status",
              render: (business) => <StatusBadge status={business.status} />,
            },
            {
              key: "createdAt",
              header: "Created",
              render: (business) => formatDate(business.createdAt),
            },
            {
              key: "actions",
              header: "Action",
              render: (business) => {
                const isSuspended = business.status === "SUSPENDED";
                return (
                  <div className="flex flex-wrap gap-2">
                    <ActionLink to={`/super-admin/businesses/${business.id}`}>
                      Owner Details
                    </ActionLink>
                    <Button
                      size="sm"
                      variant={isSuspended ? "primary" : "secondary"}
                      disabled={statusMutation.isPending}
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
        "focus-ring inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-slate-50"
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
