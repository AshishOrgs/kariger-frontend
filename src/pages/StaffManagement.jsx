import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { KeyRound, Settings2, Trash2, UserCheck, UserX, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, PasswordInput, Select } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { Table, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { branchesApi, staffApi } from "@/services/modules";
import { PERMISSIONS } from "@/utils/permissions";
import { cn } from "@/utils/cn";

const ROLE_LABELS = {
  OWNER: "Owner",
  ADMIN: "Branch Admin",
  BRANCH_ADMIN: "Branch Admin",
  TECHNICIAN: "Technician",
};

const ROLE_TEMPLATE_PERMISSIONS = {
  OWNER: [
    PERMISSIONS.REPAIR_INTAKE,
    PERMISSIONS.REPAIR_JOBS_VIEW,
    PERMISSIONS.REPAIR_ESTIMATE,
    PERMISSIONS.ESTIMATE_CREATE,
    PERMISSIONS.ESTIMATE_APPROVE,
    PERMISSIONS.ESTIMATE_REJECT,
    PERMISSIONS.REPAIR_ASSIGN,
    PERMISSIONS.REPAIR_WORK,
    PERMISSIONS.REPAIR_STATUS_UPDATE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.INVENTORY_CONSUME,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_CREATE,
    PERMISSIONS.PAYMENT_COLLECT,
    PERMISSIONS.HANDOVER_VIEW,
    PERMISSIONS.HANDOVER_MANAGE,
    PERMISSIONS.VENDOR_VIEW,
    PERMISSIONS.VENDOR_MANAGE,
    PERMISSIONS.VENDOR_JOB_UPDATE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.STAFF_MANAGE,
    PERMISSIONS.STAFF_BRANCH_ASSIGN,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.BRANCH_MANAGE,
    PERMISSIONS.BUSINESS_MANAGE,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.SUBSCRIPTION_MANAGE,
  ],
  ADMIN: [
    PERMISSIONS.REPAIR_INTAKE,
    PERMISSIONS.REPAIR_JOBS_VIEW,
    PERMISSIONS.REPAIR_ESTIMATE,
    PERMISSIONS.ESTIMATE_CREATE,
    PERMISSIONS.ESTIMATE_APPROVE,
    PERMISSIONS.ESTIMATE_REJECT,
    PERMISSIONS.REPAIR_ASSIGN,
    PERMISSIONS.REPAIR_STATUS_UPDATE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.INVENTORY_CONSUME,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_CREATE,
    PERMISSIONS.PAYMENT_COLLECT,
    PERMISSIONS.HANDOVER_VIEW,
    PERMISSIONS.HANDOVER_MANAGE,
    PERMISSIONS.VENDOR_VIEW,
    PERMISSIONS.VENDOR_MANAGE,
    PERMISSIONS.VENDOR_JOB_UPDATE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.STAFF_MANAGE,
  ],
  TECHNICIAN: [
    PERMISSIONS.REPAIR_JOBS_VIEW,
    PERMISSIONS.REPAIR_ESTIMATE,
    PERMISSIONS.ESTIMATE_CREATE,
    PERMISSIONS.REPAIR_WORK,
    PERMISSIONS.REPAIR_STATUS_UPDATE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_CONSUME,
    PERMISSIONS.HANDOVER_VIEW,
    PERMISSIONS.HANDOVER_MANAGE,
    PERMISSIONS.VENDOR_VIEW,
    PERMISSIONS.VENDOR_JOB_UPDATE,
  ],
};

const PERMISSION_GROUPS = [
  {
    title: "Repair",
    permissions: [
      [PERMISSIONS.REPAIR_INTAKE, "Repair Intake"],
      [PERMISSIONS.REPAIR_JOBS_VIEW, "Repair Jobs"],
      [PERMISSIONS.REPAIR_ESTIMATE, "Estimate Access"],
      [PERMISSIONS.ESTIMATE_CREATE, "Create Estimate"],
      [PERMISSIONS.ESTIMATE_APPROVE, "Approve Estimate"],
      [PERMISSIONS.ESTIMATE_REJECT, "Reject Estimate"],
      [PERMISSIONS.REPAIR_ASSIGN, "Assign Technician"],
      [PERMISSIONS.REPAIR_WORK, "Repair Work"],
      [PERMISSIONS.REPAIR_STATUS_UPDATE, "Update Repair Status"],
    ],
  },
  {
    title: "Inventory",
    permissions: [
      [PERMISSIONS.INVENTORY_VIEW, "View Inventory"],
      [PERMISSIONS.INVENTORY_MANAGE, "Manage Inventory"],
      [PERMISSIONS.INVENTORY_CONSUME, "Consume Parts"],
    ],
  },
  {
    title: "Billing",
    permissions: [
      [PERMISSIONS.BILLING_VIEW, "View Billing"],
      [PERMISSIONS.BILLING_CREATE, "Create Invoice"],
      [PERMISSIONS.PAYMENT_COLLECT, "Collect Payment"],
    ],
  },
  {
    title: "Operations",
    permissions: [
      [PERMISSIONS.HANDOVER_VIEW, "View Handover"],
      [PERMISSIONS.HANDOVER_MANAGE, "Manage Handover"],
      [PERMISSIONS.VENDOR_VIEW, "View Vendors"],
      [PERMISSIONS.VENDOR_MANAGE, "Manage Vendors"],
      [PERMISSIONS.VENDOR_JOB_UPDATE, "Update Vendor Jobs"],
    ],
  },
  {
    title: "Business",
    permissions: [
      [PERMISSIONS.REPORTS_VIEW, "Reports"],
      [PERMISSIONS.STAFF_VIEW, "View Staff"],
      [PERMISSIONS.STAFF_MANAGE, "Manage Staff"],
      [PERMISSIONS.STAFF_BRANCH_ASSIGN, "Assign Staff Branch"],
      [PERMISSIONS.BRANCH_VIEW, "View Branches"],
      [PERMISSIONS.BRANCH_MANAGE, "Manage Branches"],
      [PERMISSIONS.BUSINESS_MANAGE, "Business Settings"],
      [PERMISSIONS.SETTINGS_MANAGE, "System Settings"],
      [PERMISSIONS.SUBSCRIPTION_MANAGE, "Subscription"],
    ],
  },
];

const ACCESS_SCOPE_OPTIONS = [
  ["ownBranch", "Current Branch"],
  ["selectedBranches", "Selected Branches"],
  ["allBranches", "All Branches"],
];

const TICKET_SCOPE_OPTIONS = [
  ["all", "All Tickets"],
  ["assignedTicketsOnly", "Assigned Tickets Only"],
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map(([permission]) => permission)
);

const getTemplatePermissions = (role) => ROLE_TEMPLATE_PERMISSIONS[role] || ROLE_TEMPLATE_PERMISSIONS.TECHNICIAN;
const toPermissionArray = (permissions) => Array.from(new Set(permissions || []));
const hasPermissionChanged = (current, defaults) => {
  const defaultSet = new Set(defaults);
  return current.length !== defaults.length || current.some((permission) => !defaultSet.has(permission));
};

function togglePermission(permissions, permission) {
  const next = new Set(permissions);
  if (next.has(permission)) {
    next.delete(permission);
  } else {
    next.add(permission);
  }
  return Array.from(next);
}

function buildOverridePayload(permissions, defaultPermissions) {
  const activeSet = new Set(permissions);
  const defaultSet = new Set(defaultPermissions);

  return ALL_PERMISSION_KEYS
    .filter((permission) => activeSet.has(permission) !== defaultSet.has(permission))
    .map((permission) => ({
      permission,
      enabled: activeSet.has(permission),
    }));
}

function normalizeAccessScope(scope = {}) {
  return {
    branchScope: scope.branchScope || "ownBranch",
    ticketScope: scope.ticketScope || "all",
    branchIds: Array.isArray(scope.branchIds) ? scope.branchIds : [],
  };
}

function isSameAccessScope(left, right) {
  const leftScope = normalizeAccessScope(left);
  const rightScope = normalizeAccessScope(right);
  const leftBranches = [...leftScope.branchIds].sort();
  const rightBranches = [...rightScope.branchIds].sort();

  return (
    leftScope.branchScope === rightScope.branchScope &&
    leftScope.ticketScope === rightScope.ticketScope &&
    leftBranches.length === rightBranches.length &&
    leftBranches.every((branchId, index) => branchId === rightBranches[index])
  );
}

function PermissionSummaryCard({ title, role, permissions, defaultPermissions, onOpen, description }) {
  const templatePermissions = defaultPermissions || getTemplatePermissions(role);
  const overrides = buildOverridePayload(permissions, templatePermissions);
  const enabledCount = permissions.length;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", overrides.length > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
          {overrides.length > 0 ? `${overrides.length} custom` : "Default"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Template</p>
          <p className="mt-1 font-bold text-[var(--foreground)]">{ROLE_LABELS[role] || role}</p>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Enabled</p>
          <p className="mt-1 font-bold text-[var(--foreground)]">{enabledCount} permissions</p>
        </div>
      </div>
      <Button type="button" className="mt-4 w-full" variant="secondary" onClick={onOpen}>
        <Settings2 className="h-4 w-4" />
        Review Permissions
      </Button>
    </div>
  );
}

function PermissionEditorModal({
  open,
  title,
  subtitle,
  role,
  permissions,
  defaultPermissions,
  onPermissionsChange,
  accessScope,
  defaultAccessScope,
  branches = [],
  onAccessScopeChange,
  showAccessScope = false,
  isLoading = false,
  error,
  onRetry,
  onClose,
  onSave,
  saveLabel = "Done",
  saving = false,
  saveDisabled = false,
}) {
  const [activeGroup, setActiveGroup] = useState(PERMISSION_GROUPS[0].title);
  const templatePermissions = defaultPermissions || getTemplatePermissions(role);
  const defaultSet = new Set(templatePermissions);
  const activeSet = new Set(permissions);
  const activePermissionGroup = PERMISSION_GROUPS.find((group) => group.title === activeGroup) || PERMISSION_GROUPS[0];
  const overrideCount = buildOverridePayload(permissions, templatePermissions).length;

  useEffect(() => {
    if (open) setActiveGroup(PERMISSION_GROUPS[0].title);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/50 p-0 sm:p-4">
      <div className="flex h-dvh flex-col bg-white shadow-2xl sm:mx-auto sm:h-[calc(100dvh-2rem)] sm:max-w-5xl sm:rounded-lg">
        <div className="border-b border-[var(--border)] px-4 py-3 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-[var(--foreground)]">{title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
            </div>
            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-white text-slate-500 hover:bg-slate-50"
              onClick={onClose}
              aria-label="Close permission editor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Role</p>
              <p className="mt-1 truncate font-bold">{ROLE_LABELS[role] || role}</p>
            </div>
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">On</p>
              <p className="mt-1 font-bold">{activeSet.size}</p>
            </div>
            <div className="rounded-md bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Custom</p>
              <p className="mt-1 font-bold">{overrideCount}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {isLoading || error ? (
            <QueryState isLoading={isLoading} error={error} isEmpty={false} onRetry={onRetry}>
              <div />
            </QueryState>
          ) : (
            <div className="space-y-4">
              {showAccessScope ? (
                <AccessScopeEditor
                  value={accessScope}
                  defaultValue={defaultAccessScope}
                  branches={branches}
                  onChange={onAccessScopeChange}
                  disabled={saving}
                />
              ) : null}

              <div className="sticky top-0 z-10 -mx-4 bg-white/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupOnCount = group.permissions.filter(([permission]) => activeSet.has(permission)).length;
                    return (
                      <button
                        key={group.title}
                        type="button"
                        className={cn(
                          "h-10 shrink-0 rounded-md border px-3 text-sm font-semibold",
                          activeGroup === group.title
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                            : "border-[var(--border)] bg-white text-[var(--foreground)]"
                        )}
                        onClick={() => setActiveGroup(group.title)}
                      >
                        {group.title} · {groupOnCount}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-slate-50/70 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{activePermissionGroup.title}</p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--primary)]"
                    disabled={saving}
                    onClick={() => onPermissionsChange?.(toPermissionArray(templatePermissions))}
                  >
                    Reset defaults
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {activePermissionGroup.permissions.map(([permission, label]) => {
                    const isDefault = defaultSet.has(permission);
                    const isActive = activeSet.has(permission);
                    const isCustom = isActive !== isDefault;
                    return (
                      <button
                        key={permission}
                        type="button"
                        disabled={saving}
                        onClick={() => onPermissionsChange?.(togglePermission(permissions, permission))}
                        className={cn(
                          "flex min-h-16 items-center justify-between gap-3 rounded-md border bg-white px-3 py-3 text-left transition",
                          isActive ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-100",
                          isCustom && "border-amber-200 bg-amber-50/60"
                        )}
                      >
                        <span>
                          <span className="block text-sm font-semibold text-[var(--foreground)]">{label}</span>
                          <span className="mt-1 block text-xs text-[var(--muted)]">
                            {isDefault ? "Default ON" : "Default OFF"}{isCustom ? " · Custom" : ""}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "grid h-7 w-12 shrink-0 place-items-center rounded-full text-xs font-bold",
                            isActive ? "bg-[var(--primary)] text-white" : "bg-slate-200 text-slate-600"
                          )}
                        >
                          {isActive ? "ON" : "OFF"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={onSave} disabled={saving || saveDisabled}>
              {saving ? "Saving..." : saveLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccessScopeEditor({ value, defaultValue, branches, onChange, disabled = false }) {
  const scope = normalizeAccessScope(value);
  const defaultScope = normalizeAccessScope(defaultValue);
  const changed = !isSameAccessScope(scope, defaultScope);

  const toggleBranch = (branchId) => {
    const selected = new Set(scope.branchIds);
    if (selected.has(branchId)) {
      selected.delete(branchId);
    } else {
      selected.add(branchId);
    }
    onChange?.({ ...scope, branchIds: Array.from(selected) });
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-slate-50/70 p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Access Scope</p>
          <p className="text-xs text-[var(--muted)]">Backend controls final branch and ticket access.</p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", changed ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
          {changed ? "Custom scope" : "Default scope"}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Branch Scope">
          <Select
            value={scope.branchScope}
            disabled={disabled}
            onChange={(event) =>
              onChange?.({
                ...scope,
                branchScope: event.target.value,
                branchIds: event.target.value === "selectedBranches" ? scope.branchIds : [],
              })
            }
          >
            {ACCESS_SCOPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Ticket Scope">
          <Select
            value={scope.ticketScope}
            disabled={disabled}
            onChange={(event) => onChange?.({ ...scope, ticketScope: event.target.value })}
          >
            {TICKET_SCOPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </Field>
      </div>
      {scope.branchScope === "selectedBranches" ? (
        <div className="mt-3 rounded-md border border-[var(--border)] bg-white p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Selected Branches</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {branches.map((branch) => (
              <label key={branch.id} className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2 text-sm">
                <span className="font-medium text-[var(--foreground)]">{branch.name}</span>
                <input
                  type="checkbox"
                  checked={scope.branchIds.includes(branch.id)}
                  disabled={disabled}
                  onChange={() => toggleBranch(branch.id)}
                  className="h-5 w-5 rounded border-slate-300 text-[var(--primary)]"
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StaffManagement() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user, hasPermission } = useAuth();
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [permissionStaffId, setPermissionStaffId] = useState("");
  const [createRole, setCreateRole] = useState("TECHNICIAN");
  const [createPermissions, setCreatePermissions] = useState(() => getTemplatePermissions("TECHNICIAN"));
  const [editPermissions, setEditPermissions] = useState([]);
  const [editAccessScope, setEditAccessScope] = useState(normalizeAccessScope());
  const [createPermissionEditorOpen, setCreatePermissionEditorOpen] = useState(false);
  const [editPermissionEditorOpen, setEditPermissionEditorOpen] = useState(false);

  const canAssignBranch = hasPermission(PERMISSIONS.STAFF_BRANCH_ASSIGN);
  const canCreateBranchAdmin = canAssignBranch;
  const staffLabel = canCreateBranchAdmin ? "Branch Admin" : "Technician";
  const staffLabelPlural = canCreateBranchAdmin ? "Branch Admins" : "Technicians";
  const roleOptions = useMemo(
    () => (canCreateBranchAdmin ? ["ADMIN", "TECHNICIAN"] : ["TECHNICIAN"]),
    [canCreateBranchAdmin],
  );

  useEffect(() => {
    if (!roleOptions.includes(createRole)) {
      const nextRole = roleOptions[0] || "TECHNICIAN";
      setCreateRole(nextRole);
      setCreatePermissions(getTemplatePermissions(nextRole));
    }
  }, [createRole, roleOptions]);

  const staffQuery = useQuery({
    queryKey: ["staff"],
    queryFn: staffApi.list,
  });

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: branchesApi.list,
  });

  const refreshStaff = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const permissionQuery = useQuery({
    queryKey: ["staff-permissions", permissionStaffId],
    queryFn: () => staffApi.getPermissions(permissionStaffId),
    enabled: Boolean(permissionStaffId),
  });

  const createMutation = useMutation({
    mutationFn: async ({ staffPayload, permissionPayload }) => {
      if (toast.showRememberedLimit("staff")) {
        const error = new Error("Subscription limit already reached");
        error.__limitGuard = true;
        return Promise.reject(error);
      }
      const response = await staffApi.createStaff(staffPayload);
      const staffId = response?.data?.staff?.id;
      let permissionError = null;

      if (staffId && permissionPayload?.overrides?.length > 0) {
        try {
          await staffApi.updatePermissions(staffId, permissionPayload);
          queryClient.invalidateQueries({ queryKey: ["staff-permissions", staffId] });
        } catch (error) {
          permissionError = error;
        }
      }

      return { response, permissionError };
    },
    onSuccess: ({ response, permissionError }) => {
      refreshStaff();
      if (permissionError) {
        const staffId = response?.data?.staff?.id;
        if (staffId) setPermissionStaffId(staffId);
        toast.errorFromApi(permissionError, `${staffLabel} created, but permission overrides could not be saved.`);
        return;
      }
      toast.success(`${staffLabel} created successfully.`);
    },
    onError: (error) => {
      if (error.__limitGuard) return;
      toast.errorFromApi(error, `Unable to create ${staffLabel.toLowerCase()}.`);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }) => (action === "enable" ? staffApi.enable(id) : staffApi.disable(id)),
    onSuccess: () => {
      refreshStaff();
      toast.success(`${staffLabel} status updated.`);
    },
    onError: (error) => toast.error(error?.response?.data?.message || `Unable to update ${staffLabel.toLowerCase()}.`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => staffApi.delete(id),
    onSuccess: () => {
      refreshStaff();
      toast.success(`${staffLabel} deleted successfully.`);
    },
    onError: (error) => toast.error(error?.response?.data?.message || `Unable to delete ${staffLabel.toLowerCase()}.`),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ id, password }) => staffApi.resetPassword(id, { password }),
    onSuccess: () => {
      refreshStaff();
      toast.success(`${staffLabel} password reset successfully.`);
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to reset password."),
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ staffId, payload }) => staffApi.updatePermissions(staffId, payload),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(["staff-permissions", variables.staffId], response);
      queryClient.invalidateQueries({ queryKey: ["staff-permissions", variables.staffId] });
      refreshStaff();
      setEditPermissionEditorOpen(false);
      toast.success("Staff permissions saved successfully.");
    },
    onError: (error) => toast.errorFromApi(error, "Unable to save staff permissions."),
  });

  const managedStaff = useMemo(() => staffQuery.data?.data?.staff || [], [staffQuery.data]);
  const branches = useMemo(() => branchesQuery.data?.data?.branches || [], [branchesQuery.data]);
  const activeBranches = useMemo(() => branches.filter((branch) => branch.status === "ACTIVE"), [branches]);
  const currentBranch = useMemo(
    () => branches.find((branch) => branch.id === user?.branchId) || user?.branch || null,
    [branches, user?.branch, user?.branchId],
  );
  const permissionStaff = useMemo(
    () => managedStaff.find((staff) => staff.id === permissionStaffId) || null,
    [managedStaff, permissionStaffId],
  );
  const permissionSnapshot = permissionQuery.data?.data || null;
  const editRoleTemplate = permissionSnapshot?.roleTemplate || permissionStaff?.role || "TECHNICIAN";
  const editDefaultPermissions = permissionSnapshot?.defaultPermissions || [];
  const editDefaultScope = normalizeAccessScope(permissionSnapshot?.accessScope);
  const createOverridesPreviewed = hasPermissionChanged(createPermissions, getTemplatePermissions(createRole));
  const editOverridesChanged = permissionSnapshot
    ? hasPermissionChanged(editPermissions, permissionSnapshot.effectivePermissions || [])
    : false;
  const editScopeChanged = permissionSnapshot
    ? !isSameAccessScope(editAccessScope, permissionSnapshot.accessScope)
    : false;

  useEffect(() => {
    if (!permissionSnapshot) {
      setEditPermissions([]);
      setEditAccessScope(normalizeAccessScope());
      return;
    }
    setEditPermissions(toPermissionArray(permissionSnapshot.effectivePermissions));
    setEditAccessScope(normalizeAccessScope(permissionSnapshot.accessScope));
  }, [permissionSnapshot]);

  return (
    <div>
      <PageHeader
        title={staffLabelPlural}
        description={`Manage ${staffLabelPlural.toLowerCase()}, review role templates, and prepare permission overrides without changing staff roles.`}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
        <Card>
          <CardHeader>
            <CardTitle>{staffLabelPlural}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <QueryState
              isLoading={staffQuery.isLoading}
              error={staffQuery.error}
              isEmpty={managedStaff.length === 0}
              emptyTitle={`No ${staffLabelPlural.toLowerCase()} yet`}
              emptyDescription={`Create a ${staffLabel.toLowerCase()} from the guided form on this screen.`}
              onRetry={staffQuery.refetch}
            >
              <Table>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    {canAssignBranch && <Th>Branch</Th>}
                    <Th>Phone</Th>
                    <Th>Status</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {managedStaff.map((staff) => (
                    <tr key={staff.id}>
                      <Td className="font-semibold">{staff.fullName}</Td>
                      <Td>{staff.email}</Td>
                      <Td>{ROLE_LABELS[staff.role] || staff.role}</Td>
                      {canAssignBranch && <Td>{staff.branch?.name || "Not assigned"}</Td>}
                      <Td>{staff.phone || "Not set"}</Td>
                      <Td>{staff.isActive ? "Active" : "Disabled"}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setPermissionStaffId(staff.id);
                              setEditPermissionEditorOpen(true);
                            }}
                          >
                            <Settings2 className="h-4 w-4" />
                            Permissions
                          </Button>
                          <Button
                            size="sm"
                            variant={staff.isActive ? "danger" : "secondary"}
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                id: staff.id,
                                action: staff.isActive ? "disable" : "enable",
                              })
                            }
                          >
                            {staff.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            {staff.isActive ? "Disable" : "Enable"}
                          </Button>
                          <ConfirmAction
                            title={`Delete ${staffLabel.toLowerCase()}?`}
                            description={`Are you sure you want to delete this ${staffLabel.toLowerCase()}? This action cannot be undone.`}
                            confirmLabel="Delete"
                            variant="danger"
                            disabled={deleteMutation.isPending}
                            onConfirm={() => deleteMutation.mutate(staff.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </ConfirmAction>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </QueryState>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Create Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  try {
                    const result = await createMutation.mutateAsync({
                      staffPayload: {
                        name: String(form.get("fullName") || "").trim(),
                        email: String(form.get("email") || "").trim(),
                        phone: String(form.get("phone") || "").trim() || undefined,
                        password: String(form.get("password") || ""),
                        branchId: String(form.get("branchId") || "").trim(),
                        role: createRole,
                      },
                      permissionPayload: {
                        overrides: buildOverridePayload(createPermissions, getTemplatePermissions(createRole)),
                      },
                    });
                    if (result.permissionError) return;
                    event.currentTarget.reset();
                    setCreateRole(roleOptions[0] || "TECHNICIAN");
                    setCreatePermissions(getTemplatePermissions(roleOptions[0] || "TECHNICIAN"));
                  } catch {
                    // Error toast is handled by the mutation.
                  }
                }}
              >
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Basic Details</p>
                  <div className="space-y-3">
                    <Field label="Name"><Input name="fullName" required /></Field>
                    <Field label="Email"><Input name="email" type="email" required /></Field>
                    <Field label="Phone"><Input name="phone" autoComplete="tel" /></Field>
                    <Field label="Password"><PasswordInput name="password" minLength={8} required /></Field>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border)] p-3">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Branch</p>
                  {!canAssignBranch ? (
                    <Field label="Assigned Branch">
                      <Input readOnly disabled value={currentBranch?.name || "My Branch"} />
                      <input type="hidden" name="branchId" value={user?.branchId || ""} />
                    </Field>
                  ) : (
                    <Field label="Select Branch">
                      <Select name="branchId" required disabled={branchesQuery.isLoading || activeBranches.length === 0}>
                        <option value="">Select branch</option>
                        {activeBranches.map((branch) => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </Select>
                    </Field>
                  )}
                </div>

                <div className="rounded-lg border border-[var(--border)] p-3">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Role Template</p>
                  <Field label="Select Role">
                    <Select
                      value={createRole}
                      onChange={(event) => {
                        const role = event.target.value;
                        setCreateRole(role);
                        setCreatePermissions(getTemplatePermissions(role));
                      }}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <PermissionSummaryCard
                  title="Permissions"
                  role={createRole}
                  permissions={createPermissions}
                  onOpen={() => setCreatePermissionEditorOpen(true)}
                  description={
                    createOverridesPreviewed
                      ? "Custom permission changes are ready to save after staff creation."
                      : "Using selected role template defaults."
                  }
                />

                <Button className="w-full" disabled={createMutation.isPending}>
                  Create Staff
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit Staff Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Staff Member">
                <Select
                  value={permissionStaffId}
                  onChange={(event) => {
                    setPermissionStaffId(event.target.value);
                    setEditPermissionEditorOpen(Boolean(event.target.value));
                  }}
                >
                  <option value="">Select staff</option>
                  {managedStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.fullName} · {ROLE_LABELS[staff.role] || staff.role}
                    </option>
                  ))}
                </Select>
              </Field>

              {permissionStaff ? (
                <QueryState
                  isLoading={permissionQuery.isLoading}
                  error={permissionQuery.error}
                  isEmpty={false}
                  onRetry={permissionQuery.refetch}
                >
                  {permissionSnapshot ? (
                    <>
                      <div className="rounded-md border border-[var(--border)] bg-white p-3 text-sm">
                        <p className="font-semibold text-[var(--foreground)]">{permissionSnapshot.staff.fullName}</p>
                        <p className="text-xs text-[var(--muted)]">
                          Role remains {ROLE_LABELS[editRoleTemplate] || editRoleTemplate}. Permission edits save as overrides only.
                        </p>
                      </div>
                      <PermissionSummaryCard
                        title="Permission Snapshot"
                        role={editRoleTemplate}
                        permissions={editPermissions}
                        defaultPermissions={editDefaultPermissions}
                        onOpen={() => setEditPermissionEditorOpen(true)}
                        description="Loaded from backend. Open editor to update permissions and access scope."
                      />
                    </>
                  ) : null}
                </QueryState>
              ) : (
                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-[var(--muted)]">
                  Select a staff member to load their backend permission snapshot.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reset Staff Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  try {
                    await passwordMutation.mutateAsync({
                      id: selectedStaffId,
                      password: String(form.get("password") || ""),
                    });
                    event.currentTarget.reset();
                    setSelectedStaffId("");
                  } catch {
                    // Error toast is handled by the mutation.
                  }
                }}
              >
                <Field label="Staff Member">
                  <Select
                    required
                    value={selectedStaffId}
                    onChange={(event) => setSelectedStaffId(event.target.value)}
                  >
                    <option value="">Select staff</option>
                    {managedStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.fullName} · {staff.email}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="New Password"><PasswordInput name="password" minLength={8} required /></Field>
                <Button className="w-full" disabled={!selectedStaffId || passwordMutation.isPending}>
                  <KeyRound className="h-4 w-4" />
                  Reset Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <PermissionEditorModal
        open={createPermissionEditorOpen}
        title="Review Permissions"
        subtitle="Set permissions for the selected role template before creating staff."
        role={createRole}
        permissions={createPermissions}
        defaultPermissions={getTemplatePermissions(createRole)}
        onPermissionsChange={setCreatePermissions}
        onClose={() => setCreatePermissionEditorOpen(false)}
        onSave={() => setCreatePermissionEditorOpen(false)}
        saveLabel="Apply Permissions"
      />

      <PermissionEditorModal
        open={editPermissionEditorOpen}
        title="Edit Staff Permissions"
        subtitle={permissionSnapshot ? `${permissionSnapshot.staff.fullName} · ${ROLE_LABELS[editRoleTemplate] || editRoleTemplate}` : "Loading backend permission snapshot"}
        role={editRoleTemplate}
        permissions={editPermissions}
        defaultPermissions={editDefaultPermissions}
        onPermissionsChange={setEditPermissions}
        accessScope={editAccessScope}
        defaultAccessScope={editDefaultScope}
        branches={activeBranches}
        onAccessScopeChange={setEditAccessScope}
        showAccessScope={Boolean(permissionSnapshot)}
        isLoading={permissionQuery.isLoading}
        error={permissionQuery.error}
        onRetry={permissionQuery.refetch}
        onClose={() => setEditPermissionEditorOpen(false)}
        saving={updatePermissionMutation.isPending}
        saveDisabled={!permissionSnapshot || (!editOverridesChanged && !editScopeChanged)}
        saveLabel="Save Changes"
        onSave={() =>
          updatePermissionMutation.mutate({
            staffId: permissionStaffId,
            payload: {
              overrides: buildOverridePayload(editPermissions, editDefaultPermissions),
              accessScope: editAccessScope,
            },
          })
        }
      />
    </div>
  );
}
