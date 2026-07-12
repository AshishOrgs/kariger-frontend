import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { subscriptionApi } from "@/services/modules";
import { formatCurrency } from "@/utils/cn";

const planFeatures = {
  STARTER: [
    "2 Branches",
    "50 Repair Devices",
    "5 Active Staff Accounts",
    "Trial Enabled",
    "No Payment Required",
  ],
  GROWTH: [
    "Unlimited Branch locations context",
    "Up to 15 active staff accounts",
    "Custom branch landing portals",
    "Real-time technician workload graphs",
    "Automated estimates & email notifications",
    "QA Queues & custody handover logs",
    "Priority live chat support",
  ],
  ENTERPRISE: [
    "Unlimited Branches & Staff members",
    "Dedicated database clusters & SSL endpoints",
    "Whitelabel customized client portals",
    "API access & webhooks integrations",
    "24/7 account manager & phone support",
    "Custom SLA guidelines",
  ],
};

function trialButtonLabel(plan) {
  if (plan.plan === "STARTER") return "Start Starter Trial";
  return `Start ${plan.trialDays || 14}-Day Trial`;
}

function planPrice(plan) {
  if (plan.monthlyPrice === null || plan.monthlyPrice === undefined) return "Custom";
  return formatCurrency(plan.monthlyPrice);
}

export function PlanSelection() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { updateSubscription } = useAuth();
  const subscriptionQuery = useQuery({
    queryKey: ["subscription-current"],
    queryFn: subscriptionApi.current,
  });
  const planOptions = useMemo(
    () => subscriptionQuery.data?.data?.planOptions || [],
    [subscriptionQuery.data]
  );

  const trialMutation = useMutation({
    mutationFn: subscriptionApi.startTrial,
    onSuccess: (response) => {
      updateSubscription(response.data.subscription);
      queryClient.invalidateQueries({ queryKey: ["subscription-current"] });
      toast.success("Trial started. Your workspace is ready.");
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to start trial.");
    },
  });

  return (
    <div>
      <PageHeader
        title="Choose Your Plan"
        description="Select a trial plan to unlock your KARIGER workspace."
      />

      <QueryState
        isLoading={subscriptionQuery.isLoading}
        error={subscriptionQuery.error}
        isEmpty={planOptions.length === 0}
        emptyTitle="Plans unavailable"
        onRetry={subscriptionQuery.refetch}
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {planOptions.map((plan) => (
            <Card
              key={plan.plan}
              className={`relative flex min-h-[430px] flex-col overflow-hidden border-slate-200 ${
                plan.plan === "GROWTH" ? "border-2 border-[var(--primary)] shadow-md lg:-translate-y-1" : ""
              }`}
            >
              {plan.plan === "GROWTH" ? (
                <div className="absolute right-0 top-0 rounded-bl-lg bg-[var(--primary)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Most Popular
                </div>
              ) : null}

              <CardContent className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[var(--primary)]">
                    {plan.plan === "STARTER" ? <Sparkles className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                  </div>
                  <h3 className="mt-4 text-lg font-black text-slate-900">{plan.name}</h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">{plan.serviceName}</p>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">{planPrice(plan)}</span>
                    {plan.monthlyPrice !== null ? <span className="text-sm text-[var(--muted)]">/ mo</span> : null}
                  </div>

                  <hr className="my-6 border-slate-100" />

                  <ul className="space-y-3">
                    {(planFeatures[plan.plan] || []).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm leading-normal text-slate-600">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  className="mt-8 w-full"
                  disabled={trialMutation.isPending}
                  variant={plan.plan === "GROWTH" ? "primary" : "secondary"}
                  onClick={() => trialMutation.mutate({ plan: plan.plan })}
                >
                  {trialMutation.isPending ? "Starting..." : trialButtonLabel(plan)}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
