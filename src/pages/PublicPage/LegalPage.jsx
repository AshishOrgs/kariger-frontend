import { Link } from "react-router-dom";

const legalContent = {
  "privacy-policy": {
    title: "Privacy Policy",
    intro:
      "This placeholder Privacy Policy explains how Kariger may collect, use, and protect business and customer information.",
  },
  "terms-and-conditions": {
    title: "Terms & Conditions",
    intro:
      "These placeholder Terms & Conditions outline the expected use of the Kariger platform and related services.",
  },
  "cookie-policy": {
    title: "Cookie Policy",
    intro:
      "This placeholder Cookie Policy describes how cookies and similar technologies may be used to improve the product experience.",
  },
  "refund-policy": {
    title: "Refund Policy",
    intro:
      "This placeholder Refund Policy explains how subscription refunds and billing adjustments may be handled.",
  },
  "security-policy": {
    title: "Security Policy",
    intro:
      "This placeholder Security Policy summarizes the safeguards Kariger may use to protect repair, billing, and customer data.",
  },
};

const sections = [
  {
    title: "Overview",
    body: "This page contains placeholder content for the public Kariger website. It should be reviewed and replaced with final legal language before production use.",
  },
  {
    title: "Scope",
    body: "The policy applies to website visitors, trial users, repair businesses, staff members, and platform administrators using Kariger services.",
  },
  {
    title: "Data and Operations",
    body: "Kariger may process operational data such as customer records, repair tickets, inventory activity, staff assignments, estimates, billing records, and support requests.",
  },
  {
    title: "Contact",
    body: "For questions about this policy, contact the Kariger team through the support page or official contact channels.",
  },
];

export function LegalPage({ type }) {
  const page = legalContent[type] ?? legalContent["privacy-policy"];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] font-black text-white shadow-md shadow-blue-100">
              K
            </div>
            <span className="text-lg font-black tracking-tight bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] bg-clip-text text-transparent">
              KARIGER
            </span>
          </Link>
          <Link
            to="/contact"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition-colors hover:text-blue-700"
          >
            Contact
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
          Legal
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
          {page.title}
        </h1>
        <p className="mt-5 text-base leading-8 text-slate-600">{page.intro}</p>

        <div className="mt-10 space-y-5">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_16px_46px_rgba(15,23,42,0.06)]"
            >
              <h2 className="text-lg font-black text-slate-950">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-7 text-slate-700">
          Placeholder notice: this page is for design and navigation only. Final
          policy content should be prepared with appropriate legal review.
        </p>
      </main>
    </div>
  );
}
