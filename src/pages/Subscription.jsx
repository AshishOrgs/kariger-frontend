import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  IndianRupee,
  Layers,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Form";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { subscriptionApi } from "@/services/modules";
import { cn, formatCurrency } from "@/utils/cn";

function formatDate(value) {
  if (!value) return "No expiry set";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const DURATION_LABELS = {
  30: "1 Month (30 days)",
  90: "3 Months (90 days)",
  180: "6 Months (180 days)",
  365: "1 Year (365 days)",
};

export function Subscription() {
  const toast = useToast();
  const { updateSubscription } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const subscriptionQuery = useQuery({
    queryKey: ["subscription-current"],
    queryFn: subscriptionApi.current,
  });

  const subscription = subscriptionQuery.data?.data?.subscription;
  const displaySubscription =
    subscription || {
      plan: null,
      status: "NOT_SELECTED",
      expiresAt: null,
      daysRemaining: null,
      metadata: null,
    };

  const planOptions = subscriptionQuery.data?.data?.planOptions || [];
  const durationOptions = subscriptionQuery.data?.data?.durationOptions || [30, 90, 180, 365];

  const currentPlanName = displaySubscription.plan || "STARTER";
  const [plan, setPlan] = useState(currentPlanName);
  const [durationDays, setDurationDays] = useState(30);

  const selectedPlan = useMemo(
    () => planOptions.find((option) => option.plan === plan) || planOptions[0],
    [plan, planOptions]
  );

  const price = selectedPlan ? selectedPlan.monthlyPrice * Math.max(1, Math.ceil(durationDays / 30)) : 0;
  const daysLeft = displaySubscription.daysRemaining;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isExpired = daysLeft !== null && daysLeft <= 0;
  const pendingRequest = displaySubscription.metadata?.paymentRequest;
  const isPendingApproval =
    pendingRequest?.status === "REQUESTED" || displaySubscription.status === "PENDING";

  useEffect(() => {
    if (subscription) updateSubscription(subscription);
  }, [subscription, updateSubscription]);

  const paymentMutation = useMutation({
    mutationFn: subscriptionApi.requestPayment,
    onSuccess: (response) => {
      if (response.data?.subscription) updateSubscription(response.data.subscription);
      queryClient.invalidateQueries({ queryKey: ["subscription-current"] });
      toast.success("Payment request prepared.");
      if (response.data?.whatsappUrl) {
        window.open(response.data.whatsappUrl, "_blank", "noopener,noreferrer");
      }
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Payment request failed.");
    },
  });

  const handlePay = () => {
    paymentMutation.mutate({ plan, durationDays });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription & Billing"
        description="Monitor active subscription validity, view quota usage, and request renewal or plan upgrades."
      />

      <QueryState
        isLoading={subscriptionQuery.isLoading}
        error={subscriptionQuery.error}
        isEmpty={!subscription}
        emptyTitle="Subscription unavailable"
        onRetry={subscriptionQuery.refetch}
      >
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr] items-start">
          {/* Current Plan Overview Card */}
          <div className="space-y-4">
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm bg-white">
              {/* Premium Plan Banner */}
              <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_left,#1e293b,#0f172a)] p-6 text-white">
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-400/30">
                        <Sparkles className="h-3.5 w-3.5" />
                        Current Plan
                      </span>
                      <StatusBadge status={displaySubscription.status} />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-white mt-1">
                      {displaySubscription.plan ? `${displaySubscription.plan} Plan` : "Starter Workspace"}
                    </h2>
                    <p className="text-xs text-slate-300">
                      {displaySubscription.plan === "GROWTH"
                        ? "Multi-branch shop management with complete team collaboration."
                        : displaySubscription.plan === "ENTERPRISE"
                        ? "Unlimited scale for enterprise franchises with high ticket quotas."
                        : "Essential repair intake, tracking, customer SMS, and billing."}
                    </p>
                  </div>

                  {/* Validity Pill */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 text-center min-w-[120px]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Validity</p>
                    <p className="mt-0.5 text-xl font-black text-white">
                      {daysLeft === null || daysLeft === undefined ? (
                        "Lifetime"
                      ) : isExpired ? (
                        <span className="text-rose-400">Expired</span>
                      ) : (
                        `${daysLeft} days`
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {daysLeft !== null && daysLeft > 0 ? "Remaining" : "Renew now"}
                    </p>
                  </div>
                </div>

                {/* Subtle Background Glow */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
              </div>

              {/* Smooth Metric Tiles Grid */}
              <CardContent className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SmoothMetricTile
                    icon={<Layers className="h-4 w-4 text-blue-600" />}
                    label="Active Plan"
                    value={displaySubscription.plan || "Not Selected"}
                    detail="Workspace tier"
                  />
                  <SmoothMetricTile
                    icon={<Clock className="h-4 w-4 text-indigo-600" />}
                    label="Status"
                    value={
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full inline-block",
                        displaySubscription.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      )}>
                        {displaySubscription.status}
                      </span>
                    }
                    detail="Account state"
                  />
                  <SmoothMetricTile
                    icon={<Calendar className="h-4 w-4 text-amber-600" />}
                    label="Expiry Date"
                    value={formatDate(displaySubscription.expiresAt)}
                    detail={daysLeft !== null && daysLeft > 0 ? `${daysLeft} days left` : "Inactive"}
                  />
                  <SmoothMetricTile
                    icon={<Zap className="h-4 w-4 text-emerald-600" />}
                    label="Free Devices"
                    value={
                      displaySubscription.trialDeviceLimit
                        ? `${displaySubscription.trialDevicesUsed || 0}/${displaySubscription.trialDeviceLimit}`
                        : "Paid Tier"
                    }
                    detail={displaySubscription.trialDeviceLimit ? "Quota used" : "Unlimited devices"}
                  />
                </div>

                {/* Pending Renewal Alert Banner */}
                {pendingRequest ? (
                  <div className="mt-4 rounded-xl border border-amber-200/80 bg-[linear-gradient(135deg,#fffdf5,#fef9ee)] p-4 text-amber-950 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
                          Subscription Request Pending
                        </p>
                      </div>
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-200">
                        {pendingRequest.paymentRequestId || pendingRequest.id}
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 font-medium">
                      <span>
                        {pendingRequest.serviceName} · {pendingRequest.durationDays} days validity
                      </span>
                      <span className="font-bold text-amber-950 text-sm">
                        {formatCurrency(pendingRequest.price)}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-amber-800/90 leading-relaxed">
                      Your request has been submitted to SuperAdmin. Your workspace will automatically activate upon payment confirmation.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Plan Perks Note */}
            <div className="rounded-xl border border-slate-200/60 bg-slate-50/80 p-4 text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                All Plans Include
              </p>
              <p className="text-slate-500">
                Repair intake tracking, customer SMS/WhatsApp updates, multi-technician job assignment, print receipt vouchers, inventory tracking, and full financial reports.
              </p>
            </div>
          </div>

          {/* Upgrade / Renewal Control Card */}
          <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[var(--primary)] font-bold">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    {displaySubscription.plan ? "Renew or Upgrade Plan" : "Choose Your Plan"}
                  </CardTitle>
                  <p className="text-[11px] text-slate-400">Select duration and request activation via WhatsApp</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Service Plan Selector */}
              <Field label={<span className="text-xs font-semibold text-slate-700">Service Plan</span>}>
                <Select
                  value={plan}
                  onChange={(event) => setPlan(event.target.value)}
                  className="h-9 text-xs rounded-xl bg-slate-50/50 border-slate-200"
                >
                  {planOptions.map((option) => (
                    <option key={option.plan} value={option.plan}>
                      {option.monthlyPrice === null
                        ? `${option.name} - Custom`
                        : `${option.name} - ${formatCurrency(option.monthlyPrice)}/month`}
                    </option>
                  ))}
                </Select>
              </Field>

              {/* Duration Pills / Selector */}
              {selectedPlan?.monthlyPrice !== null ? (
                <Field label={<span className="text-xs font-semibold text-slate-700">Subscription Duration</span>}>
                  <div className="grid grid-cols-2 gap-2">
                    {durationOptions.map((days) => {
                      const isSelected = durationDays === days;
                      return (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setDurationDays(days)}
                          className={cn(
                            "rounded-xl border p-2.5 text-left transition-all",
                            isSelected
                              ? "border-[var(--primary)] bg-blue-50/50 text-[var(--primary)] ring-1 ring-[var(--primary)]/30 font-bold shadow-2xs"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <p className="text-xs font-bold">{DURATION_LABELS[days] || `${days} days`}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatCurrency(selectedPlan.monthlyPrice * (days / 30))}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </Field>
              ) : null}

              {/* Payable Summary Box */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-slate-500">Payable Amount</span>
                  <span className="text-2xl font-black text-slate-900">
                    {selectedPlan?.monthlyPrice === null ? "Custom Quote" : formatCurrency(price)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/50 pt-2">
                  <span>{selectedPlan?.serviceName || plan}</span>
                  <span className="font-semibold text-slate-800">{durationDays} days validity</span>
                </div>

                {selectedPlan?.plan === "STARTER" ? (
                  <p className="text-[11px] text-slate-400">
                    Includes 2 branch locations and initial 50 repair tickets.
                  </p>
                ) : null}
              </div>

              {/* Single Clear Action Button */}
              <Button
                className="w-full h-10 text-xs font-bold gap-2 shadow-sm rounded-xl"
                disabled={paymentMutation.isPending || !selectedPlan}
                onClick={handlePay}
              >
                <Send className="h-4 w-4" />
                {paymentMutation.isPending
                  ? "Preparing Request..."
                  : isPendingApproval
                  ? "Re-send WhatsApp Request"
                  : displaySubscription.plan
                  ? `Renew Subscription · ${formatCurrency(price)}`
                  : `Start Subscription · ${formatCurrency(price)}`}
              </Button>

              <p className="text-center text-[10px] text-slate-400">
                Payment verified manually by SuperAdmin via UPI / Bank Transfer.
              </p>
            </CardContent>
          </Card>
        </div>
      </QueryState>
    </div>
  );
}

function SmoothMetricTile({ icon, label, value, detail }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition hover:bg-slate-50 hover:border-slate-200/80 shadow-2xs">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="grid h-6 w-6 place-items-center rounded-md bg-white border border-slate-100 shadow-2xs">
          {icon}
        </div>
      </div>
      <div className="text-sm font-bold text-slate-900 truncate">{value}</div>
      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{detail}</p>
    </div>
  );
}
