import { useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BadgePlus,
  Building2,
  Clock3,
  ClipboardList,
  FolderKanban,
  Gauge,
  LockKeyhole,
  LogOut,
  Menu,
  Settings2,
  Sparkles,
  UserRoundCog,
  Users,
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
import { PERMISSIONS } from "@/utils/permissions";

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [mobileNavPanel, setMobileNavPanel] = useState(null);
  const location = useLocation();
  const activeRoute = `${location.pathname}${location.search}`;
  const { user, logout, hasPermission, accessScope, updateSubscription } = useAuth();
  const { allBranchesValue, branches, selectedBranchId, setSelectedBranchId } = useBranch();
  const isSuperAdmin = hasPermission(PERMISSIONS.SUPER_ADMIN_MANAGE);
  const canCreateRepair = hasPermission(PERMISSIONS.REPAIR_INTAKE);

  const activeBranch = useMemo(() => {
    const authenticatedBranch =
      user?.branch || branches.find((branch) => branch.id === user?.branchId);
    const isAuthenticatedBranchScope = ["ownBranch", "currentBranch", "assignedBranch"].includes(
      accessScope?.branchScope,
    );

    if (isAuthenticatedBranchScope && authenticatedBranch) {
      return authenticatedBranch;
    }

    if (selectedBranchId && selectedBranchId !== allBranchesValue) {
      return branches.find((b) => b.id === selectedBranchId);
    }
    return branches.find((b) => b.isMainBranch) || branches[0];
  }, [accessScope?.branchScope, user?.branch, user?.branchId, branches, selectedBranchId, allBranchesValue]);

  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => {
      if (a.isMainBranch) return -1;
      if (b.isMainBranch) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [branches]);

  const brandLogo = isSuperAdmin ? "/logo.png" : activeBranch?.metadata?.logo || "/logo.png";
  const brandTitle = isSuperAdmin
    ? "Repair ERP Platform"
    : activeBranch?.metadata?.title || activeBranch?.name || "Repair ERP";
  const brandSlogan = isSuperAdmin
    ? "SaaS control center"
    : activeBranch?.metadata?.slogan || activeBranch?.code || "Workflow navigation";

  const visibleNavigation = useMemo(() => {
    return navigation
      .filter((item) => hasPermission(...item.permissions));
  }, [hasPermission]);
  const showBranchSelector =
    ["allBranches", "selectedBranches", "platform"].includes(accessScope?.branchScope) &&
    branches.length > 0 &&
    hasPermission(PERMISSIONS.BRANCH_VIEW, PERMISSIONS.BRANCH_MANAGE);
  const subscription = user?.business?.subscription;
  const isSubscriptionPath = location.pathname === "/subscription" || location.pathname.startsWith("/subscription/");
  const approvalPending = isApprovalPending(subscription);
  const isWorkspaceLocked =
    !isSuperAdmin &&
    subscription?.isWorkspaceLocked &&
    !isSubscriptionPath &&
    (!approvalPending || hasPermission(PERMISSIONS.SUBSCRIPTION_MANAGE));
  const trialWarning = !isSuperAdmin && !isWorkspaceLocked && subscription?.trialWarningLevel;
  const closeMobileSidebar = () => setOpen(false);
  const closeMobileNavPanel = () => setMobileNavPanel(null);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Backdrop overlay for mobile screen */}
      {open ? (
        <div
          className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-[2px] transition-opacity lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        onDoubleClick={closeMobileSidebar}
        className={cn(
          "print:hidden fixed inset-y-0 left-0 z-30 flex h-dvh max-h-dvh w-72 flex-col overflow-hidden border-r border-[var(--border)] bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border)] px-5">
          <Link
            to={isSuperAdmin ? "/super-admin/dashboard" : "/dashboard"}
            className="flex min-w-0 flex-1 items-center gap-3"
            onClick={closeMobileSidebar}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm shadow-slate-200/60">
              <img
                src={brandLogo}
                alt="Logo"
                className="h-full w-full rounded-xl object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
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
              value={selectedBranchId || sortedBranches[0]?.id || ""}
              onChange={(event) => {
                setSelectedBranchId(event.target.value);
                window.location.reload();
              }}
            >
              {sortedBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} {branch.isMainBranch ? "(Main)" : ""}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <nav className="min-h-0 flex-1 overflow-y-auto p-3 pb-4">
          {visibleNavigation.map((item) => (
            <SidebarLink key={item.id || item.path} item={item} activeRoute={activeRoute} onNavigate={closeMobileSidebar} />
          ))}
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
        <header className="print:hidden sticky top-0 z-20 flex h-16 min-w-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-white px-3 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setOpen((value) => !value)}
              onDoubleClick={closeMobileSidebar}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-sm font-semibold">
                {isSuperAdmin ? "Repair ERP Platform" : activeBranch?.name || user?.business?.name || "Repair Business"}
              </p>
              <p className="text-xs text-[var(--muted)]">{user?.fullName} · {user?.role}</p>
            </div>
          </div>
          {showBranchSelector ? (
            <Select
              className="hidden w-56 sm:block"
              value={selectedBranchId || sortedBranches[0]?.id || ""}
              onChange={(event) => {
                setSelectedBranchId(event.target.value);
                window.location.reload();
              }}
            >
              {sortedBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} {branch.isMainBranch ? "(Main)" : ""}
                </option>
              ))}
            </Select>
          ) : null}
        </header>
        <main className="relative min-w-0 overflow-x-hidden p-4 pb-32 lg:p-6">
          {trialWarning ? <TrialWarningBanner subscription={subscription} /> : null}
          <div className={cn(isWorkspaceLocked && "pointer-events-none select-none blur-sm")}>
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNavigation
        items={visibleNavigation}
        activeRoute={activeRoute}
        activePanel={mobileNavPanel}
        setActivePanel={setMobileNavPanel}
        onClosePanel={closeMobileNavPanel}
        canCreateRepair={canCreateRepair}
      />
      {isWorkspaceLocked ? <LockedWorkspaceOverlay subscription={subscription} user={user} updateSubscription={updateSubscription} onLogout={logout} /> : null}
    </div>
  );
}

const mobileSectionIconTone = {
  Dashboard: "bg-sky-50 text-sky-700",
  "Repair Intake": "bg-teal-50 text-teal-700",
  "Repair Estimates": "bg-indigo-50 text-indigo-700",
  "Technician Report": "bg-blue-50 text-blue-700",
  "Technician Work": "bg-emerald-50 text-emerald-700",
  Billing: "bg-amber-50 text-amber-700",
  Handover: "bg-teal-50 text-teal-700",
  Inventory: "bg-cyan-50 text-cyan-700",
  Staff: "bg-violet-50 text-violet-700",
  Branches: "bg-sky-50 text-sky-700",
  Business: "bg-slate-100 text-slate-700",
  Subscription: "bg-amber-50 text-amber-700",
  Settings: "bg-slate-100 text-slate-700",
};

function SidebarLink({ item, activeRoute, onNavigate }) {
  const Icon = item.icon;
  const active = isNavigationActive(activeRoute, item.path);
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn("mb-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100", active && "bg-blue-50 text-[var(--primary)]")}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

const bottomNavConfig = [
  { id: "home", label: "Dashboard", icon: Gauge },
  { id: "repairs", label: "Repairs", icon: ClipboardList },
  { id: "team", label: "Staff", icon: UserRoundCog },
  { id: "business", label: "Business", icon: Building2 },
  { id: "more", label: "More", icon: Settings2 },
];

function MobileNavigation({ items, activeRoute, activePanel, setActivePanel, onClosePanel, canCreateRepair }) {
  const navigate = useNavigate();
  const itemsByCategory = useMemo(() => {
    return items.reduce((acc, item) => {
      const category = item.category || "more";
      acc[category] = [...(acc[category] || []), item];
      return acc;
    }, {});
  }, [items]);

  const bottomItems = bottomNavConfig
    .map((entry) => {
      const categoryItems = itemsByCategory[entry.id] || [];
      const firstItem = categoryItems[0];
      if (!firstItem) return null;
      return { ...entry, items: categoryItems, path: firstItem.path };
    })
    .filter(Boolean);

  const panel = bottomItems.find((entry) => entry.id === activePanel && entry.items.length > 1);
  const createRepairVisible = canCreateRepair && routePathname(activeRoute) !== "/repair/new";

  return (
    <div className="lg:hidden">
      {panel ? (
        <div className="fixed inset-x-0 bottom-[5.35rem] z-40 px-3">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-[var(--primary)]">
                  <panel.icon className="h-5 w-5" />
                </span>
                <p className="text-sm font-black text-slate-900">{panel.label}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={onClosePanel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {panel.items.map((entry) => (
                <MobileSectionLink key={entry.id || entry.path} entry={entry} activeRoute={activeRoute} onNavigate={onClosePanel} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {createRepairVisible && !activePanel ? (
        <Link
          to="/repair/new"
          onClick={onClosePanel}
          className="print:hidden fixed bottom-[4.95rem] right-3 z-40 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f9f8f,#1769aa)] px-5 py-3.5 text-sm font-black uppercase tracking-wide !text-white shadow-xl shadow-blue-900/25 ring-1 ring-white/40"
        >
          <BadgePlus className="h-5 w-5" />
          Create Repair
        </Link>
      ) : null}

      <nav className="print:hidden fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 shadow-[0_-10px_28px_rgba(15,23,42,0.1)] backdrop-blur">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${Math.max(bottomItems.length, 1)}, minmax(0, 1fr))` }}
        >
          {bottomItems.map((entry) => {
            const Icon = entry.icon;
            const active = activePanel === entry.id || entry.items.some((item) => isNavigationActive(activeRoute, item.path));
            const isSingle = entry.items.length === 1;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  if (isSingle) {
                    onClosePanel();
                    navigate(entry.items[0].path);
                  } else {
                    setActivePanel(activePanel === entry.id ? null : entry.id);
                  }
                }}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-black text-slate-500 transition",
                  active && "bg-blue-50 text-[var(--primary)]"
                )}
              >
                <span className={cn(
                  "grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-500",
                  active && "bg-blue-100 text-[var(--primary)]"
                )}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="max-w-full truncate">{entry.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function MobileSectionLink({ entry, activeRoute, onNavigate }) {
  const active = isNavigationActive(activeRoute, entry.path);
  const Icon = entry.icon || FolderKanban;

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

function isNavigationActive(activeRoute, path) {
  const pathname = routePathname(activeRoute);
  const targetPathname = routePathname(path);
  const targetSearch = routeSearch(path);

  if (targetSearch) {
    return pathname === targetPathname && routeSearch(activeRoute) === targetSearch;
  }

  if (path === "/repair") {
    return pathname === "/repair" || (pathname.startsWith("/repair/") && !pathname.startsWith("/repair/estimates") && pathname !== "/repair/new");
  }
  return pathname === targetPathname || pathname.startsWith(`${targetPathname}/`);
}

function routePathname(value = "") {
  return String(value).split("?")[0];
}

function routeSearch(value = "") {
  const index = String(value).indexOf("?");
  return index >= 0 ? String(value).slice(index) : "";
}

function TrialWarningBanner({ subscription }) {
  const days = subscription?.daysRemaining;
  const isLimitWarning = subscription?.trialWarningLevel === "LIMIT_REACHED";
  const label = isLimitWarning
    ? `${lockReasonText(subscription?.trialExpiryReason)} You can keep using the dashboard. Upgrade your subscription when you need to add more.`
    : days <= 1
    ? "Your trial ends in 1 day."
    : `Your trial ends in ${days} days.`;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-black">{isLimitWarning ? "Plan Limit Reached" : "Subscription Reminder"}</p>
          <p className="text-sm text-amber-800">
            {label}
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
    BRANCH_LIMIT_REACHED: "Your current plan includes 2 branches.",
    DEVICE_LIMIT_REACHED: "Your current plan device limit has been reached.",
    STAFF_LIMIT_REACHED: "Your current plan staff limit has been reached.",
    TRIAL_PERIOD_ENDED: "Your free access period has ended.",
  };

  return reasons[reason] || "Your subscription needs attention.";
}

function isApprovalPending(subscription) {
  return (
    subscription?.effectiveStatus === "APPROVAL_PENDING" ||
    subscription?.metadata?.paymentRequest?.status === "REQUESTED" ||
    subscription?.status === "PENDING"
  );
}

function planLabel(subscription) {
  if (!subscription?.plan) return "Not selected";
  const planName = subscription.plan.charAt(0) + subscription.plan.slice(1).toLowerCase();
  return planName;
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

function LockedWorkspaceOverlay({ subscription, user, updateSubscription, onLogout }) {
  const canManageSubscription = Array.isArray(user?.permissions) && user.permissions.includes(PERMISSIONS.SUBSCRIPTION_MANAGE);
  const approvalPending = isApprovalPending(subscription);
  const reqId = paymentRequestId(subscription);
  const title = approvalPending ? "Renewal Pending Approval" : "Subscription Expired";
  const message = approvalPending
    ? "Your renewal request has been received by KARIGER SuperAdmin.\n\nOur team is verifying your payment. Your workspace will unlock automatically once approval is completed."
    : `${lockReasonText(subscription?.trialExpiryReason)} Renew your subscription to continue using KARIGER.`;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 px-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/80 bg-white p-6 text-center shadow-2xl shadow-slate-950/30">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[linear-gradient(135deg,#e0f2fe,#ecfeff)] shadow-inner">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] text-white shadow-md">
            <LockKeyhole className="h-7 w-7" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[var(--primary)]">
          <Sparkles className="h-4 w-4" />
          <span className="text-[11px] font-black uppercase tracking-wider">Workspace Locked</span>
        </div>

        <h2 className="mt-1 text-2xl font-black text-slate-900">{title}</h2>
        <p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-slate-600">
          {message}
        </p>

        {approvalPending && reqId ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-[linear-gradient(135deg,#fffbeb,#fef3c7)] p-3 text-left text-xs text-amber-950 shadow-sm">
            <div className="flex items-center justify-between font-bold text-amber-900">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Request Submitted
              </span>
              <span className="font-mono text-[11px] bg-amber-200/70 px-2 py-0.5 rounded text-amber-950">
                {reqId}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-amber-800 leading-snug">
              No further action is required. Please wait while SuperAdmin approves your request.
            </p>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 text-left text-xs sm:grid-cols-2">
          {/* Subscription Info Box */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 shadow-sm">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Subscription Info</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Plan</span>
                <span className="font-bold text-slate-900">{planLabel(subscription)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Status</span>
                {approvalPending ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Pending Approval
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    Expired
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Started On</span>
                <span className="font-semibold text-slate-800">{formatDate(subscription?.trialStartedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">{approvalPending ? "Locked On" : "Expired On"}</span>
                <span className="font-semibold text-slate-800">{formatDate(subscription?.expiredOn, approvalPending ? "Approval required" : "Limit reached")}</span>
              </div>
            </div>
          </div>

          {/* Current Usage Box */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 shadow-sm">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Current Usage</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Branches</span>
                <span className="font-bold text-slate-900">{usageLabel(subscription?.branchCount, subscription?.branchLimit)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Devices</span>
                <span className="font-bold text-slate-900">{usageLabel(subscription?.trialDevicesUsed, subscription?.trialDeviceLimit)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Staff</span>
                <span className="font-bold text-slate-900">{usageLabel(subscription?.staffCount, subscription?.staffLimit)}</span>
              </div>
            </div>
          </div>
        </div>

        {approvalPending ? (
          <div className="mt-5 space-y-2">
            <Link to="/subscription" className="block w-full">
              <Button className="w-full" type="button" variant="outline">
                View Subscription Details
              </Button>
            </Link>
            <Button className="w-full" type="button" variant="secondary" onClick={onLogout}>
              Decide Later / Logout
            </Button>
          </div>
        ) : canManageSubscription ? (
          <div className="mt-5 space-y-2">
            <Link to="/subscription" className="block w-full">
              <Button className="w-full" type="button">Renew Subscription</Button>
            </Link>
            <Button className="w-full" type="button" variant="secondary" onClick={onLogout}>
              Decide Later / Logout
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            <p className="rounded-md bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
              Please contact the business owner to activate the subscription.
            </p>
            <Button className="w-full" type="button" variant="secondary" onClick={onLogout}>
              Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
