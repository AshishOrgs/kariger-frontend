import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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
  const { booting, isAuthenticated, isServiceActive, user } = useAuth();
  const subscription = user?.business?.subscription;
  const subscriptionStatus = subscription?.status;
  const isWorkspaceLocked = Boolean(subscription?.isWorkspaceLocked);

  if (booting) {
    return <div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">Loading Repair ERP...</div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (
    user?.role === "OWNER" &&
    subscriptionStatus === "NOT_SELECTED" &&
    !location.pathname.startsWith("/plans")
  ) {
    return <Navigate to="/plans" replace />;
  }

  if (isWorkspaceLocked) {
    return <Outlet />;
  }

  if (
    user?.role !== "SUPER_ADMIN" &&
    !isServiceActive &&
    !(user?.role === "OWNER" && canOwnerUsePendingPath(location.pathname))
  ) {
    return (
      <Navigate
        to={user?.role === "OWNER" ? "/subscription" : "/unauthorized"}
        replace
      />
    );
  }

  return <Outlet />;
}
