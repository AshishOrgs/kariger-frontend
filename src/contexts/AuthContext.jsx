import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/contexts/ToastContext";
import { authApi } from "@/services/modules";
import { clearSession, getAccessToken, getStoredUser, persistSession, updateStoredUser } from "@/services/session";
import { scheduleProactiveRefresh } from "@/services/tokenManager";
import { PERMISSIONS, hasAllPermissions, hasAnyPermission } from "@/utils/permissions";

const AuthContext = createContext(null);

function normalizeRole(role) {
  return role;
}

function isServiceActive(user) {
  if (!user || hasAnyPermission(user.permissions, [PERMISSIONS.SUPER_ADMIN_MANAGE])) return true;
  const status = user.business?.subscription?.status;
  const effectiveStatus = user.business?.subscription?.effectiveStatus;
  const activeStatuses = ["ACTIVE", "TRIALING", "PENDING", "DONE", "APPROVED", "PAID"];
  if (activeStatuses.includes(status) || activeStatuses.includes(effectiveStatus)) return true;
  return Boolean(user.business?.subscription?.isServiceActive);
}

function needsPlanSelection(user) {
  return hasAnyPermission(user?.permissions, [PERMISSIONS.SUBSCRIPTION_MANAGE]) && user.business?.subscription?.status === "NOT_SELECTED";
}

function needsSubscriptionPage(user) {
  const subscription = user?.business?.subscription;
  return (
    hasAnyPermission(user?.permissions, [PERMISSIONS.SUBSCRIPTION_MANAGE]) &&
    !isServiceActive(user) &&
    subscription?.effectiveStatus !== "APPROVAL_PENDING"
  );
}

function shouldPollSubscription(user) {
  const subscription = user?.business?.subscription;
  if (!user || hasAnyPermission(user.permissions, [PERMISSIONS.SUPER_ADMIN_MANAGE]) || !subscription) return false;
  return Boolean(
    subscription.isWorkspaceLocked ||
      subscription.trialWarningLevel ||
      (!subscription.isServiceActive && !["NOT_SELECTED"].includes(subscription.status))
  );
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearSubscriptionLimitCache, setLimitScope } = useToast();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const shouldPollCurrentSubscription = shouldPollSubscription(user);

  const updateSubscription = useCallback((subscription) => {
    setUser((currentUser) => {
      if (!currentUser?.business) return currentUser;
      if (JSON.stringify(currentUser.business.subscription) === JSON.stringify(subscription)) {
        return currentUser;
      }

      const nextUser = {
        ...currentUser,
        business: {
          ...currentUser.business,
          subscription,
        },
      };
      updateStoredUser(nextUser);
      return nextUser;
    });
  }, []);

  useEffect(() => {
    setLimitScope({
      businessId: user?.businessId || user?.business?.id,
      plan: user?.business?.subscription?.plan,
    });
  }, [setLimitScope, user?.business?.id, user?.business?.subscription?.plan, user?.businessId]);

  useEffect(() => {
    if (["ACTIVE", "TRIALING"].includes(user?.business?.subscription?.status)) {
      clearSubscriptionLimitCache();
    }
  }, [clearSubscriptionLimitCache, user?.business?.subscription?.plan, user?.business?.subscription?.status]);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();
    if (!token || !storedUser) {
      setBooting(false);
      return;
    }

    setUser(storedUser);
    authApi
      .me()
      .then((response) => {
        updateStoredUser(response.data.user);
        setUser(response.data.user);
        scheduleProactiveRefresh(); // start proactive token refresh on boot
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!shouldPollCurrentSubscription) return undefined;

    const poll = window.setInterval(() => {
      authApi
        .me()
        .then((response) => {
          updateStoredUser(response.data.user);
          setUser(response.data.user);
        })
        .catch(() => {
          clearSession();
          setUser(null);
          navigate("/login", { replace: true });
        });
    }, 15000);

    return () => window.clearInterval(poll);
  }, [
    navigate,
    shouldPollCurrentSubscription,
  ]);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      persistSession(response.data.user, response.data.tokens);
      scheduleProactiveRefresh(); // start proactive refresh after login
      setUser(response.data.user);
      queryClient.invalidateQueries({ queryKey: ["subscription-current"] });
      const user = response.data.user;
      const permissions = user?.permissions || [];
      navigate(
        hasAnyPermission(permissions, [PERMISSIONS.SUPER_ADMIN_MANAGE])
          ? "/super-admin/dashboard"
          : needsPlanSelection(user)
          ? "/plans"
          : needsSubscriptionPage(user)
          ? "/subscription"
          : hasAnyPermission(permissions, [PERMISSIONS.REPAIR_INTAKE, PERMISSIONS.SUBSCRIPTION_MANAGE])
          ? "/dashboard"
          : "/dashboard",
        { replace: true }
      );
    },
  });

  const value = useMemo(
    () => ({
      user,
      booting,
      isAuthenticated: Boolean(user),
      login: (payload) => loginMutation.mutateAsync(payload),
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          clearSession();
          setUser(null);
          queryClient.invalidateQueries({ queryKey: ["subscription-current"] });
          navigate("/login", { replace: true });
        }
      },
      hasRole: (...roles) => {
        if (!user) return false;
        return roles.includes(normalizeRole(user.role));
      },
      hasPermission: (...permissions) => hasAnyPermission(user?.permissions, permissions),
      hasAllPermissions: (...permissions) => hasAllPermissions(user?.permissions, permissions),
      permissions: user?.permissions || [],
      accessScope: user?.accessScope || null,
      isServiceActive: isServiceActive(user),
      updateSubscription,
    }),
    [booting, loginMutation, navigate, queryClient, updateSubscription, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
