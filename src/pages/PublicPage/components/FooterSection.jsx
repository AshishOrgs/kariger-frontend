import {
  Github,
  Instagram,
  Linkedin,
  Mail,
  Twitter,
  Youtube,
} from "lucide-react";
import { Link } from "react-router-dom";
import { CONTACT_INFO } from "../ContactPage";

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Workflow", href: "/#workflow" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Security", href: "/security-policy" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Center", href: "/contact" },
      { label: "Blog", href: "#" },
      { label: "About Us", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms-and-conditions" },
      { label: "Cookie Policy", href: "/cookie-policy" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Security Policy", href: "/security-policy" },
    ],
  },
];

const socialLinks = [
  { label: "LinkedIn", href: CONTACT_INFO.socials.linkedin, icon: Linkedin },
  { label: "Twitter/X", href: "#", icon: Twitter },
  { label: "Instagram", href: CONTACT_INFO.socials.instagram, icon: Instagram },
  { label: "YouTube", href: "#", icon: Youtube },
  { label: "GitHub", href: "#", icon: Github },
];

function FooterLink({ href, label, badge }) {
  const content = (
    <span className="group/link flex min-w-0 flex-col items-start gap-1 text-sm font-semibold text-slate-500 transition-colors duration-200 hover:text-slate-950">
      <span className="relative">
        {label}
        <span className="absolute -bottom-1 left-0 h-px w-0 bg-blue-600 transition-all duration-300 group-hover/link:w-full" />
      </span>
      {badge && (
        <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-blue-500">
          {badge}
        </span>
      )}
    </span>
  );

  if (href.startsWith("#")) {
    return <a href={href}>{content}</a>;
  }

  return <Link to={href}>{content}</Link>;
}

export function FooterSection() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-1/2 top-8 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100/80 blur-3xl" />
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,255,255,0.82)_48%,rgba(236,254,255,0.9))] p-8 text-center shadow-[0_28px_90px_rgba(37,99,235,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl sm:p-12">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">
            Get Started
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl lg:text-5xl">
            Ready to Modernize Your Repair Business?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Start your free trial today and manage your entire repair workflow
            from one intelligent platform.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB,#0EA5E9)] px-6 text-sm font-black text-white shadow-[0_18px_36px_rgba(37,99,235,0.28),inset_0_1px_0_rgba(255,255,255,0.28)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_24px_48px_rgba(37,99,235,0.34)] active:translate-y-0 active:scale-[0.99]"
            >
              Start Free Trial <span className="ml-2">→</span>
            </Link>
            <Link
              to="/contact"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200/90 bg-white/78 px-6 text-sm font-black text-slate-900 shadow-[0_12px_26px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50/45 hover:shadow-[0_18px_38px_rgba(37,99,235,0.13)]"
            >
              Book Live Demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative isolate overflow-hidden border-t border-slate-200/70 bg-[#F8FAFC] text-slate-800">
        <div className="pointer-events-none absolute left-0 top-0 -z-10 h-80 w-80 rounded-full bg-blue-100/90 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 -z-10 h-96 w-96 rounded-full bg-cyan-100/90 blur-3xl" />

        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-8 lg:grid-cols-[1.25fr_repeat(3,minmax(0,1fr))] lg:gap-8">
            <div className="col-span-2 lg:col-span-1">
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] text-lg font-black text-white shadow-lg shadow-blue-100">
                  K
                </div>
                <span className="text-xl font-black tracking-tight text-slate-950">
                  KARIGER
                </span>
              </Link>
              <p className="mt-5 max-w-xs text-sm leading-7 text-slate-600">
                Modern ERP platform for repair businesses.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target={social.href === "#" ? undefined : "_blank"}
                      rel={social.href === "#" ? undefined : "noreferrer"}
                      aria-label={social.label}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md hover:shadow-blue-100"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>

            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-950">
                  {column.title}
                </h3>
                <div className="mt-5 space-y-3.5">
                  {column.links.map((link) => (
                    <FooterLink key={link.label} {...link} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-6 rounded-3xl border border-slate-200/80 bg-white/82 p-5 shadow-[0_20px_64px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl lg:grid-cols-[1fr_0.72fr] lg:items-center">
            <div>
              <h3 className="text-lg font-black text-slate-950">
                Stay updated
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Product updates, workflow tips, and repair business insights.
              </p>
            </div>
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => event.preventDefault()}
            >
              <label className="relative flex-1">
                <span className="sr-only">Email address</span>
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:bg-blue-50/30 focus:shadow-md focus:shadow-blue-100"
                />
              </label>
              <button
                type="submit"
                className="h-12 rounded-2xl bg-[linear-gradient(135deg,#2563EB,#0EA5E9)] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(37,99,235,0.28)]"
              >
                Subscribe
              </button>
            </form>
          </div>

          <div className="mt-10 grid gap-4 border-t border-slate-200/80 pt-6 text-sm font-semibold text-slate-500 md:grid-cols-3 md:items-center">
            <p>© 2026 Kariger Technologies. All rights reserved.</p>
            <p className="text-left md:text-center">Made in India 🇮🇳</p>
            <p className="text-left md:text-right">Version 1.0</p>
          </div>
        </div>
      </footer>
    </>
  );
}
