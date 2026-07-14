import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Star } from "lucide-react";

const stories = [
  {
    name: "Amit Verma",
    role: "Owner",
    company: "Phone Repair Studio",
    stat: "38% Faster Repair Time",
    quote:
      "Kariger gives our front desk, technicians, and billing team one shared workflow. Repairs move faster because everyone knows the next step and customer updates are easier to manage.",
    gradient: "from-blue-600 to-cyan-500",
  },
  {
    name: "Neha Kulkarni",
    role: "Operations Lead",
    company: "Tech Care Services",
    stat: "+2 New Branches Opened",
    quote:
      "The multi-branch view makes daily operations much calmer. We can monitor technician load, inventory usage, and billing without calling each store for manual updates.",
    gradient: "from-slate-800 to-blue-600",
  },
  {
    name: "Rahul Mehta",
    role: "Managing Partner",
    company: "Device Lab India",
    stat: "24% Higher Technician Output",
    quote:
      "Kariger helped standardize our repair lifecycle from check-in to handover. The team spends less time chasing information and more time closing repairs with confidence.",
    gradient: "from-cyan-600 to-blue-700",
  },
];

const logos = [
  "Phone Repair",
  "Tech Care",
  "Mobile Hub",
  "Smart Fix",
  "Device Lab",
  "Gadget Point",
];

export function TestimonialsSection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.22 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      className="relative isolate overflow-hidden bg-white py-20 sm:py-24"
    >
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 -z-10 h-80 w-80 rounded-full bg-cyan-100/70 blur-3xl" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-600 ring-1 ring-blue-100">
            Customer Stories
          </p>
          <h2 className="mt-5 text-3xl font-black leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Trusted by Repair Businesses Across India
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            See how repair shops use Kariger to improve operations, reduce
            turnaround time, and scale with confidence.
          </p>
          <p className="mt-3 text-xs font-semibold text-slate-400">
            Representative customer stories for demonstration. Replace with real
            customer testimonials before production launch.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {stories.map((story, index) => (
            <article
              key={story.company}
              className={`group relative flex min-h-[24rem] flex-col overflow-hidden rounded-3xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.76))] p-6 shadow-[0_20px_64px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-blue-100 hover:shadow-[0_30px_92px_rgba(37,99,235,0.15),inset_0_1px_0_rgba(255,255,255,0.94)] ${
                visible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: `${index * 120}ms` }}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-100/80 blur-3xl opacity-70 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100" />
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

              <div className="relative flex items-start gap-4">
                <div
                  className={`grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br ${story.gradient} text-base font-black text-white shadow-[0_14px_32px_rgba(37,99,235,0.22)]`}
                >
                  {story.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-slate-950">
                      {story.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700 ring-1 ring-blue-100">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {story.role}
                  </p>
                  <p className="text-sm font-black text-slate-800">
                    {story.company}
                  </p>
                </div>
              </div>

              <div className="relative mt-6 flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>

              <p className="relative mt-5 text-[15px] font-medium leading-7 text-slate-700">
                “{story.quote}”
              </p>

              <div className="relative mt-auto pt-6">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm font-black text-blue-700 shadow-sm">
                  {story.stat}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/82 py-5 shadow-xl shadow-slate-900/[0.05] backdrop-blur-xl">
          <div className="testimonial-logo-track flex w-max items-center gap-4">
            {[...logos, ...logos].map((logo, index) => (
              <div
                key={`${logo}-${index}`}
                className="grid h-14 min-w-[10rem] place-items-center rounded-2xl border border-slate-200/70 bg-slate-50/80 px-6 text-xs font-black uppercase tracking-[0.18em] text-slate-400"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.78))] p-5 text-center shadow-[0_20px_64px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
          <div className="flex justify-center gap-1 text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-current" />
            ))}
          </div>
          <p className="mt-3 text-lg font-black text-slate-950">
            4.9/5 average customer satisfaction
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Trusted by repair businesses across India.
          </p>
        </div>
      </div>
    </section>
  );
}
