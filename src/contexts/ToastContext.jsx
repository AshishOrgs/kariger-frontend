import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const ToastContext = createContext(null);
const LIMIT_CACHE_KEY = "kariger.subscriptionLimits";

const readLimitCache = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(LIMIT_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeLimitCache = (cache) => {
  try {
    window.sessionStorage.setItem(LIMIT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Session storage is an optimization; the API remains the source of truth.
  }
};

const limitKey = ({ businessId, plan, resource }) => {
  if (!businessId || !plan || !resource) return "";
  return `limit:${businessId}:${plan}:${String(resource).toUpperCase()}`;
};

const resourceKey = (resource) => String(resource || "").toLowerCase();

const normalizeLimitDetails = (responseData) => {
  const source = responseData?.details?.type === "SUBSCRIPTION_LIMIT" ? responseData.details : responseData;
  if (source?.type !== "SUBSCRIPTION_LIMIT" && responseData?.code !== "SUBSCRIPTION_LIMIT_REACHED") return null;

  const usage = Object.fromEntries(
    Object.entries(source.usage || {}).map(([key, item]) => [
      key,
      {
        ...item,
        used: item?.used ?? item?.current ?? 0,
      },
    ])
  );

  return {
    ...source,
    type: "SUBSCRIPTION_LIMIT",
    title: source.title || "Starter Trial Limit Reached",
    currentPlan: source.currentPlan || "Starter Trial",
    resource: source.resource || source.resourceType || responseData?.resource,
    resourceType: source.resourceType || source.resource || responseData?.resourceType,
    resourceKey: source.resourceKey || resourceKey(source.resource || source.resourceType || responseData?.resource),
    usage,
    message: source.message || "Upgrade now to continue using KARIGER.",
  };
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [limitModal, setLimitModal] = useState(null);
  const [limitCache, setLimitCache] = useState(readLimitCache);
  const [limitScope, setLimitScopeState] = useState({
    businessId: null,
    plan: null,
  });

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ type = "success", title, message }) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((current) => [...current, { id, type, title, message }]);
      window.setTimeout(() => removeToast(id), 4500);
    },
    [removeToast]
  );

  const setLimitScope = useCallback((scope = {}) => {
    setLimitScopeState((current) => {
      const next = {
        businessId: scope.businessId || null,
        plan: scope.plan || null,
      };
      if (current.businessId === next.businessId && current.plan === next.plan) return current;
      return next;
    });
  }, []);

  const clearSubscriptionLimitCache = useCallback(() => {
    setLimitCache({});
    setLimitModal(null);
    writeLimitCache({});
  }, []);

  const rememberLimit = useCallback((details) => {
    const key = limitKey({
      ...limitScope,
      resource: details.resourceType || details.resource || details.resourceKey,
    });
    if (!key) return;
    setLimitCache((current) => {
      const next = { ...current, [key]: details };
      writeLimitCache(next);
      return next;
    });
  }, [limitScope]);

  const showRememberedLimit = useCallback(
    (resource) => {
      const key = limitKey({
        ...limitScope,
        resource,
      });
      const details = key ? limitCache[key] : null;
      if (!details) return false;
      setLimitModal(details);
      return true;
    },
    [limitCache, limitScope]
  );

  const errorFromApi = useCallback(
    (error, fallback = "Request failed. Please try again.") => {
      const details = normalizeLimitDetails(error?.response?.data);
      if (details) {
        rememberLimit(details);
        setLimitModal(details);
        return;
      }

      pushToast({
        type: "error",
        title: "Error",
        message: error?.response?.data?.message || error?.message || fallback,
      });
    },
    [pushToast, rememberLimit]
  );

  const value = useMemo(
    () => ({
      success: (message, title = "Success") => pushToast({ type: "success", title, message }),
      error: (message, title = "Error") => pushToast({ type: "error", title, message }),
      info: (message, title = "Info") => pushToast({ type: "info", title, message }),
      errorFromApi,
      showRememberedLimit,
      setLimitScope,
      clearSubscriptionLimitCache,
    }),
    [clearSubscriptionLimitCache, errorFromApi, pushToast, setLimitScope, showRememberedLimit]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg border bg-white p-4 shadow-lg ${
              toast.type === "error" ? "border-red-200" : toast.type === "info" ? "border-blue-200" : "border-green-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-sm text-[var(--muted)]">{toast.message}</p> : null}
              </div>
              <button className="rounded p-1 hover:bg-slate-100" onClick={() => removeToast(toast.id)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {limitModal ? (
        <LimitReachedModal details={limitModal} onClose={() => setLimitModal(null)} />
      ) : null}
    </ToastContext.Provider>
  );
}

function UsageLine({ item }) {
  if (!item || item.limit === null || item.limit === undefined) return null;
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-sm font-semibold text-slate-700">{item.label}</span>
      <span className="text-sm font-bold text-slate-950">
        {item.used ?? item.current ?? 0} / {item.limit}
      </span>
    </div>
  );
}

function LimitReachedModal({ details, onClose }) {
  const usage = details.usage || {};

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-black text-slate-950">{details.title || "Starter Trial Limit Reached"}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Current Plan</p>
            <p className="text-base font-bold text-slate-900">{details.currentPlan || "Starter Trial"}</p>
          </div>
          <button className="rounded p-1 hover:bg-slate-100" type="button" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <UsageLine item={usage.branches} />
          <UsageLine item={usage.devices} />
          <UsageLine item={usage.staff} />
        </div>

        <p className="mt-4 text-sm font-medium text-slate-700">
          {details.message || "Upgrade now to continue using KARIGER."}
        </p>

        <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3">
          <p className="text-sm font-bold text-slate-950">Upgrade Benefits</p>
          <div className="mt-2 grid gap-2 text-sm font-medium text-slate-700">
            {["Unlimited Devices", "More Branches", "More Staff", "Premium Support"].map((benefit) => (
              <div key={benefit} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Button className="w-full" type="button" onClick={() => { onClose(); window.location.assign("/subscription"); }}>
            Start Subscription
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
