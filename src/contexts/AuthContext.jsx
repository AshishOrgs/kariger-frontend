import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/contexts/ToastContext";
import { authApi } from "@/services/modules";
import { clearSession, getAccessToken, getStoredUser, persistSession, updateStoredUser } from "@/services/session";

const AuthContext = createContext(null);

function normalizeRole(role) {
  return role;
}

function isServiceActive(user) {
  if (!user || user.role === "SUPER_ADMIN") return true;
  return Boolean(user.business?.subscription?.isServiceActive);
}

function needsPlanSelection(user) {
  return user?.role === "OWNER" && user.business?.subscription?.status === "NOT_SELECTED";
}

function needsSubscriptionPage(user) {
  const subscription = user?.business?.subscription;
  return (
    user?.role === "OWNER" &&
    !isServiceActive(user) &&
    subscription?.effectiveStatus !== "APPROVAL_PENDING"
  );
}

function shouldPollSubscription(user) {
  const subscription = user?.business?.subscription;
  if (!user || user.role === "SUPER_ADMIN" || !subscription) return false;
  return Boolean(
    subscription.isWorkspaceLocked ||
      subscription.trialWarningLevel ||
      (!subscription.isServiceActive && !["NOT_SELECTED"].includes(subscription.status))
  );
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const { clearSubscriptionLimitCache, setLimitScope } = useToast();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

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
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!shouldPollSubscription(user)) return undefined;

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
    user?.business?.subscription?.isServiceActive,
    user?.business?.subscription?.isWorkspaceLocked,
    user?.business?.subscription?.status,
    user?.business?.subscription?.trialWarningLevel,
    user?.role,
  ]);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      persistSession(response.data.user, response.data.tokens);
      setUser(response.data.user);
      const role = normalizeRole(response.data.user?.role);
      navigate(
        role === "SUPER_ADMIN"
          ? "/super-admin/dashboard"
          : needsPlanSelection(response.data.user)
          ? "/plans"
          : needsSubscriptionPage(response.data.user)
          ? "/subscription"
          : ["OWNER", "ADMIN"].includes(role)
          ? "/branch/portal"
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
          navigate("/login", { replace: true });
        }
      },
      hasRole: (...roles) => {
        if (!user) return false;
        return roles.includes(normalizeRole(user.role));
      },
      isServiceActive: isServiceActive(user),
      updateSubscription,
    }),
    [booting, loginMutation, navigate, updateSubscription, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
