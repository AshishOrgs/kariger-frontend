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
  return `${subscription.plan} / ${subscription.status}`;
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
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryTile
              label="Branches"
              value={business?.counts?.branches || business?.branches?.length || 0}
              detail="Owner-created shop locations"
              icon={<GitBranch className="h-4 w-4" />}
            />
            <SummaryTile
              label="Staff Accounts"
              value={business?.counts?.staff || 0}
              detail="Owner, admins, and technicians"
              icon={<Users className="h-4 w-4" />}
            />
            <SummaryTile
              label="Repair Devices"
              value={business?.counts?.tickets || 0}
              detail="Used for Starter 50-device trial"
              icon={<Building2 className="h-4 w-4" />}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{business?.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Info label="Slug" value={business?.slug} />
              <Info label="Status" value={<StatusBadge status={business?.status} />} />
              <Info label="Owner" value={ownerLabel(business?.owner)} />
              <Info label="Plan" value={planLabel(business?.subscription)} />
              <Info label="Phone" value={business?.phone || "Not set"} />
              <Info label="Email" value={business?.email || "Not set"} />
              <Info label="Website" value={business?.website || "Not set"} />
              <Info label="GST Number" value={business?.gstNumber || "Not set"} />
              <Info
                label="Address"
                value={[business?.address, business?.city, business?.state, business?.country]
                  .filter(Boolean)
                  .join(", ") || "Not set"}
              />
            </CardContent>
          </Card>
          <OwnerDetails business={business} />
          <BranchStaffDetails branches={business?.branches || []} />
          <SubscriptionAdminForm
            business={business}
            isSaving={subscriptionMutation.isPending}
            onSave={(payload) => subscriptionMutation.mutate(payload)}
          />
        </div>
      </QueryState>
    </div>
  );
}

function SummaryTile({ label, value, detail, icon }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
        </div>
        <div className="rounded-md bg-blue-50 p-2 text-[var(--primary)]">{icon}</div>
      </CardContent>
    </Card>
  );
}

function OwnerDetails({ business }) {
  const owner = business?.owner;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Owner Details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Owner name" value={owner?.fullName || "Not assigned"} />
        <Info label="Owner email" value={owner?.email || "Not set"} />
        <Info label="Owner mobile" value={owner?.phone || business?.phone || "Not set"} />
        <Info label="Owner account" value={<StatusBadge status={owner?.isActive ? "ACTIVE" : "INACTIVE"} />} />
      </CardContent>
    </Card>
  );
}

function BranchStaffDetails({ branches }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Branch, Admin & Staff Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {branches.length ? (
          branches.map((branch) => (
            <div key={branch.id} className="rounded-md border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{branch.name}</p>
                    {branch.isMainBranch ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        Main branch
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {branch.code} · {branch.address || "Address not set"}
                  </p>
                </div>
                <StatusBadge status={branch.status} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <MiniMetric label="Admins" value={branch.staffCounts?.admins || 0} />
                <MiniMetric label="Technicians" value={branch.staffCounts?.technicians || 0} />
                <MiniMetric label="Active staff" value={branch.staffCounts?.active || 0} />
                <MiniMetric label="Devices" value={branch._count?.tickets || 0} />
              </div>
              <div className="mt-4 overflow-hidden rounded-md border border-[var(--border)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Mobile</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branch.staff?.length ? (
                      branch.staff.map((member) => (
                        <tr key={member.id} className="border-t border-[var(--border)]">
                          <td className="px-3 py-2 font-medium">{member.fullName}</td>
                          <td className="px-3 py-2">{member.role}</td>
                          <td className="px-3 py-2">{member.email}</td>
                          <td className="px-3 py-2">{member.phone || "Not set"}</td>
                          <td className="px-3 py-2">
                            <StatusBadge status={member.isActive ? "ACTIVE" : "INACTIVE"} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-3 text-[var(--muted)]" colSpan={5}>
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
          <p className="text-sm text-[var(--muted)]">No branches created yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function SubscriptionAdminForm({ business, isSaving, onSave }) {
  const subscription = business?.subscription;
  const request = subscription?.metadata?.paymentRequest;
  const [plan, setPlan] = useState(subscription?.plan || "STARTER");
  const [status, setStatus] = useState(subscription?.status || "PENDING");
  const [startsAt, setStartsAt] = useState(dateInputValue(subscription?.startsAt));
  const [expiresAt, setExpiresAt] = useState(dateInputValue(subscription?.expiresAt));
  const [addDays, setAddDays] = useState("");

  useEffect(() => {
    setPlan(subscription?.plan || "STARTER");
    setStatus(subscription?.status || "PENDING");
    setStartsAt(dateInputValue(subscription?.startsAt));
    setExpiresAt(dateInputValue(subscription?.expiresAt));
    setAddDays("");
  }, [subscription]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      plan,
      status,
      startsAt: startsAt || undefined,
      expiresAt: expiresAt || null,
      addDays: addDays ? Number(addDays) : undefined,
    };
    onSave(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Control</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Plan">
            <Select value={plan} onChange={(event) => setPlan(event.target.value)}>
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="ENTERPRISE">Enterprise</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="PENDING">Pending</option>
              <option value="DONE">Done</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </Field>
          <Field label="Start date">
            <Input type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          </Field>
          <Field label="Expiry date">
            <Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </Field>
          <Field label="Add days">
            <Input
              min="1"
              max="3650"
              type="number"
              value={addDays}
              onChange={(event) => setAddDays(event.target.value)}
              placeholder="Example: 30"
            />
          </Field>
          <div className="rounded-md border border-[var(--border)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">Remaining</p>
            <p className="mt-2 text-sm font-medium">
              {subscription?.daysRemaining === null || subscription?.daysRemaining === undefined
                ? "No expiry set"
                : `${subscription.daysRemaining} days`}
            </p>
          </div>
          {request ? (
            <div className="rounded-md border border-[var(--border)] bg-slate-50 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase text-[var(--muted)]">Owner request</p>
              <p className="mt-2 text-sm font-medium">
                {request.serviceName} · {request.durationDays} days · {formatCurrency(request.price)}
              </p>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Subscription"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-md border border-[var(--border)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--muted)]">{label}</p>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}
