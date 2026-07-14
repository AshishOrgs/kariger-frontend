import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  Wrench,
  UserCheck,
  Package,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileSignature,
  ReceiptText,
  Star,
  Users,
  Smartphone,
  Sparkles,
  Menu,
  Timer,
  UserRound,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CONTACT_INFO } from "./ContactPage";

export function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeatureStep, setActiveFeatureStep] = useState("check-in");
  const [openPricingFaq, setOpenPricingFaq] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "SUPER_ADMIN") {
        navigate("/super-admin/businesses", { replace: true });
      } else if (user.role === "OWNER" && user.business?.subscription?.status === "NOT_SELECTED") {
        navigate("/plans", { replace: true });
      } else if (user.role === "OWNER" || user.role === "ADMIN") {
        navigate("/branch/portal", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const [billingPeriod, setBillingPeriod] = useState("monthly"); // monthly or yearly
  const formatRupees = (amount) =>
    `₹${Math.round(amount).toLocaleString("en-IN")}`;
  const getPlanPrice = (monthlyPrice) =>
    billingPeriod === "monthly"
      ? formatRupees(monthlyPrice)
      : formatRupees(monthlyPrice * 12 * 0.8);
  const getAnnualSavings = (monthlyPrice) =>
    formatRupees(monthlyPrice * 12 - monthlyPrice * 12 * 0.8);

  const repairWorkflowSteps = [
    {
      id: "check-in",
      label: "Customer Check-in",
      navLabel: "Check-in",
      kicker: "Intake",
      title: "Capture every customer and device detail at the counter.",
      description:
        "Create a repair ticket with customer details, device model, issue notes, intake photos, and shop custody status.",
      metric: "2 min",
      benefits: [
        "Customer history saved",
        "Device details captured",
        "Complete custody trail",
      ],
      proTip:
        "Use saved customer profiles to create repeat repair tickets in seconds.",
      screen: {
        title: "New Repair Ticket",
        status: "Intake",
        primary: "Rahul Sharma",
        secondary: "iPhone 15 Pro",
        rows: ["Customer profile linked", "IMEI recorded", "Issue notes added"],
        sideTitle: "Intake Quality",
        sideValue: "98%",
      },
      icon: Users,
    },
    {
      id: "estimate",
      label: "Estimate Approval",
      navLabel: "Estimate",
      kicker: "Approval",
      title: "Send clear estimates before committing inventory or labor.",
      description:
        "Add parts, labor, discounts, and approval status so every cost decision is visible before work starts.",
      metric: "₹2,850",
      benefits: [
        "Transparent repair cost",
        "Customer approval recorded",
        "Parts and labor aligned",
      ],
      proTip:
        "Send estimate approvals before technician work starts to avoid billing disputes.",
      screen: {
        title: "Estimate Approval",
        status: "Awaiting approval",
        primary: "₹2,850",
        secondary: "Screen + Labor",
        rows: ["Display assembly", "Technician labor", "Customer approved"],
        sideTitle: "Approval Rate",
        sideValue: "91%",
      },
      icon: FileSignature,
    },
    {
      id: "technician",
      label: "Assign Technician",
      navLabel: "Assign",
      kicker: "Ownership",
      title: "Route work to the right technician with context.",
      description:
        "Assign repairs by workload, skill, branch, and status so teams know exactly what needs attention.",
      metric: "Live",
      benefits: [
        "Faster technician assignment",
        "Clear work ownership",
        "Live workload visibility",
      ],
      proTip:
        "Balance assignments by current workload so priority tickets move first.",
      screen: {
        title: "Technician Assignment",
        status: "Assigned",
        primary: "Vikas Kumar",
        secondary: "Mobile specialist",
        rows: ["Skill match found", "Priority synced", "Owner notified"],
        sideTitle: "Bench Load",
        sideValue: "72%",
      },
      icon: UserCheck,
    },
    {
      id: "repair",
      label: "Repair",
      navLabel: "Repair",
      kicker: "Execution",
      title: "Track repair progress from bench to review.",
      description:
        "Keep status updates, technician notes, parts usage, and review checkpoints connected to the original ticket.",
      metric: "In progress",
      benefits: [
        "Live repair status",
        "Technician notes stored",
        "QA checkpoints visible",
      ],
      proTip:
        "Keep every status update inside the ticket so front desk and technicians stay aligned.",
      screen: {
        title: "Repair Progress",
        status: "In progress",
        primary: "Display replacement",
        secondary: "ETA 45 min",
        rows: ["Back panel opened", "Part installed", "QA pending"],
        sideTitle: "Completion",
        sideValue: "64%",
      },
      icon: Wrench,
    },
    {
      id: "inventory",
      label: "Inventory Used",
      navLabel: "Inventory",
      kicker: "Stock",
      title: "Deduct parts and surface low-stock alerts automatically.",
      description:
        "Connect used parts to tickets, reduce stock in real time, and flag critical inventory before it blocks repairs.",
      metric: "3 left",
      benefits: [
        "Parts usage tracked",
        "Low stock alerts",
        "Branch stock visibility",
      ],
      proTip:
        "Connect inventory usage to tickets so margin and stock stay accurate.",
      screen: {
        title: "Inventory Usage",
        status: "Low stock",
        primary: "Battery Stock",
        secondary: "Only 3 left",
        rows: ["Display used", "Battery reserved", "Reorder suggested"],
        sideTitle: "Stock Health",
        sideValue: "Low",
      },
      icon: Boxes,
    },
    {
      id: "billing",
      label: "Billing",
      navLabel: "Billing",
      kicker: "Revenue",
      title: "Create clean invoices and collect payments faster.",
      description:
        "Generate billing records, payment status, GST-ready summaries, and handover confirmation from one workflow.",
      metric: "Paid",
      benefits: [
        "GST invoice ready",
        "Payment status synced",
        "Clean revenue records",
      ],
      proTip:
        "Generate invoices from approved estimates to keep billing fast and consistent.",
      screen: {
        title: "Billing Summary",
        status: "Paid",
        primary: "₹4,250",
        secondary: "UPI received",
        rows: ["GST invoice created", "Payment linked", "Ledger updated"],
        sideTitle: "Collection",
        sideValue: "Paid",
      },
      icon: ReceiptText,
    },
    {
      id: "handover",
      label: "Handover",
      navLabel: "Handover",
      kicker: "Closure",
      title: "Close the ticket with a complete custody trail.",
      description:
        "Confirm pickup readiness, payment completion, and final handover details before the repaired device leaves the shop.",
      metric: "Done",
      benefits: [
        "Pickup readiness confirmed",
        "Customer notified",
        "Audit trail completed",
      ],
      proTip:
        "Close each repair with a final handover note for clean customer records.",
      screen: {
        title: "Repair Handover",
        status: "Ready for pickup",
        primary: "Device ready",
        secondary: "Customer notified",
        rows: ["Final QA passed", "Payment confirmed", "Handover logged"],
        sideTitle: "Ticket Status",
        sideValue: "Closed",
      },
      icon: CheckCircle2,
    },
  ];

  const featureCards = [
    {
      title: "Customer Management",
      desc: "Build long-term customer relationships with complete repair history and branch-ready context.",
      bullets: ["Customer Profiles", "Device Timeline", "Repeat Repairs"],
      icon: Users,
    },
    {
      title: "Device Intake",
      desc: "Capture every device detail at check-in so teams start with clean, reliable records.",
      bullets: ["Issue Notes", "IMEI & Model", "Custody Status"],
      icon: Smartphone,
    },
    {
      title: "Repair Workflow",
      desc: "Move each repair through a standardized workflow with clear visibility at every stage.",
      bullets: ["Status Pipeline", "QA Checkpoints", "Branch Visibility"],
      icon: Wrench,
    },
    {
      title: "Technician Assignment",
      desc: "Assign work with confidence using technician ownership, workload context, and live progress.",
      bullets: ["Workload Balance", "Technician Ownership", "Live Updates"],
      icon: UserCheck,
    },
    {
      title: "Inventory Control",
      desc: "Keep parts connected to repairs with stock usage, alerts, and branch-level inventory control.",
      bullets: ["Parts Tracking", "Low Stock Alerts", "Branch Stock"],
      icon: Package,
    },
    {
      title: "Estimates & Quotes",
      desc: "Create professional estimates with parts, labor, and approval flow before repair work begins.",
      bullets: ["Parts Estimate", "Labor Charges", "Customer Approval"],
      icon: FileSignature,
    },
    {
      title: "Billing & GST",
      desc: "Turn completed work into clean invoices with payment status and GST-ready billing records.",
      bullets: ["GST Invoices", "Payment Status", "Ledger Records"],
      icon: ReceiptText,
    },
    {
      title: "Reports & Analytics",
      desc: "Understand operational performance across repairs, revenue, technicians, and inventory.",
      bullets: ["Revenue Trends", "Repair Volume", "Team Output"],
      icon: BarChart3,
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      desc: "Perfect for independent repair shops",
      price: getPlanPrice(299),
      annualSavings: getAnnualSavings(299),
      groups: [
        {
          title: "Operations",
          icon: ClipboardCheck,
          features: ["Customer Intake", "Repair Tracking", "Inventory"],
        },
        {
          title: "Business",
          icon: ReceiptText,
          features: ["Billing", "GST Invoice", "Email Support"],
        },
      ],
      cta: "Start Free Trial",
      note: "No Credit Card Required",
      noteIcon: CheckCircle2,
      popular: false,
    },
    {
      name: "Growth",
      desc: "Best for growing repair businesses",
      price: getPlanPrice(399),
      annualSavings: getAnnualSavings(399),
      groups: [
        {
          title: "Operations",
          icon: ClipboardCheck,
          features: ["Multi-branch workflow", "Technician queues"],
        },
        {
          title: "Business",
          icon: ReceiptText,
          features: ["GST billing", "Customer approvals"],
        },
        {
          title: "Automation",
          icon: Sparkles,
          features: ["Status updates", "Handover reminders"],
        },
        {
          title: "Analytics",
          icon: BarChart3,
          features: ["Revenue trends", "Technician output"],
        },
        {
          title: "API",
          icon: Boxes,
          features: ["Integration ready"],
        },
        {
          title: "Priority Support",
          icon: UserCheck,
          features: ["Faster response"],
        },
      ],
      cta: "Start 14-Day Trial",
      note: "Most teams choose Growth",
      noteIcon: Star,
      popular: true,
    },
    {
      name: "Enterprise",
      desc: "For enterprise repair chains requiring dedicated infrastructure.",
      price: "Custom Solution",
      groups: [
        {
          title: "Scale",
          icon: Boxes,
          features: ["Unlimited Branches", "White Label"],
        },
        {
          title: "Infrastructure",
          icon: AlertTriangle,
          features: ["Dedicated Database", "API Integration"],
        },
        {
          title: "Support",
          icon: UserCheck,
          features: ["Priority Support", "Dedicated Success Manager"],
        },
      ],
      cta: "Contact Sales",
      note: "Built around your operating model",
      noteIcon: Sparkles,
      popular: false,
    },
  ];

  const trustStripItems = [
    "14-Day Free Trial",
    "No Credit Card Required",
    "Cancel Anytime",
    "Free Onboarding",
    "GST Ready",
  ];

  const comparisonRows = [
    ["Branches", "2", "Unlimited", "Unlimited"],
    ["Staff Accounts", "5", "15", "Unlimited"],
    ["Inventory", true, true, true],
    ["Repair Workflow", true, true, true],
    ["Billing", true, true, true],
    ["GST Invoice", true, true, true],
    ["Analytics", "Basic", "Advanced", "Custom"],
    ["API", false, true, true],
    ["White Label", false, false, true],
    ["Priority Support", false, true, true],
    ["Dedicated Infrastructure", false, false, true],
  ];

  const pricingFaqs = [
    {
      question: "Can I upgrade anytime?",
      answer:
        "Yes. You can move from Starter to Growth as your repair volume, staff, or branch count increases.",
    },
    {
      question: "Do you provide onboarding?",
      answer:
        "Yes. Kariger includes guided onboarding so your team can set up branches, staff, services, and workflows quickly.",
    },
    {
      question: "Can I migrate existing data?",
      answer:
        "Yes. Customer, repair, inventory, and billing data can be migrated during onboarding depending on your current format.",
    },
    {
      question: "Is GST billing supported?",
      answer:
        "Yes. GST-ready invoices and billing records are supported across paid plans.",
    },
    {
      question: "Can I add more branches later?",
      answer:
        "Yes. Kariger is designed to scale from one shop to multi-branch repair operations.",
    },
    {
      question: "How does the free trial work?",
      answer:
        "Start the trial without a credit card, explore the workflow, and upgrade when you are ready to run live operations.",
    },
  ];

  const heroMetrics = [
    { value: "50K+", label: "Repairs Managed" },
    { value: "99.9%", label: "System Uptime" },
    { value: "4.9★", label: "Customer Rating" },
    { value: "24/7", label: "Support" },
  ];

  const floatingCards = [
    {
      className: "hero-card-ticket left-2 top-8 sm:left-0 lg:-left-4",
      delay: "0s",
      icon: ClipboardList,
      tone: "blue",
      eyebrow: "New Repair Ticket",
      title: "iPhone 15 Pro",
      detail: "Customer",
      value: "Rahul Sharma",
      meta: "Just Now",
    },
    {
      className: "hero-card-estimate right-4 top-3 sm:right-10 lg:right-16",
      delay: ".8s",
      icon: CheckCircle2,
      tone: "green",
      eyebrow: "Estimate Approved",
      title: "₹2,850",
      detail: "Customer Approved",
      value: "Green Success State",
      meta: "Approved",
    },
    {
      className: "hero-card-technician -left-1 bottom-28 sm:left-8 lg:left-0",
      delay: "1.4s",
      icon: UserRound,
      tone: "cyan",
      eyebrow: "Technician Assigned",
      title: "Vikas Kumar",
      detail: "Repair Started",
      value: "Workflow Active",
      meta: "Assigned",
    },
    {
      className: "hero-card-inventory right-2 bottom-36 sm:right-4 lg:-right-1",
      delay: "2.1s",
      icon: AlertTriangle,
      tone: "orange",
      eyebrow: "Inventory Alert",
      title: "Battery Stock Low",
      detail: "Only 3 Left",
      value: "Reorder Suggested",
      meta: "Warning",
    },
    {
      className: "hero-card-payment left-10 bottom-2 sm:left-24 lg:left-28",
      delay: "2.7s",
      icon: CreditCard,
      tone: "green",
      eyebrow: "Payment Received",
      title: "₹4,250",
      detail: "UPI Success",
      value: "Invoice Closed",
      meta: "Success",
    },
    {
      className: "hero-card-completed right-8 bottom-8 sm:right-20 lg:right-28",
      delay: "3.3s",
      icon: CheckCircle2,
      tone: "blue",
      eyebrow: "Repair Completed",
      title: "Ready for Pickup",
      detail: "Blue Success Card",
      value: "Customer Notified",
      meta: "Done",
    },
  ];

  const toneClasses = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    cyan: "bg-cyan-50 text-cyan-600 ring-cyan-100",
    green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    orange: "bg-orange-50 text-orange-600 ring-orange-100",
  };

  const activeWorkflowStep =
    repairWorkflowSteps.find((step) => step.id === activeFeatureStep) ??
    repairWorkflowSteps[0];
  const ActiveWorkflowIcon = activeWorkflowStep.icon;
  const activeWorkflowIndex = repairWorkflowSteps.findIndex(
    (step) => step.id === activeWorkflowStep.id
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] grid place-items-center text-white font-black shadow-md shadow-blue-100">
              K
            </div>
            <span className="text-lg font-black tracking-tight bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] bg-clip-text text-transparent">
              KARIGER
            </span>
          </Link>

          <nav className="hidden gap-6 md:flex text-sm font-semibold text-slate-500">
            <a
              href="#features"
              className="transition-colors hover:text-slate-900"
            >
              Features
            </a>
            <a
              href="#workflow"
              className="transition-colors hover:text-slate-900"
            >
              Workflow
            </a>
            <a
              href="#pricing"
              className="transition-colors hover:text-slate-900"
            >
              Pricing
            </a>
            <Link
              to="/contact"
              className="transition-colors hover:text-slate-900"
            >
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/branch/portal">
                <Button className="h-10 text-xs font-bold gap-1 shadow-md shadow-blue-200">
                  Go to Portal
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button className="h-10 text-xs font-bold px-4 shadow-md shadow-blue-200">
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 md:hidden transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-4 py-4 shadow-lg md:hidden animate-in fade-in slide-in-from-top-5 duration-200">
            <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-600">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Features
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Workflow
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Pricing
              </a>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Contact
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="hero-premium relative isolate overflow-hidden bg-[#F8FAFC] pt-16 pb-10 sm:pt-20 lg:pt-24">
        <div className="hero-grid-bg absolute inset-0 -z-20" />
        <div className="hero-noise absolute inset-0 -z-10 opacity-[0.05]" />
        <div className="hero-glow hero-glow-primary absolute -left-28 top-10 -z-10 h-96 w-96 rounded-full blur-3xl" />
        <div className="hero-glow hero-glow-accent absolute right-[-12rem] top-24 -z-10 h-[34rem] w-[34rem] rounded-full blur-3xl" />
        <div className="absolute left-1/2 top-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200/20 blur-[110px]" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-8">
          <div className="hero-fade-in text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/75 px-4 py-2 text-xs font-extrabold text-blue-700 shadow-sm shadow-blue-100/60 backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
              Modern Multi-Branch Repair ERP
            </div>

            <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.02] text-[#0F172A] sm:text-5xl lg:max-w-xl lg:text-6xl">
              Run Every Repair Shop From One Intelligent Platform.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg lg:mx-0">
              Manage customer intake, repair workflow, technician assignments,
              inventory, estimates, billing, invoicing, and handover from a
              single cloud platform built for modern repair businesses.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link to="/login" className="w-full sm:w-auto">
                <Button className="hero-button h-12 w-full rounded-xl border-[#2563EB] bg-[#2563EB] px-6 text-sm font-extrabold shadow-xl shadow-blue-500/20 hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-100 sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact" className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  className="hero-button h-12 w-full rounded-xl border-slate-200 bg-white/85 px-6 text-sm font-extrabold text-slate-900 shadow-lg shadow-slate-200/70 backdrop-blur-xl hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-white sm:w-auto"
                >
                  Book Live Demo
                </Button>
              </Link>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 lg:justify-start">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              No Credit Card Required • Setup in Minutes
            </div>
          </div>

          <div className="hero-fade-in hero-fade-in-delay relative mx-auto min-h-[360px] w-full max-w-[720px] overflow-hidden sm:min-h-[560px] sm:overflow-visible lg:min-h-[620px]">
            <div className="absolute inset-x-8 top-10 h-64 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="hero-laptop relative mx-auto mt-8 w-full max-w-[40rem] origin-center px-1 sm:mt-8 sm:max-w-none sm:px-0 lg:translate-x-6">
              <img
                src="/assets/hero/hero-kariger-dashboard-laptop.webp"
                alt="Kariger repair ERP dashboard displayed on a laptop"
                className="h-auto w-full select-none drop-shadow-[0_34px_70px_rgba(15,23,42,0.22)]"
                draggable="false"
              />
            </div>

            <img
              src="/assets/hero/hero-technician-mobile.webp"
              alt="Kariger technician mobile repairs screen"
              className="hero-phone absolute bottom-10 right-5 block w-[4.7rem] rounded-[1.35rem] shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/10 sm:bottom-0 sm:left-4 sm:right-auto sm:w-28 sm:rounded-[2rem] lg:left-8 lg:w-36"
              draggable="false"
            />

            {floatingCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.eyebrow}
                  className={`hero-floating-card absolute hidden w-[13.5rem] rounded-2xl border border-white/70 bg-white/72 p-3 text-left shadow-2xl shadow-slate-900/10 backdrop-blur-2xl ring-1 ring-slate-900/5 sm:block ${card.className}`}
                  style={{ animationDelay: card.delay }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${toneClasses[card.tone]}`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[11px] font-extrabold text-slate-500">
                          {card.eyebrow}
                        </p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">
                          {card.meta}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-black text-[#0F172A]">
                        {card.title}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        {card.detail}
                      </p>
                      <p className="truncate text-xs font-extrabold text-slate-700">
                        {card.value}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-700 shadow-xl shadow-slate-900/10 backdrop-blur-2xl ring-1 ring-slate-900/5 sm:hidden">
              <Timer className="h-4 w-4 text-blue-600" />
              Live repair operations
            </div>
          </div>
        </div>

        <div className="hero-fade-in mx-auto mt-8 max-w-7xl px-4 sm:mt-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/70 bg-slate-200/70 shadow-xl shadow-slate-900/5 md:grid-cols-4">
            {heroMetrics.map((metric) => (
              <div
                key={metric.label}
                className="bg-white/78 px-5 py-6 text-center backdrop-blur-xl"
              >
                <p className="text-2xl font-black text-[#0F172A] sm:text-3xl">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Workflow */}
      <section
        id="features"
        className="features-premium relative isolate overflow-hidden bg-white py-20 sm:py-24"
      >
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="absolute left-[-10rem] top-24 -z-10 h-80 w-80 rounded-full bg-blue-100/55 blur-3xl" />
        <div className="absolute right-[-12rem] bottom-16 -z-10 h-96 w-96 rounded-full bg-cyan-100/55 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">
              Why Repair Businesses Choose Kariger
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-[#0F172A] sm:text-4xl lg:text-5xl">
              Everything Required to Run Your Repair Business
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Manage customer intake, repair workflow, technician assignment,
              inventory, billing, invoicing, and handover from one connected
              platform.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-6xl">
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-2 shadow-2xl shadow-slate-900/10">
              <div className="flex h-11 items-center justify-between border-b border-slate-200/70 px-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="hidden h-6 w-72 rounded-full border border-slate-200 bg-slate-50 text-center text-[11px] font-bold leading-6 text-slate-400 sm:block">
                  app.kariger.com/workflow
                </div>
                <div className="h-6 w-16 rounded-full bg-blue-50" />
              </div>
              <div className="overflow-hidden rounded-b-[1.55rem] bg-slate-50">
                <img
                  src="/assets/features/feature-workflow-preview.webp"
                  alt="Kariger workflow product preview"
                  className="aspect-[16/10] w-full object-cover object-left-top transition duration-700 hover:scale-[1.012]"
                  draggable="false"
                />
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature, index) => {
              return (
                <div
                  key={feature.title}
                  className="group relative rounded-[1.25rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200/90 hover:shadow-[0_20px_54px_rgba(37,99,235,0.12)] sm:rounded-[1.35rem] sm:p-6 md:flex md:min-h-[19rem] md:flex-col"
                >
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-blue-200/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-center justify-between gap-4">
                    <div className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-blue-100 bg-gradient-to-br from-white to-blue-50 px-3 text-xs font-black text-blue-700 shadow-sm ring-1 ring-slate-200/60 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:ring-blue-200">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                  </div>

                  <h3 className="mt-5 text-base font-black leading-tight text-[#0F172A] sm:text-lg">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
                    {feature.desc}
                  </p>

                  <ul className="mt-4 space-y-2 sm:mt-5 sm:space-y-2.5">
                    {feature.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-center gap-2 text-xs font-bold text-slate-700 sm:text-sm"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.08)]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-5 sm:pt-6 md:mt-auto">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 transition-colors group-hover:text-cyan-700 sm:text-sm">
                      Learn More
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      >
                        -&gt;
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Workflow Section */}
      <section
        id="workflow"
        className="relative isolate overflow-hidden bg-slate-50 py-20 sm:py-24"
      >
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="absolute left-1/2 top-24 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">
              Repair Lifecycle
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-[#0F172A] sm:text-4xl lg:text-5xl">
              How Every Repair Moves Through Kariger
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              From customer check-in to final handover, Kariger gives every
              branch a consistent process with clear ownership at each step.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-5xl overflow-x-auto pb-2">
            <div className="relative flex min-w-[720px] items-center justify-between rounded-3xl border border-white/70 bg-white/75 p-2 shadow-xl shadow-blue-950/[0.06] backdrop-blur-xl">
              <div className="absolute left-8 right-8 top-1/2 h-px -translate-y-1/2 bg-slate-200" />
              <div
                className="absolute left-8 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500"
                style={{
                  width: `calc((100% - 4rem) * ${
                    activeWorkflowIndex / (repairWorkflowSteps.length - 1)
                  })`,
                }}
              />
              {repairWorkflowSteps.map((step, index) => {
                const isActive = activeFeatureStep === step.id;
                const isComplete = index < activeWorkflowIndex;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveFeatureStep(step.id)}
                    className={`relative z-10 flex min-w-[5.75rem] flex-col items-center gap-2 rounded-2xl px-3 py-2 text-center transition-all duration-300 ${
                      isActive
                        ? "bg-blue-50 text-blue-700 shadow-lg shadow-blue-500/10"
                        : "text-slate-500 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full border text-[11px] font-black transition-all ${
                        isActive
                          ? "border-blue-500 bg-blue-600 text-white shadow-[0_0_0_6px_rgba(37,99,235,0.10)]"
                          : isComplete
                            ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                            : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="text-[11px] font-black">
                      {step.navLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-6">
            <div className="order-2 rounded-3xl border border-slate-200/80 bg-white/82 p-4 shadow-2xl shadow-slate-900/[0.06] backdrop-blur-xl sm:p-5 lg:order-1 lg:sticky lg:top-24 lg:flex lg:min-h-[38rem] lg:flex-col lg:p-5">
              <div className="mb-5 flex items-center justify-between px-1 lg:mb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Interactive Steps
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[#0F172A]">
                    Repair lifecycle
                  </h3>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                  {activeWorkflowStep.metric}
                </span>
              </div>

              <div className="overflow-x-auto pb-2 lg:flex-1 lg:overflow-visible lg:pb-0">
                <div className="grid min-w-[760px] grid-cols-7 gap-3 sm:min-w-0 lg:h-full lg:min-w-0 lg:grid-cols-1 lg:content-between lg:gap-0">
                {repairWorkflowSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = activeFeatureStep === step.id;
                  const isComplete = index < activeWorkflowIndex;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveFeatureStep(step.id)}
                      className={`group relative flex min-h-[8.75rem] flex-col items-start justify-between rounded-3xl border p-3 text-left transition-all duration-300 lg:min-h-0 lg:flex-row lg:items-center lg:gap-4 lg:rounded-2xl lg:border-transparent lg:p-3 ${
                        isActive
                          ? "border-blue-200 bg-blue-50/90 shadow-[0_16px_44px_rgba(37,99,235,0.14)] ring-1 ring-blue-100"
                          : "border-slate-200/70 bg-white/65 hover:border-blue-100 hover:bg-white hover:shadow-md hover:shadow-slate-900/[0.05] lg:bg-transparent"
                      }`}
                    >
                      <span className="flex w-full items-start justify-between gap-2 lg:relative lg:w-auto">
                        <span
                          aria-hidden="true"
                          className={`absolute left-[1.125rem] top-11 hidden h-[calc(100%+0.5rem)] w-px lg:block ${
                            index === repairWorkflowSteps.length - 1
                              ? "bg-transparent"
                              : isComplete
                                ? "bg-gradient-to-b from-blue-500 to-cyan-400"
                                : "bg-slate-200"
                          }`}
                        />
                        <span
                          className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition-all lg:h-9 lg:w-9 ${
                            isActive
                              ? "border-blue-200 bg-white text-blue-600 shadow-[0_0_0_7px_rgba(37,99,235,0.10)]"
                              : isComplete
                                ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                : "border-slate-200 bg-white/80 text-slate-500 group-hover:text-blue-600"
                          }`}
                        >
                          {isComplete ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black lg:hidden ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </span>
                      <span className="min-w-0 lg:flex-1">
                        <span
                          className={`mb-1 hidden text-[10px] font-black uppercase tracking-[0.18em] lg:block ${
                            isActive ? "text-blue-600" : "text-slate-400"
                          }`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`block text-xs font-black leading-snug transition-colors lg:text-sm ${
                            isActive ? "text-[#0F172A]" : "text-slate-700"
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="mt-1 block text-[11px] font-semibold text-slate-500">
                          {step.kicker}
                        </span>
                      </span>
                      <ChevronRight
                        className={`hidden h-4 w-4 shrink-0 transition-all lg:block ${
                          isActive
                            ? "translate-x-0 text-blue-600 opacity-100"
                            : "-translate-x-1 text-slate-300 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                        }`}
                      />
                    </button>
                  );
                })}
                </div>
              </div>
            </div>

            <div className="sticky top-20 z-10 order-1 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-2xl shadow-slate-900/[0.07] sm:p-8 lg:static lg:order-2 lg:min-h-[38rem]">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-200/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl" />
              <div className="flex flex-col">
                <div className="max-w-xl">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-700 ring-1 ring-blue-100">
                    {activeWorkflowStep.kicker}
                  </span>
                  <h3 className="mt-4 text-2xl font-black leading-tight text-[#0F172A] sm:text-3xl">
                    {activeWorkflowStep.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                    {activeWorkflowStep.description}
                  </p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    {activeWorkflowStep.benefits.map((benefit) => (
                      <div
                        key={benefit}
                        className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm"
                      >
                        <Check className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-sm text-slate-700">
                    <span className="font-black text-cyan-700">Pro Tip: </span>
                    {activeWorkflowStep.proTip}
                  </div>
                </div>
              </div>

              <div
                key={activeWorkflowStep.id}
                className="hero-fade-in mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-2xl shadow-blue-950/[0.06]"
              >
                <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-black text-slate-400">
                    Repair RPR-10028
                  </span>
                </div>

                <div className="bg-[linear-gradient(135deg,#f8fafc,#ffffff_45%,#ecfeff)] p-4 sm:p-5">
                  <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-3xl border border-slate-200 bg-white/88 p-4 shadow-lg shadow-slate-900/[0.05]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                            {activeWorkflowStep.screen.title}
                          </p>
                          <h4 className="mt-3 text-2xl font-black leading-tight text-[#0F172A]">
                            {activeWorkflowStep.screen.primary}
                          </h4>
                          <p className="mt-1 text-sm font-bold text-slate-500">
                            {activeWorkflowStep.screen.secondary}
                          </p>
                        </div>
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                          <ActiveWorkflowIcon className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
                          style={{
                            width: `${
                              ((activeWorkflowIndex + 1) /
                                repairWorkflowSteps.length) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <div className="mt-5 space-y-2">
                        {activeWorkflowStep.screen.rows.map((row) => (
                          <div
                            key={row}
                            className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm"
                          >
                            <span className="font-bold text-slate-700">
                              {row}
                            </span>
                            <CheckCircle2 className="h-4 w-4 text-cyan-600" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white/88 p-4 shadow-lg shadow-slate-900/[0.05]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                            Ticket Summary
                          </p>
                          <p className="mt-2 text-sm font-black text-blue-700">
                            {activeWorkflowStep.screen.status}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                          Live Sync
                        </span>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        {[
                          ["Customer", "Rahul Sharma"],
                          ["Device", "iPhone 15 Pro"],
                          ["Technician", "Vikas Kumar"],
                          ["Stage", activeWorkflowStep.label],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-2xl bg-slate-50 p-3"
                          >
                            <p className="text-xs font-bold text-slate-400">
                              {label}
                            </p>
                            <p className="mt-1 font-black text-[#0F172A]">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 rounded-2xl bg-[#0F172A] p-4 text-white">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                          {activeWorkflowStep.screen.sideTitle}
                        </p>
                        <p className="mt-2 text-3xl font-black">
                          {activeWorkflowStep.screen.sideValue}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="relative isolate overflow-hidden border-y border-slate-200/40 bg-white py-20 sm:py-24"
      >
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-32 -z-10 h-80 w-80 rounded-full bg-cyan-100/70 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-600 ring-1 ring-blue-100">
              Pricing
            </h2>
            <p className="mt-5 text-3xl font-black leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Transparent Pricing That Grows With Your Business
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Choose a plan that fits your repair shop today and scales as your
              business expands.
            </p>

            {/* Billing Period Toggle */}
            <div className="mt-7 inline-flex rounded-full border border-slate-200 bg-slate-100 p-1 shadow-inner shadow-slate-900/[0.03]">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 ${
                  billingPeriod === "monthly"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 ${
                  billingPeriod === "yearly"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Yearly Billing (20% Off)
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="mt-14 grid items-stretch gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.14fr)_minmax(0,1fr)] lg:gap-7">
            {pricingPlans.map((plan, idx) => (
              <div
                key={plan.name}
                className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.72))] shadow-inner shadow-white/80 backdrop-blur-xl transition-all duration-300 ease-out before:pointer-events-none before:absolute before:inset-px before:rounded-[23px] before:border before:border-white/75 after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-32 after:w-32 after:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.96),transparent_62%)] hover:-translate-y-1 hover:bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(239,246,255,0.48))] ${
                  plan.popular
                    ? "border-blue-200 shadow-[0_30px_95px_rgba(37,99,235,0.20),0_0_0_1px_rgba(255,255,255,0.80)_inset] ring-1 ring-blue-100 hover:shadow-[0_34px_105px_rgba(37,99,235,0.26),0_0_0_1px_rgba(255,255,255,0.86)_inset]"
                    : "border-slate-200/70 shadow-[0_16px_50px_rgba(15,23,42,0.07),0_0_0_1px_rgba(255,255,255,0.72)_inset] hover:border-blue-100 hover:shadow-[0_25px_76px_rgba(37,99,235,0.12),0_0_0_1px_rgba(255,255,255,0.82)_inset]"
                }`}
              >
                {plan.popular && (
                  <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[linear-gradient(135deg,rgba(37,99,235,0.18),transparent_26%,rgba(6,182,212,0.14)_72%,transparent)] p-px" />
                )}
                <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-cyan-100/70 blur-3xl transition-transform duration-500 group-hover:translate-x-2 group-hover:translate-y-1 group-hover:scale-110" />
                <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-blue-100/50 blur-3xl opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
                {plan.popular && (
                  <div className="absolute right-5 top-5 rounded-full border border-white/80 bg-white/75 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-[0_10px_30px_rgba(37,99,235,0.18),0_0_0_1px_rgba(37,99,235,0.06)] backdrop-blur-xl">
                    Most Popular
                  </div>
                )}

                <div className="relative flex h-full flex-1 flex-col p-7 sm:p-8">
                  <div className="flex flex-1 flex-col">
                    <h3 className="text-2xl font-black tracking-tight text-slate-900">
                      {plan.name}
                    </h3>
                    <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">
                      {plan.desc}
                    </p>

                    <div className="mt-6 flex items-end gap-1.5">
                      <span
                        className={`font-black leading-none tracking-[-0.02em] text-slate-950 ${
                          plan.price === "Custom Solution"
                            ? "text-3xl"
                            : "text-5xl lg:text-[3.35rem]"
                        }`}
                      >
                        {plan.price}
                      </span>
                      {plan.price !== "Custom Solution" && (
                        <span className="pb-1 text-xs font-semibold text-slate-400">
                          / {billingPeriod === "monthly" ? "month" : "year"}
                        </span>
                      )}
                    </div>
                    {plan.annualSavings && billingPeriod === "yearly" && (
                      <p className="mt-2 text-xs font-bold text-emerald-700">
                        Save {plan.annualSavings} annually
                      </p>
                    )}

                    <hr className="my-6 border-slate-200/60" />

                    <div
                      className={`${
                        plan.popular
                          ? "grid gap-x-4 gap-y-5 sm:grid-cols-2"
                          : "space-y-5"
                      }`}
                    >
                      {plan.groups.map((group) => {
                        const GroupIcon = group.icon;
                        return (
                          <div key={group.title} className="relative">
                            <div className="mb-3 flex items-center gap-2.5">
                              <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/80 bg-white/70 text-blue-600 shadow-sm shadow-blue-950/[0.04] ring-1 ring-blue-100/80 backdrop-blur-md">
                                <GroupIcon className="h-4 w-4" />
                              </span>
                              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                                {group.title}
                              </p>
                            </div>
                            <ul className="space-y-2.5">
                              {group.features.map((feature) => (
                                <li
                                  key={feature}
                                  className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-slate-700"
                                >
                                  <Check className="mt-1 h-4 w-4 shrink-0 text-blue-600" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-auto pt-8">
                    <Link to="/login">
                      <Button
                        variant={plan.popular ? "primary" : "secondary"}
                        className={`h-12 w-full rounded-2xl text-sm font-black transition-all duration-300 active:translate-y-0 active:scale-[0.99] ${
                          plan.popular
                            ? "border-0 bg-[linear-gradient(135deg,#2563EB,#0EA5E9)] text-white shadow-[0_18px_36px_rgba(37,99,235,0.28),inset_0_1px_0_rgba(255,255,255,0.28)] hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_24px_48px_rgba(37,99,235,0.34),inset_0_1px_0_rgba(255,255,255,0.36)]"
                            : "border-slate-200/90 bg-white/78 text-slate-900 shadow-[0_12px_26px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md hover:-translate-y-1 hover:scale-[1.01] hover:border-blue-200 hover:bg-blue-50/45 hover:shadow-[0_18px_38px_rgba(37,99,235,0.13),inset_0_1px_0_rgba(255,255,255,0.95)]"
                        }`}
                      >
                        {plan.cta}
                        <span
                          aria-hidden="true"
                          className="transition-transform duration-300 group-hover:translate-x-1"
                        >
                          →
                        </span>
                      </Button>
                    </Link>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-slate-500">
                      <plan.noteIcon className="h-3.5 w-3.5 text-blue-500" />
                      <span>{plan.note}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200/80 bg-white/82 p-4 shadow-xl shadow-slate-900/[0.05] backdrop-blur-xl">
            <div className="grid gap-3 text-sm font-black text-slate-700 sm:grid-cols-2 lg:grid-cols-5">
              {trustStripItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                  Compare Plans
                </p>
                <h3 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
                  Plan capabilities at a glance
                </h3>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-600">
                Compare core operations, billing, analytics, support, and
                infrastructure across plans.
              </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/[0.06]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      {["Feature", "Starter", "Growth", "Enterprise"].map(
                        (heading) => (
                          <th key={heading} className="px-5 py-4">
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comparisonRows.map((row) => (
                      <tr
                        key={row[0]}
                        className="transition-colors hover:bg-blue-50/30"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={`${row[0]}-${cellIndex}`}
                            className={`px-5 py-4 ${
                              cellIndex === 0
                                ? "font-black text-slate-900"
                                : "font-semibold text-slate-600"
                            }`}
                          >
                            {typeof cell === "boolean" ? (
                              cell ? (
                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                              ) : (
                                <span className="text-slate-300">—</span>
                              )
                            ) : (
                              cell
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-4xl">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                FAQ
              </p>
              <h3 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
                Questions before you choose a plan?
              </h3>
            </div>
            <div className="mt-8 space-y-3">
              {pricingFaqs.map((faq, index) => {
                const isOpen = openPricingFaq === index;
                return (
                  <div
                    key={faq.question}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-950/[0.05]"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenPricingFaq(isOpen ? -1 : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="text-base font-black text-slate-900">
                        {faq.question}
                      </span>
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600 transition-transform duration-300 ${
                          isOpen ? "rotate-45" : ""
                        }`}
                      >
                        +
                      </span>
                    </button>
                    <div
                      className={`grid transition-all duration-300 ${
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="px-5 pb-5 text-sm leading-7 text-slate-600">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest">
              Customer Feedback
            </h2>
            <p className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Trusted by repair professionals worldwide
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-slate-200/60 shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-0.5 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "RepairFlow transformed our invoicing entirely. We no longer
                  lose track of which technician consumed screen assemblies or
                  how much labor charge was quoted."
                </p>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Vikram S.
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Owner, Bhilai Phone Care Hub
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/60 shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-0.5 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "The custom branch portals feature is fantastic! I was able to
                  customize branding for all 4 locations in under 10 minutes.
                  Our branch admins love landing on them."
                </p>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Aisha K.</h4>
                  <p className="text-[10px] text-slate-400">
                    Managing Director, TechRepair Group
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/60 shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-0.5 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "Workload graphs allow me to assign incoming tickets evenly.
                  Technicians are happier, turnaround times dropped by 30%, and
                  client trust is at an all-time high."
                </p>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">James L.</h4>
                  <p className="text-[10px] text-slate-400">
                    Operations Manager, QuickFix Network
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-slate-500 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] grid place-items-center text-white font-black">
              K
            </div>
            <span className="font-extrabold text-slate-800">KARIGER</span>
          </div>

          <p className="text-center text-slate-400">
            &copy; {new Date().getFullYear()} RepairFlow Inc. All rights
            reserved. Built for local repair shops & startup scales.
          </p>

          <div className="flex gap-4">
            <Link
              to="/contact"
              className="hover:text-slate-900 transition-colors font-bold"
            >
              Contact Support
            </Link>
            <a
              href={CONTACT_INFO.socials.linkedin}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors"
            >
              LinkedIn
            </a>
            <a
              href={CONTACT_INFO.socials.instagram}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors"
            >
              Instagram
            </a>
            <a
              href={CONTACT_INFO.socials.facebook}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors"
            >
              Facebook
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
