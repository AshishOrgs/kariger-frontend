import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BadgePlus,
  Bell,
  ChevronDown,
  ChevronRight,
  Clock3,
  FolderKanban,
  Grid2X2,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  PanelTop,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Form";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { navigation } from "@/layouts/navigation";
import { subscriptionApi } from "@/services/modules";
import { cn } from "@/utils/cn";
import { openWhatsApp } from "@/utils/whatsapp";

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [managementOpen, setManagementOpen] = useState(true);
  const [mobileAdminPanel, setMobileAdminPanel] = useState(null);
  const location = useLocation();
  const { user, logout, hasRole, updateSubscription } = useAuth();
  const { allBranchesValue, branches, selectedBranchId, setSelectedBranchId } = useBranch();
  const isSuperAdmin = hasRole("SUPER_ADMIN");

  const activeBranch = useMemo(() => {
    if (hasRole("ADMIN") || hasRole("TECHNICIAN")) {
      return user?.branch;
    }
    if (selectedBranchId && selectedBranchId !== allBranchesValue) {
      return branches.find((b) => b.id === selectedBranchId);
    }
    return branches.find((b) => b.isMainBranch) || branches[0];
  }, [user, branches, selectedBranchId, allBranchesValue, hasRole]);

  const brandLogo = isSuperAdmin ? "" : activeBranch?.metadata?.logo || "";
  const brandTitle = isSuperAdmin
    ? "Repair ERP Platform"
    : activeBranch?.metadata?.title || activeBranch?.name || "Repair ERP";
  const activeBranchName = activeBranch?.name || brandTitle;
  const brandSlogan = isSuperAdmin
    ? "SaaS control center"
    : activeBranch?.metadata?.slogan || activeBranch?.code || "Backend modules as navigation";

  const visibleNavigation = useMemo(() => {
    return navigation
      .filter((item) => hasRole(...item.roles))
      .map((item) => {
        if (item.path === "/staff") {
          return {
            ...item,
            label: user?.role === "OWNER" ? "Admins" : "Technicians",
          };
        }
        return item;
      });
  }, [hasRole, user?.role]);
  const showBranchSelector = hasRole("OWNER") && branches.length > 0;
  const subscription = user?.business?.subscription;
  const isSubscriptionPath = location.pathname === "/subscription" || location.pathname.startsWith("/subscription/");
  const approvalPending = isApprovalPending(subscription);
  const isWorkspaceLocked =
    !isSuperAdmin &&
    subscription?.isWorkspaceLocked &&
    !isSubscriptionPath &&
    (!approvalPending || user?.role === "OWNER");
  const trialWarning = !isSuperAdmin && !isWorkspaceLocked && subscription?.trialWarningLevel;
  const closeMobileSidebar = () => setOpen(false);
  const isAdminMobileShell = user?.role === "ADMIN";
  const closeMobileAdminPanel = () => setMobileAdminPanel(null);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Backdrop overlay for mobile screen */}
      {open && !isAdminMobileShell ? (
        <div
          className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-[2px] transition-opacity lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        onDoubleClick={closeMobileSidebar}
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex h-dvh max-h-dvh w-72 flex-col overflow-hidden border-r border-[var(--border)] bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          isAdminMobileShell && "hidden lg:flex"
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border)] px-5">
          <Link
            to={isSuperAdmin ? "/super-admin/dashboard" : "/branch/portal"}
            className="flex min-w-0 flex-1 items-center gap-3"
            onClick={closeMobileSidebar}
          >
            {brandLogo ? (
              <img src={brandLogo} alt="Logo" className="h-8 w-8 rounded-lg object-contain bg-slate-50 p-0.5 border border-slate-100 shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] grid place-items-center text-white text-[10px] font-black shrink-0 shadow-inner">
                {isSuperAdmin ? "SA" : brandTitle.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate" title={brandTitle}>{brandTitle}</p>
              <p className="text-[10px] text-[var(--muted)] truncate" title={brandSlogan}>{brandSlogan}</p>
            </div>
          </Link>
        </div>
        {showBranchSelector ? (
          <div className="shrink-0 border-b border-[var(--border)] p-3 lg:hidden">
            <p className="mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Branch</p>
            <Select
              className="w-full"
              value={selectedBranchId}
              onChange={(event) => {
                setSelectedBranchId(event.target.value);
                window.location.reload();
              }}
            >
              <option value={allBranchesValue}>All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <nav className="min-h-0 flex-1 overflow-y-auto p-3 pb-4">
          {user?.role === "ADMIN" ? (
            <AdminSidebarNavigation
              items={visibleNavigation}
              pathname={location.pathname}
              operationsOpen={operationsOpen}
              setOperationsOpen={setOperationsOpen}
              managementOpen={managementOpen}
              setManagementOpen={setManagementOpen}
              onNavigate={closeMobileSidebar}
            />
          ) : (
            visibleNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={closeMobileSidebar}
                  className={({ isActive }) =>
                    cn("mb-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100", isActive && "bg-blue-50 text-[var(--primary)]")
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })
          )}
          <Button variant="secondary" className="mt-3 w-full justify-start lg:hidden" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </nav>
        <div className="hidden shrink-0 border-t border-[var(--border)] bg-white p-3 lg:block">
          <Button variant="secondary" className="w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <div className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 min-w-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-white px-3 lg:px-6">
          {isAdminMobileShell ? (
            <Link to="/branch/portal" className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt="Logo"
                  className="h-10 w-10 shrink-0 rounded-2xl border border-slate-100 bg-slate-50 object-contain p-1 shadow-sm"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] text-xs font-black text-white shadow-sm shadow-teal-900/15">
                  {brandTitle.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-black leading-tight text-slate-950" title={user?.fullName || brandTitle}>
                  {user?.fullName || "Admin"}
                </p>
                <p className="truncate text-[11px] font-semibold text-[var(--muted)]">{user?.role || "ADMIN"}</p>
              </div>
            </Link>
          ) : null}

          <div className={cn("items-center gap-3", isAdminMobileShell ? "hidden lg:flex" : "flex")}>
            <Button
              variant="ghost"
              size="sm"
              className={cn("lg:hidden", isAdminMobileShell && "hidden")}
              onClick={() => setOpen((value) => !value)}
              onDoubleClick={closeMobileSidebar}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-sm font-semibold">
                {isSuperAdmin ? "Repair ERP Platform" : user?.business?.name || "Repair Business"}
              </p>
              <p className="text-xs text-[var(--muted)]">{user?.fullName} · {user?.role}</p>
            </div>
          </div>
          {isAdminMobileShell ? (
            <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 lg:hidden">
              <button
                type="button"
                className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-white" />
              </button>
              <div className="min-w-0 max-w-[138px] rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-400">Active Branch</p>
                <p className="truncate text-[11px] font-black leading-tight text-[var(--primary)]" title={activeBranchName}>
                  {activeBranchName}
                </p>
              </div>
            </div>
          ) : null}
          {showBranchSelector ? (
            <Select
              className="hidden w-56 sm:block"
              value={selectedBranchId}
              onChange={(event) => {
                setSelectedBranchId(event.target.value);
                window.location.reload();
              }}
            >
              <option value={allBranchesValue}>All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          ) : null}
        </header>
        <main className={cn("relative min-w-0 overflow-x-hidden p-4 pb-28 lg:p-6", isAdminMobileShell && "pb-32 lg:pb-6")}>
          {trialWarning ? <TrialWarningBanner subscription={subscription} /> : null}
          <div className={cn(isWorkspaceLocked && "pointer-events-none select-none blur-sm")}>
            <Outlet />
          </div>
        </main>
      </div>
      {isAdminMobileShell ? (
        <AdminMobileNavigation
          pathname={location.pathname}
          activePanel={mobileAdminPanel}
          setActivePanel={setMobileAdminPanel}
          onClosePanel={closeMobileAdminPanel}
        />
      ) : null}
      {isWorkspaceLocked ? <LockedWorkspaceOverlay subscription={subscription} user={user} updateSubscription={updateSubscription} /> : null}
    </div>
  );
}

const adminOperations = [
  { label: "Customer", path: "/customers", sourcePath: "/customers" },
  { label: "Estimate", path: "/repair/estimates", sourcePath: "/repair/estimates" },
  { label: "Assignment", path: "/assignments", sourcePath: "/assignments" },
  { label: "Repair", path: "/repair", sourcePath: "/repair" },
  { label: "Billing", path: "/billing", sourcePath: "/billing" },
  { label: "Handover", path: "/handover", sourcePath: "/handover" },
];

const adminManagement = [
  { label: "Technician", path: "/staff", sourcePath: "/staff" },
  { label: "Inventory", path: "/inventory", sourcePath: "/inventory" },
];

const mobileSectionIconTone = {
  Customer: "bg-sky-50 text-sky-700",
  Estimate: "bg-indigo-50 text-indigo-700",
  Assignment: "bg-violet-50 text-violet-700",
  Repair: "bg-emerald-50 text-emerald-700",
  Billing: "bg-amber-50 text-amber-700",
  Handover: "bg-teal-50 text-teal-700",
  Technician: "bg-blue-50 text-blue-700",
  Inventory: "bg-cyan-50 text-cyan-700",
};

function AdminSidebarNavigation({
  items,
  pathname,
  operationsOpen,
  setOperationsOpen,
  managementOpen,
  setManagementOpen,
  onNavigate,
}) {
  const byPath = useMemo(() => new Map(items.map((item) => [item.path, item])), [items]);
  const branchPortal = byPath.get("/branch/portal");
  const dashboard = byPath.get("/dashboard");

  return (
    <>
      {branchPortal ? <SidebarLink item={branchPortal} onNavigate={onNavigate} /> : null}
      {dashboard ? <SidebarLink item={dashboard} onNavigate={onNavigate} /> : null}

      <button
        type="button"
        onClick={() => setOperationsOpen((value) => !value)}
        className="mb-1 flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-black text-slate-700 hover:bg-slate-100"
      >
        <FolderKanban className="h-4 w-4" />
        <span className="flex-1">Operations</span>
        {operationsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {operationsOpen ? (
        <div className="mb-2 space-y-1 pl-3">
          {adminOperations.map((operation) => {
            const source = byPath.get(operation.sourcePath);
            const Icon = source?.icon || FolderKanban;
            const active = isAdminOperationActive(pathname, operation.path);
            return (
              <NavLink
                key={operation.label}
                to={operation.path}
                onClick={onNavigate}
                className={() =>
                  cn(
                    "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100",
                    active && "bg-blue-50 text-[var(--primary)]"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {operation.label}
              </NavLink>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setManagementOpen((value) => !value)}
        className="mb-1 flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-black text-slate-700 hover:bg-slate-100"
      >
        <FolderKanban className="h-4 w-4" />
        <span className="flex-1">Management</span>
        {managementOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {managementOpen ? (
        <div className="mb-2 space-y-1 pl-3">
          {adminManagement.map((entry) => {
            const source = byPath.get(entry.sourcePath);
            if (!source) return null;
            const Icon = source.icon || FolderKanban;
            const active = pathname === entry.path || pathname.startsWith(`${entry.path}/`);
            return (
              <NavLink
                key={entry.label}
                to={entry.path}
                onClick={onNavigate}
                className={() =>
                  cn(
                    "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100",
                    active && "bg-blue-50 text-[var(--primary)]"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {entry.label}
              </NavLink>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function SidebarLink({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn("mb-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100", isActive && "bg-blue-50 text-[var(--primary)]")
      }
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}

function AdminMobileNavigation({ pathname, activePanel, setActivePanel, onClosePanel }) {
  const createRepairVisible = pathname !== "/repair/new";

  return (
    <div className="lg:hidden">
      {activePanel ? (
        <div className="fixed inset-x-0 bottom-[5.35rem] z-40 px-3">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-[var(--primary)]">
                  {activePanel === "operations" ? <PanelTop className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
                </span>
                <p className="text-sm font-black text-slate-900">{activePanel === "operations" ? "Operations" : "Management"}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={onClosePanel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {(activePanel === "operations" ? adminOperations : adminManagement).map((entry) => (
                <MobileSectionLink key={entry.label} entry={entry} pathname={pathname} onNavigate={onClosePanel} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {createRepairVisible && !activePanel ? (
        <Link
          to="/repair/new"
          onClick={onClosePanel}
          className="fixed bottom-[4.95rem] right-3 z-40 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f9f8f,#1769aa)] px-5 py-3.5 text-sm font-black uppercase tracking-wide !text-white shadow-xl shadow-blue-900/25 ring-1 ring-white/40"
        >
          <BadgePlus className="h-5 w-5" />
          Create Repair
        </Link>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 shadow-[0_-10px_28px_rgba(15,23,42,0.1)] backdrop-blur">
        <div className="grid grid-cols-3 gap-1.5">
          <Link
            to="/dashboard"
            onClick={onClosePanel}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-black text-slate-500 transition",
              (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) && "bg-blue-50 text-[var(--primary)]"
            )}
          >
            <span className={cn(
              "grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-500",
              (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) && "bg-blue-100 text-[var(--primary)]"
            )}>
              <LayoutDashboard className="h-5 w-5" />
            </span>
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === "operations" ? null : "operations")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-black text-slate-500 transition",
              (activePanel === "operations" || adminOperations.some((entry) => isAdminOperationActive(pathname, entry.path))) && "bg-blue-50 text-[var(--primary)]"
            )}
          >
            <span className={cn(
              "grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-500",
              (activePanel === "operations" || adminOperations.some((entry) => isAdminOperationActive(pathname, entry.path))) && "bg-teal-100 text-teal-700"
            )}>
              <Grid2X2 className="h-5 w-5" />
            </span>
            Operations
          </button>
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === "management" ? null : "management")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-black text-slate-500 transition",
              (activePanel === "management" || adminManagement.some((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`))) && "bg-blue-50 text-[var(--primary)]"
            )}
          >
            <span className={cn(
              "grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-500",
              (activePanel === "management" || adminManagement.some((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`))) && "bg-indigo-100 text-indigo-700"
            )}>
              <Settings2 className="h-5 w-5" />
            </span>
            Management
          </button>
        </div>
      </nav>
    </div>
  );
}

function MobileSectionLink({ entry, pathname, onNavigate }) {
  const active = entry.path === "/repair"
    ? isAdminOperationActive(pathname, entry.path)
    : pathname === entry.path || pathname.startsWith(`${entry.path}/`);
  const source = navigation.find((item) => item.path === entry.sourcePath);
  const Icon = source?.icon || FolderKanban;

  return (
    <Link
      to={entry.path}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-sm font-bold text-slate-700 shadow-sm",
        active && "border-blue-200 bg-blue-50 text-[var(--primary)]"
      )}
    >
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", mobileSectionIconTone[entry.label] || "bg-slate-100 text-slate-600")}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 truncate">{entry.label}</span>
    </Link>
  );
}

function isAdminOperationActive(pathname, path) {
  if (path === "/customers") return pathname.startsWith("/customers") || pathname === "/repair/new";
  if (path === "/repair") {
    return pathname === "/repair" || (pathname.startsWith("/repair/") && !pathname.startsWith("/repair/estimates") && pathname !== "/repair/new");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

function TrialWarningBanner({ subscription }) {
  const days = subscription?.daysRemaining;
  const label = days <= 1 ? "Your trial ends in 1 day." : `Your trial ends in ${days} days.`;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-black">Trial Ending Soon</p>
          <p className="text-sm text-amber-800">
            {label} Start your subscription to keep KARIGER running without interruption.
          </p>
        </div>
      </div>
      <Link to="/subscription" className="shrink-0">
        <Button size="sm" type="button">Start Subscription</Button>
      </Link>
    </div>
  );
}

function lockReasonText(reason) {
  const reasons = {
    BRANCH_LIMIT_REACHED: "Your Starter trial branch limit has been reached.",
    DEVICE_LIMIT_REACHED: "Your Starter trial repair device limit has been reached.",
    STAFF_LIMIT_REACHED: "Your Starter trial staff limit has been reached.",
    TRIAL_PERIOD_ENDED: "Your 14-day trial has ended.",
  };

  return reasons[reason] || "Your trial has ended.";
}

function isApprovalPending(subscription) {
  return subscription?.effectiveStatus === "APPROVAL_PENDING";
}

function planLabel(subscription) {
  if (!subscription?.plan) return "Trial";
  const planName = subscription.plan.charAt(0) + subscription.plan.slice(1).toLowerCase();
  return subscription.status === "TRIALING" || ["EXPIRED", "APPROVAL_PENDING"].includes(subscription.effectiveStatus) ? `${planName} Trial` : planName;
}

function planDisplayName(plan) {
  if (!plan) return "Selected Plan";
  const planName = plan.charAt(0) + plan.slice(1).toLowerCase();
  return `${planName} Plan`;
}

function formatDate(value, fallback = "Not available") {
  if (!value) return fallback;
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function usageLabel(used, limit) {
  const usedValue = used ?? 0;
  if (limit === null || limit === undefined) return String(usedValue);
  return `${usedValue}/${limit}`;
}

function DetailRow({ label, value, danger = false }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className={cn("text-right font-black", danger ? "text-red-600" : "text-slate-950")}>{value}</span>
    </div>
  );
}

function buildOwnerActivationMessage({ subscription, user }) {
  const paymentRequest = subscription?.metadata?.paymentRequest || {};
  const requestId =
    paymentRequest.paymentRequestId ||
    paymentRequest.id ||
    subscription?.metadata?.paymentRequestId ||
    subscription?.metadata?.billingProviderRef ||
    "";
  const planName = planDisplayName(subscription?.plan);

  return [
    "Subscription Activation Request",
    "",
    "Request ID:",
    requestId,
    "",
    "Plan:",
    planName,
    "",
    "Business:",
    user?.business?.name || "",
    "",
    "Owner:",
    user?.fullName || "",
    "",
    "Mobile:",
    user?.phone || "",
    "",
    `Please activate our ${planName}.`,
    "",
    "Expected activation time:",
    "Within 1 hour.",
  ].join("\n");
}

function paymentRequestId(subscription) {
  const paymentRequest = subscription?.metadata?.paymentRequest || {};
  return (
    paymentRequest.paymentRequestId ||
    paymentRequest.id ||
    subscription?.metadata?.paymentRequestId ||
    subscription?.metadata?.billingProviderRef ||
    ""
  );
}

function paymentRequestStatus(subscription) {
  return subscription?.metadata?.paymentRequest?.status || "";
}

function activationRequestSentKey(subscription) {
  const requestId = paymentRequestId(subscription);
  return requestId ? `kariger.activationRequestSent:${requestId}` : "";
}

function readActivationRequestSent(subscription) {
  if (paymentRequestStatus(subscription) === "REQUESTED") return true;
  const key = activationRequestSentKey(subscription);
  if (!key) return false;
  try {
    return window.sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function rememberActivationRequestSent(subscription) {
  const key = activationRequestSentKey(subscription);
  if (!key) return;
  try {
    window.sessionStorage.setItem(key, "true");
  } catch {
    // The backend request remains the source of truth.
  }
}

function LockedWorkspaceOverlay({ subscription, user, updateSubscription }) {
  const [contacting, setContacting] = useState(false);
  const [activationRequestSent, setActivationRequestSent] = useState(() => readActivationRequestSent(subscription));
  const isOwner = user?.role === "OWNER";
  const approvalPending = isApprovalPending(subscription);
  const supportWhatsApp = user?.business?.supportWhatsapp || import.meta.env.VITE_PAY_WHATSAPP;
  const requestSent = approvalPending && (activationRequestSent || paymentRequestStatus(subscription) === "REQUESTED");
  const title = requestSent ? "Request Sent" : approvalPending ? "Approval Pending" : "Subscription Expired";
  const status = subscription?.effectiveStatus || subscription?.status || (approvalPending ? "APPROVAL_PENDING" : "EXPIRED");
  const message = requestSent
    ? "Thank you. Your activation request has been sent to KARIGER.\n\nOur team will review it shortly, and your workspace will unlock automatically as soon as approval is complete."
    : approvalPending
    ? "The Starter Trial limit has been reached.\n\nYour selected plan needs KARIGER approval before the workspace can continue."
    : `${lockReasonText(subscription?.trialExpiryReason)} Renew your subscription to continue using KARIGER.`;
  const handleContactOwner = async () => {
    setContacting(true);
    let messageSubscription = subscription;
    try {
      if (paymentRequestStatus(messageSubscription) !== "REQUESTED") {
        const response = await subscriptionApi.requestPayment({
          plan: messageSubscription?.plan || "STARTER",
          durationDays: 30,
        });
        if (response.data?.subscription) {
          messageSubscription = response.data.subscription;
          updateSubscription?.(response.data.subscription);
        }
      }
    } catch (error) {
      setContacting(false);
      window.alert(error?.response?.data?.message || "Unable to prepare activation request.");
      return;
    }

    const opened = openWhatsApp({
      phone: supportWhatsApp,
      message: buildOwnerActivationMessage({ subscription: messageSubscription, user }),
    });
    setContacting(false);
    if (!opened) {
      window.alert("WhatsApp number is not configured.");
      return;
    }
    rememberActivationRequestSent(messageSubscription);
    setActivationRequestSent(true);
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-white/70 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[linear-gradient(135deg,#e0f2fe,#ecfeff)] shadow-inner">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] text-white shadow-lg">
            <LockKeyhole className="h-8 w-8" />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[var(--primary)]">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-black uppercase tracking-wider">Workspace Locked</span>
        </div>

        <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
          {message}
        </p>

        <div className="mt-5 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-left text-sm">
          <p className="mb-1 text-xs font-black uppercase tracking-wider text-slate-500">Subscription Details</p>
          <DetailRow label="Current Plan" value={planLabel(subscription)} />
          <DetailRow label="Status" value={status} danger={!approvalPending} />
          <DetailRow label="Trial Started" value={formatDate(subscription?.trialStartedAt)} />
          <DetailRow label={approvalPending ? "Locked On" : "Expired On"} value={formatDate(subscription?.expiredOn, approvalPending ? "Approval required" : "Usage limit reached")} />
        </div>

        <div className="mt-3 grid gap-2 rounded-md border border-slate-200 bg-white p-3 text-left text-sm">
          <p className="mb-1 text-xs font-black uppercase tracking-wider text-slate-500">Current Usage</p>
          <DetailRow label="Branches" value={usageLabel(subscription?.branchCount, subscription?.branchLimit)} />
          <DetailRow label="Devices" value={usageLabel(subscription?.trialDevicesUsed, subscription?.trialDeviceLimit)} />
          <DetailRow label="Staff" value={usageLabel(subscription?.staffCount, subscription?.staffLimit)} />
        </div>

        {approvalPending ? (
          <div className="mt-6">
            <Button className="w-full" type="button" onClick={handleContactOwner} disabled={contacting || requestSent}>
              {requestSent ? "Activation Request Sent" : contacting ? "Preparing Request..." : "Contact KARIGER Owner"}
            </Button>
            {requestSent ? (
              <p className="mt-3 rounded-md bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                No further action is needed right now. This page will update automatically after approval.
              </p>
            ) : null}
          </div>
        ) : isOwner ? (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link to="/subscription">
              <Button className="w-full" type="button">Renew Subscription</Button>
            </Link>
            <Link to="/subscription">
              <Button className="w-full" type="button" variant="secondary">Contact on WhatsApp</Button>
            </Link>
          </div>
        ) : (
          <p className="mt-6 rounded-md bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            Please contact the business owner to activate the subscription.
          </p>
        )}
      </div>
    </div>
  );
}
