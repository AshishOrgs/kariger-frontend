import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { Filter, KeyRound, Settings2, ShieldCheck, Trash2, UserCheck, UserPlus, Users, UserX, X } from "lucide-react";
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

// ── Section → all backend permissions it controls ──
const SECTION_PERMISSIONS = {
  repair_intake:      [PERMISSIONS.REPAIR_INTAKE],
  technician_work:   [PERMISSIONS.REPAIR_WORK, PERMISSIONS.REPAIR_STATUS_UPDATE, PERMISSIONS.REPAIR_ASSIGN],
  technician_report: [PERMISSIONS.REPAIR_JOBS_VIEW, PERMISSIONS.REPAIR_ESTIMATE, PERMISSIONS.ESTIMATE_CREATE, PERMISSIONS.ESTIMATE_APPROVE, PERMISSIONS.ESTIMATE_REJECT],
  inventory:         [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.INVENTORY_CONSUME],
  billing:           [PERMISSIONS.BILLING_VIEW, PERMISSIONS.BILLING_CREATE, PERMISSIONS.PAYMENT_COLLECT],
  handover:          [PERMISSIONS.HANDOVER_VIEW, PERMISSIONS.HANDOVER_MANAGE],
  vendors:           [PERMISSIONS.VENDOR_VIEW, PERMISSIONS.VENDOR_MANAGE, PERMISSIONS.VENDOR_JOB_UPDATE],
  reports:           [PERMISSIONS.REPORTS_VIEW],
  staff:             [PERMISSIONS.STAFF_VIEW, PERMISSIONS.STAFF_MANAGE, PERMISSIONS.STAFF_BRANCH_ASSIGN],
  branches:          [PERMISSIONS.BRANCH_VIEW, PERMISSIONS.BRANCH_MANAGE],
  profile:           [PERMISSIONS.BUSINESS_MANAGE, PERMISSIONS.SETTINGS_MANAGE],
  subscription:      [PERMISSIONS.SUBSCRIPTION_MANAGE],
};

// One flat group — one toggle per sidebar section
const PERMISSION_GROUPS = [
  {
    title: "Sections",
    permissions: [
      ["repair_intake",      "Repair Intake"],
      ["technician_work",    "Technician Work"],
      ["technician_report",  "Technician Report"],
      ["inventory",          "Inventory"],
      ["billing",            "Billing"],
      ["handover",           "Handover"],
      ["vendors",            "Vendors"],
      ["reports",            "Reports"],
      ["staff",              "Staff"],
      ["branches",           "Branches"],
      ["profile",            "Profile"],
      ["subscription",       "Subscription"],
    ],
  },
];

// All individual permission keys (for override payload building)
const ALL_PERMISSION_KEYS = Object.values(SECTION_PERMISSIONS).flat();

const ACCESS_SCOPE_OPTIONS = [
  ["ownBranch", "Current Branch"],
  ["selectedBranches", "Selected Branches"],
  ["allBranches", "All Branches"],
];

const TICKET_SCOPE_OPTIONS = [
  ["all", "All Tickets"],
  ["assignedTicketsOnly", "Assigned Tickets Only"],
];

const getTemplatePermissions = (role) => ROLE_TEMPLATE_PERMISSIONS[role] || ROLE_TEMPLATE_PERMISSIONS.TECHNICIAN;
const toPermissionArray = (permissions) => Array.from(new Set(permissions || []));
const hasPermissionChanged = (current, defaults) => {
  const defaultSet = new Set(defaults);
  return current.length !== defaults.length || current.some((permission) => !defaultSet.has(permission));
};

// Check if a section is active: ALL its permissions must be enabled
function isSectionActive(sectionKey, activePermissions) {
  const perms = SECTION_PERMISSIONS[sectionKey] || [];
  const activeSet = new Set(activePermissions);
  return perms.length > 0 && perms.every((p) => activeSet.has(p));
}

// Check if a section is partially active (some but not all permissions on)
function isSectionPartial(sectionKey, activePermissions) {
  const perms = SECTION_PERMISSIONS[sectionKey] || [];
  const activeSet = new Set(activePermissions);
  const onCount = perms.filter((p) => activeSet.has(p)).length;
  return onCount > 0 && onCount < perms.length;
}

// Check if a section is "default" (all its perms are in the template)
function isSectionDefault(sectionKey, defaultPermissions) {
  const perms = SECTION_PERMISSIONS[sectionKey] || [];
  const defaultSet = new Set(defaultPermissions);
  return perms.length > 0 && perms.every((p) => defaultSet.has(p));
}

// Toggle a whole section ON or OFF
function toggleSection(currentPermissions, sectionKey) {
  const sectionPerms = SECTION_PERMISSIONS[sectionKey] || [];
  const isOn = isSectionActive(sectionKey, currentPermissions);
  const next = new Set(currentPermissions);
  if (isOn) {
    sectionPerms.forEach((p) => next.delete(p));
  } else {
    sectionPerms.forEach((p) => next.add(p));
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
  const templatePermissions = defaultPermissions || getTemplatePermissions(role);
  const activeSet = new Set(permissions);
  const overrideCount = buildOverridePayload(permissions, templatePermissions).length;
  // Count how many sections are fully ON
  const activeSectionCount = PERMISSION_GROUPS[0].permissions.filter(([sectionKey]) =>
    isSectionActive(sectionKey, permissions)
  ).length;

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
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Sections ON</p>
              <p className="mt-1 font-bold">{activeSectionCount} / {PERMISSION_GROUPS[0].permissions.length}</p>
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

              <div className="rounded-lg border border-[var(--border)] bg-slate-50/70 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Section Access</p>
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
                    {PERMISSION_GROUPS[0].permissions.map(([sectionKey, label]) => {
                      const isActive = isSectionActive(sectionKey, permissions);
                      const isPartial = !isActive && isSectionPartial(sectionKey, permissions);
                      const isDefault = isSectionDefault(sectionKey, templatePermissions);
                      const isCustom = isActive !== isDefault;
                      return (
                        <button
                          key={sectionKey}
                          type="button"
                          disabled={saving}
                          onClick={() => onPermissionsChange?.(toggleSection(permissions, sectionKey))}
                          className={cn(
                            "flex min-h-[4rem] items-center justify-between gap-3 rounded-md border bg-white px-4 py-3 text-left transition",
                            isActive ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-100",
                            isPartial && "border-amber-200 bg-amber-50/40",
                            isCustom && !isPartial && "border-amber-200 bg-amber-50/60"
                          )}
                        >
                          <span>
                            <span className="block text-sm font-semibold text-[var(--foreground)]">{label}</span>
                            <span className="mt-0.5 block text-xs text-[var(--muted)]">
                              {isDefault ? "Default ON" : "Default OFF"}{isCustom ? " · Custom" : ""}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "grid h-7 w-12 shrink-0 place-items-center rounded-full text-xs font-bold",
                              isActive ? "bg-[var(--primary)] text-white" : isPartial ? "bg-amber-400 text-white" : "bg-slate-200 text-slate-600"
                            )}
                          >
                            {isActive ? "ON" : isPartial ? "~" : "OFF"}
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

  // Active Action Modal: null | 'create' | 'permissions' | 'password'
  const [activeModal, setActiveModal] = useState(null);
  const [roleFilter, setRoleFilter] = useState("ALL"); // ALL, ADMIN, TECHNICIAN

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [permissionStaffId, setPermissionStaffId] = useState("");
  const [createRole, setCreateRole] = useState("TECHNICIAN");
  const [createPermissions, setCreatePermissions] = useState(() => getTemplatePermissions("TECHNICIAN"));
  const [editPermissions, setEditPermissions] = useState([]);
  const [editAccessScope, setEditAccessScope] = useState(normalizeAccessScope());
  const [createPermissionEditorOpen, setCreatePermissionEditorOpen] = useState(false);

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
      setActiveModal(null);
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
      toast.success(`Staff status updated.`);
    },
    onError: (error) => toast.error(error?.response?.data?.message || `Unable to update staff.`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => staffApi.delete(id),
    onSuccess: () => {
      refreshStaff();
      toast.success(`Staff deleted successfully.`);
    },
    onError: (error) => toast.error(error?.response?.data?.message || `Unable to delete staff.`),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ id, password }) => staffApi.resetPassword(id, { password }),
    onSuccess: () => {
      refreshStaff();
      setActiveModal(null);
      setSelectedStaffId("");
      toast.success(`Staff password reset successfully.`);
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to reset password."),
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ staffId, payload }) => staffApi.updatePermissions(staffId, payload),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(["staff-permissions", variables.staffId], response);
      queryClient.invalidateQueries({ queryKey: ["staff-permissions", variables.staffId] });
      refreshStaff();
      setActiveModal(null);
      toast.success("Staff permissions saved successfully.");
    },
    onError: (error) => toast.errorFromApi(error, "Unable to save staff permissions."),
  });

  const managedStaff = useMemo(() => staffQuery.data?.data?.staff || [], [staffQuery.data]);

  // Role Filtering logic
  const filteredStaff = useMemo(() => {
    if (roleFilter === "ALL") return managedStaff;
    if (roleFilter === "ADMIN") return managedStaff.filter((s) => s.role === "ADMIN" || s.role === "BRANCH_ADMIN");
    return managedStaff.filter((s) => s.role === roleFilter);
  }, [managedStaff, roleFilter]);

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
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        description="Create staff members, update role permissions, reset passwords, and manage branch staff history."
      />

      {/* TOP HORIZONTAL ACTION BUTTONS */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          size="sm"
          className="h-10 px-4 text-xs font-bold gap-2 bg-[#1769aa] text-white hover:bg-[#125388] shadow-sm"
          onClick={() => setActiveModal("create")}
        >
          <UserPlus className="h-4 w-4" />
          Create Staff
        </Button>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-10 px-4 text-xs font-semibold gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={() => setActiveModal("permissions")}
        >
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          Edit Staff Permissions
        </Button>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-10 px-4 text-xs font-semibold gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          onClick={() => setActiveModal("password")}
        >
          <KeyRound className="h-4 w-4 text-amber-600" />
          Reset Staff Password
        </Button>
      </div>

      {/* STAFF HISTORY & DIRECTORY CARD */}
      <Card className="border border-slate-200/80 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Users className="h-5 w-5 text-[#1769aa]" />
              Staff History & Directory
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Total {managedStaff.length} staff member{managedStaff.length === 1 ? "" : "s"} registered
            </p>
          </div>

          {/* ROLE FILTER DROPDOWN */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter:</span>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 text-xs font-semibold w-40 bg-slate-50 border-slate-200"
            >
              <option value="ALL">All Roles ({managedStaff.length})</option>
              {canCreateBranchAdmin && (
                <option value="ADMIN">
                  Admin ({managedStaff.filter((s) => s.role === "ADMIN" || s.role === "BRANCH_ADMIN").length})
                </option>
              )}
              <option value="TECHNICIAN">
                Technician ({managedStaff.filter((s) => s.role === "TECHNICIAN").length})
              </option>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <QueryState
            isLoading={staffQuery.isLoading}
            error={staffQuery.error}
            isEmpty={filteredStaff.length === 0}
            emptyTitle={roleFilter === "ALL" ? "No staff members found" : `No ${roleFilter.toLowerCase()}s found`}
            emptyDescription={
              roleFilter === "ALL"
                ? "Click 'Create Staff' at the top to add your first staff member."
                : "No staff matching the selected role filter."
            }
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
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <Td className="font-bold text-slate-900">{staff.fullName}</Td>
                    <Td className="text-slate-600">{staff.email}</Td>
                    <Td>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
                          staff.role === "OWNER"
                            ? "bg-purple-100 text-purple-700"
                            : staff.role === "ADMIN" || staff.role === "BRANCH_ADMIN"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-teal-100 text-teal-700"
                        )}
                      >
                        {ROLE_LABELS[staff.role] || staff.role}
                      </span>
                    </Td>
                    {canAssignBranch && <Td className="text-slate-600">{staff.branch?.name || "Not assigned"}</Td>}
                    <Td className="text-slate-600">{staff.phone || "Not set"}</Td>
                    <Td>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
                          staff.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {staff.isActive ? "Active" : "Disabled"}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs gap-1"
                          onClick={() => {
                            setPermissionStaffId(staff.id);
                            setActiveModal("permissions");
                          }}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          Permissions
                        </Button>
                        <Button
                          size="sm"
                          variant={staff.isActive ? "secondary" : "primary"}
                          className="h-8 text-xs gap-1"
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({
                              id: staff.id,
                              action: staff.isActive ? "disable" : "enable",
                            })
                          }
                        >
                          {staff.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          {staff.isActive ? "Disable" : "Enable"}
                        </Button>
                        <ConfirmAction
                          title="Delete staff member?"
                          description="Are you sure you want to delete this staff member? This action cannot be undone."
                          confirmLabel="Delete"
                          variant="danger"
                          disabled={deleteMutation.isPending}
                          onConfirm={() => deleteMutation.mutate(staff.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* 1. CREATE STAFF MODAL */}
      {activeModal === "create" && (
        <div className="fixed inset-0 z-[70] bg-slate-950/50 p-4 grid place-items-center overflow-y-auto">
          <Card className="w-full max-w-xl border border-white/80 bg-white shadow-2xl rounded-2xl overflow-hidden my-8">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-[#1769aa]" />
                  Create Staff Member
                </CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  Add a new {staffLabel.toLowerCase()} to your workspace
                </p>
              </div>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                onClick={() => setActiveModal(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
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
                    setCreateRole(roleOptions[0] || "TECHNICIAN");
                    setCreatePermissions(getTemplatePermissions(roleOptions[0] || "TECHNICIAN"));
                  } catch {
                    // Error toast is handled by the mutation.
                  }
                }}
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Basic Details</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Full Name"><Input name="fullName" placeholder="John Doe" required /></Field>
                    <Field label="Email Address"><Input name="email" type="email" placeholder="john@shop.com" required /></Field>
                    <Field label="Phone Number"><Input name="phone" autoComplete="tel" placeholder="10-digit number" /></Field>
                    <Field label="Password"><PasswordInput name="password" minLength={8} placeholder="Min 8 chars" required /></Field>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Branch & Role</p>
                  <div className="grid gap-3 sm:grid-cols-2">
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

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>
                    Cancel
                  </Button>
                  <Button disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Staff Member"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. EDIT STAFF PERMISSIONS MODAL */}
      {activeModal === "permissions" && (
        <div className="fixed inset-0 z-[70] bg-slate-950/50 p-4 grid place-items-center overflow-y-auto">
          <Card className="w-full max-w-xl border border-white/80 bg-white shadow-2xl rounded-2xl overflow-hidden my-8">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  Edit Staff Permissions
                </CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select a staff member to inspect and update permissions
                </p>
              </div>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                onClick={() => setActiveModal(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <Field label="Select Staff Member">
                <Select
                  value={permissionStaffId}
                  onChange={(event) => setPermissionStaffId(event.target.value)}
                >
                  <option value="">-- Choose Staff Member --</option>
                  {managedStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.fullName} · {ROLE_LABELS[staff.role] || staff.role} ({staff.email})
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
                    <div className="space-y-4 pt-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1">
                        <p className="font-bold text-slate-900 text-sm">{permissionSnapshot.staff.fullName}</p>
                        <p className="text-slate-500">
                          Role: <span className="font-semibold text-slate-700">{ROLE_LABELS[editRoleTemplate] || editRoleTemplate}</span>
                        </p>
                      </div>
                      <PermissionSummaryCard
                        title="Permission Snapshot"
                        role={editRoleTemplate}
                        permissions={editPermissions}
                        defaultPermissions={editDefaultPermissions}
                        onOpen={() => setCreatePermissionEditorOpen(true)}
                        description="Loaded from backend. Open editor to update permissions and access scope."
                      />
                    </div>
                  ) : null}
                </QueryState>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-400">
                  Select a staff member from the dropdown above to load their backend permissions.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={!permissionStaff || !permissionSnapshot}
                  onClick={() => setCreatePermissionEditorOpen(true)}
                >
                  Open Permission Editor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. RESET STAFF PASSWORD MODAL */}
      {activeModal === "password" && (
        <div className="fixed inset-0 z-[70] bg-slate-950/50 p-4 grid place-items-center overflow-y-auto">
          <Card className="w-full max-w-md border border-white/80 bg-white shadow-2xl rounded-2xl overflow-hidden my-8">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-amber-600" />
                  Reset Staff Password
                </CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  Update password for an existing staff member
                </p>
              </div>
              <button
                type="button"
                className="h-8 w-8 rounded-lg border border-slate-200 grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                onClick={() => setActiveModal(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-6">
              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  try {
                    await passwordMutation.mutateAsync({
                      id: selectedStaffId,
                      password: String(form.get("password") || ""),
                    });
                  } catch {
                    // Error toast is handled by the mutation.
                  }
                }}
              >
                <Field label="Select Staff Member">
                  <Select
                    required
                    value={selectedStaffId}
                    onChange={(event) => setSelectedStaffId(event.target.value)}
                  >
                    <option value="">-- Select Staff Member --</option>
                    {managedStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.fullName} ({staff.email})
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="New Password">
                  <PasswordInput name="password" minLength={8} placeholder="Min 8 characters" required />
                </Field>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>
                    Cancel
                  </Button>
                  <Button disabled={!selectedStaffId || passwordMutation.isPending}>
                    {passwordMutation.isPending ? "Resetting..." : "Reset Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FULL PERMISSION EDITOR DRAWER */}
      <PermissionEditorModal
        open={createPermissionEditorOpen}
        title={permissionStaff ? `Edit Permissions: ${permissionStaff.fullName}` : "Review Permissions"}
        subtitle={permissionStaff ? `${permissionStaff.email} · ${ROLE_LABELS[editRoleTemplate] || editRoleTemplate}` : "Set permissions for the selected role template."}
        role={permissionStaff ? editRoleTemplate : createRole}
        permissions={permissionStaff ? editPermissions : createPermissions}
        defaultPermissions={permissionStaff ? editDefaultPermissions : getTemplatePermissions(createRole)}
        onPermissionsChange={permissionStaff ? setEditPermissions : setCreatePermissions}
        accessScope={permissionStaff ? editAccessScope : undefined}
        defaultAccessScope={permissionStaff ? editDefaultScope : undefined}
        branches={activeBranches}
        onAccessScopeChange={permissionStaff ? setEditAccessScope : undefined}
        showAccessScope={Boolean(permissionStaff && permissionSnapshot)}
        isLoading={permissionStaff ? permissionQuery.isLoading : false}
        error={permissionStaff ? permissionQuery.error : null}
        onRetry={permissionStaff ? permissionQuery.refetch : undefined}
        onClose={() => setCreatePermissionEditorOpen(false)}
        saving={permissionStaff ? updatePermissionMutation.isPending : false}
        saveDisabled={permissionStaff ? !permissionSnapshot || (!editOverridesChanged && !editScopeChanged) : false}
        saveLabel={permissionStaff ? "Save Changes" : "Apply Permissions"}
        onSave={() => {
          if (permissionStaff) {
            updatePermissionMutation.mutate({
              staffId: permissionStaffId,
              payload: {
                overrides: buildOverridePayload(editPermissions, editDefaultPermissions),
                accessScope: editAccessScope,
              },
            });
          } else {
            setCreatePermissionEditorOpen(false);
          }
        }}
      />
    </div>
  );
}
