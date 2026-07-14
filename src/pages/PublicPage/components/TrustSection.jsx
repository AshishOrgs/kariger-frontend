import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";

const trustMetrics = [
  { target: 50, suffix: "K+", label: "Repairs Managed" },
  { target: 99.9, suffix: "%", decimals: 1, label: "System Uptime" },
  { target: 4.9, suffix: "★", decimals: 1, label: "Customer Rating" },
  { target: 24, suffix: "/7", label: "Priority Support" },
];

const trustHighlights = [
  {
    title: "GST Ready",
    description: "Generate clean GST-ready invoices for every completed repair.",
    icon: ReceiptText,
  },
  {
    title: "Role Based Access",
    description: "Give owners, admins, technicians, and staff the right controls.",
    icon: UserCheck,
  },
  {
    title: "Multi-Branch Support",
    description: "Run every branch with shared visibility and local ownership.",
    icon: Boxes,
  },
  {
    title: "Real-time Inventory",
    description: "Track parts usage, stock health, and low-stock alerts live.",
    icon: BarChart3,
  },
  {
    title: "Workflow Automation",
    description: "Move repairs through intake, estimate, repair, billing, and handover.",
    icon: Sparkles,
  },
  {
    title: "Secure Cloud Infrastructure",
    description: "Keep repair, customer, billing, and branch data protected.",
    icon: ShieldCheck,
  },
];

const analyticsRows = [
  ["Branch Revenue", "₹4.8L", "18%"],
  ["Repairs Closed", "1,248", "24%"],
  ["Inventory Alerts", "12", "Live"],
];

export function TrustSection() {
  const sectionRef = useRef(null);
  const [metricsVisible, setMetricsVisible] = useState(false);
  const [metricProgress, setMetricProgress] = useState(0);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMetricsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 }
    );

    observer.observe(node);
    const fallback = window.setTimeout(() => {
      setMetricsVisible(true);
      observer.disconnect();
    }, 900);

    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!metricsVisible) return undefined;

    let animationFrame;
    const start = performance.now();
    const duration = 1250;

    const animate = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setMetricProgress(eased);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [metricsVisible]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-slate-50 py-20 sm:py-24"
    >
      <div className="pointer-events-none absolute left-0 top-16 -z-10 h-80 w-80 rounded-full bg-blue-100/80 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 -z-10 h-96 w-96 rounded-full bg-cyan-100/80 blur-3xl" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-600 ring-1 ring-blue-100">
            Trusted Platform
          </p>
          <h2 className="mt-5 text-3xl font-black leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Why Repair Businesses Trust Kariger
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Thousands of repair operations rely on Kariger to streamline
            workflows, improve technician productivity, and deliver better
            customer experiences.
          </p>
        </div>

        <div className="mt-12 grid overflow-hidden rounded-3xl border border-white/80 bg-white/78 shadow-[0_24px_80px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
          {trustMetrics.map((metric) => (
            <div
              key={metric.label}
              className="relative border-b border-slate-200/60 p-6 text-center last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0"
            >
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
              <p className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 bg-clip-text text-4xl font-black tracking-[-0.04em] text-transparent sm:text-5xl">
                {(metric.target * metricProgress).toFixed(
                  metric.decimals ?? 0
                )}
                {metric.suffix}
              </p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trustHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-3xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.78))] p-6 shadow-[0_18px_54px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-[0_26px_82px_rgba(37,99,235,0.15),inset_0_1px_0_rgba(255,255,255,0.95)]"
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-cyan-100/80 blur-3xl opacity-70 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100" />
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                <div className="relative">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/80 bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600 shadow-[0_10px_24px_rgba(37,99,235,0.10)] ring-1 ring-blue-100/80 transition-transform duration-300 group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-black text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid items-center gap-6 rounded-[2rem] border border-white/80 bg-white/84 p-5 shadow-[0_26px_86px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr] lg:p-7">
          <div className="flex flex-col justify-center lg:pr-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
              Operations Visibility
            </p>
            <h3 className="mt-4 text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
              Every repair, branch, payment, and stock movement in one view.
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Kariger gives owners and managers a live operating picture without
              forcing teams to chase updates across notebooks, calls, or
              spreadsheets.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Live repair status", "Branch-level inventory", "GST billing", "Technician output"].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/72 px-3 py-2 text-sm font-bold text-slate-700 shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span>{item}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50 shadow-[0_24px_70px_rgba(37,99,235,0.12)]">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-blue-200/35 blur-3xl" />
            <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs font-black text-slate-400">
                Kariger Analytics
              </span>
            </div>

            <div className="relative bg-[linear-gradient(135deg,#f8fafc,#ffffff_46%,#ecfeff)] p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Revenue", "₹4.8L"],
                  ["Repairs", "1,248"],
                  ["SLA", "99.9%"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/80 bg-white/88 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                <div className="rounded-2xl border border-white/80 bg-white/88 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Repair Volume
                    </p>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                      Live
                    </span>
                  </div>
                  <div className="flex h-36 items-end gap-2">
                    {[46, 72, 54, 88, 64, 96, 78, 104].map((height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-400 shadow-sm shadow-blue-500/20 transition-all duration-700 ease-out"
                        style={{
                          height: metricsVisible ? height : 8,
                          transitionDelay: `${index * 85}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {analyticsRows.map(([label, value, status]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/80 bg-white/88 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-400">
                            {label}
                          </p>
                          <p className="mt-1 text-lg font-black text-slate-900">
                            {value}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                          {status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/72 p-4 shadow-[0_14px_34px_rgba(37,99,235,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <LockKeyhole className="h-5 w-5" />
                </span>
                <p className="text-sm font-bold text-slate-700">
                  Secure cloud reporting keeps branch performance visible while
                  protecting customer and repair data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
