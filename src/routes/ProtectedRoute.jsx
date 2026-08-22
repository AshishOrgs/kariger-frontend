import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/utils/permissions";

const ownerSetupPaths = [
  "/plans",
  "/subscription",
  "/branch/portal",
  "/dashboard",
  "/branches",
  "/business",
  "/staff",
];

function canOwnerUsePendingPath(pathname) {
  return ownerSetupPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function ProtectedRoute() {
  const location = useLocation();
  const { booting, hasPermission, isAuthenticated, isServiceActive, user } = useAuth();
  const subscription = user?.business?.subscription;
  const subscriptionStatus = subscription?.status;
  const isWorkspaceLocked = Boolean(subscription?.isWorkspaceLocked);
  const canManageSubscription = hasPermission(PERMISSIONS.SUBSCRIPTION_MANAGE);
  const isPlatformUser = hasPermission(PERMISSIONS.SUPER_ADMIN_MANAGE);

  if (booting) {
    return <div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">Loading Repair ERP...</div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (
    canManageSubscription &&
    subscriptionStatus === "NOT_SELECTED" &&
    !location.pathname.startsWith("/plans")
  ) {
    return <Navigate to="/plans" replace />;
  }

  if (isWorkspaceLocked) {
    return <Outlet />;
  }

  if (
    !isPlatformUser &&
    !isServiceActive &&
    subscriptionStatus !== "PENDING" &&
    !(canManageSubscription && canOwnerUsePendingPath(location.pathname))
  ) {
    return (
      <Navigate
        to={canManageSubscription ? "/subscription" : "/unauthorized"}
        replace
      />
    );
  }

  return <Outlet />;
}
