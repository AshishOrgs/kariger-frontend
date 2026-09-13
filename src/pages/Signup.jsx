import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, PasswordInput, Textarea } from "@/components/ui/Form";
import { authApi } from "@/services/modules";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().regex(/^\d{10,12}$/, "Mobile number must be 10 to 12 digits"),
  shopName: z.string().min(1, "Shop name is required"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export function Signup() {
  const navigate = useNavigate();
  const [success, setSuccess] = useState("");
  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      mobile: "",
      shopName: "",
      address: "",
      email: "",
      password: "",
    },
  });

  async function submit(values) {
    setSuccess("");
    try {
      await authApi.signup({
        name: values.name.trim(),
        mobile: values.mobile.trim(),
        shopName: values.shopName.trim(),
        address: values.address.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      setSuccess("Signup complete! Redirecting to login to choose your subscription plan...");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      form.setError("root", {
        message: error?.response?.data?.message || "Signup failed. Please check your details.",
      });
    }
  }

  return (
    <main className="hero-premium relative grid min-h-screen place-items-center px-4 py-10 overflow-hidden antialiased font-sans">
      {/* Background Ambience & Grid */}
      <div className="hero-grid-bg absolute inset-0 pointer-events-none" />
      <div className="hero-glow hero-glow-primary absolute -left-28 top-16 h-96 w-96 rounded-full blur-3xl pointer-events-none" />
      <div className="hero-glow hero-glow-accent absolute -right-28 bottom-16 h-[26rem] w-[26rem] rounded-full blur-3xl pointer-events-none" />

      <Card className="relative z-10 w-full max-w-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-2xl shadow-blue-500/10 rounded-2xl overflow-hidden p-3 sm:p-5">
        <CardHeader className="text-center pb-4 pt-3 border-b-0">
          <Link to="/" className="inline-flex items-center justify-center gap-2.5 mx-auto mb-3 hover:opacity-90 transition-opacity">
            <img
              src="/logo.png?v=3"
              alt="Kariger logo"
              className="h-10 w-10 rounded-xl border border-slate-200/80 bg-white object-contain p-1 shadow-md shadow-blue-100"
            />
            <span className="text-xl font-black tracking-tight bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] bg-clip-text text-transparent">
              KARIGER
            </span>
          </Link>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-black text-slate-900 tracking-tight">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Create Owner Account
          </CardTitle>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Set up your repair shop SaaS workspace in minutes
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
            <Field label="Owner name" error={form.formState.errors.name?.message}>
              <Input
                autoComplete="name"
                placeholder="Your full name"
                className="mt-1 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-xs h-11 shadow-sm"
                {...form.register("name")}
              />
            </Field>
            <Field label="Mobile number" error={form.formState.errors.mobile?.message}>
              <Input
                autoComplete="tel"
                placeholder="10 to 12 digit mobile"
                className="mt-1 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-xs h-11 shadow-sm"
                {...form.register("mobile")}
              />
            </Field>
            <Field label="Shop name" error={form.formState.errors.shopName?.message}>
              <Input
                autoComplete="organization"
                placeholder="e.g. Apex Repair Hub"
                className="mt-1 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-xs h-11 shadow-sm"
                {...form.register("shopName")}
              />
            </Field>
            <Field label="Email address" error={form.formState.errors.email?.message}>
              <Input
                type="email"
                autoComplete="email"
                placeholder="owner@shop.com"
                className="mt-1 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-xs h-11 shadow-sm"
                {...form.register("email")}
              />
            </Field>
            <Field label="Password" error={form.formState.errors.password?.message} className="md:col-span-2">
              <PasswordInput
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                className="mt-1 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-xs h-11 shadow-sm"
                {...form.register("password")}
              />
            </Field>
            <Field label="Shop address" error={form.formState.errors.address?.message} className="md:col-span-2">
              <Textarea
                placeholder="Full shop address, street, landmark, city"
                className="mt-1 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-xs shadow-sm min-h-[70px]"
                {...form.register("address")}
              />
            </Field>

            {form.formState.errors.root ? (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-semibold md:col-span-2">
                {form.formState.errors.root.message}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700 font-semibold md:col-span-2">
                {success}
              </div>
            ) : null}

            <Button
              className="h-11 text-xs font-black bg-[linear-gradient(135deg,#2563EB,#0EA5E9)] text-white border-none shadow-lg shadow-blue-500/25 hover:brightness-105 transition-all md:col-span-2 rounded-xl cursor-pointer"
              disabled={form.formState.isSubmitting}
            >
              <Building2 className="h-4 w-4" />
              {form.formState.isSubmitting ? "Creating workspace..." : "Create Owner Account"}
            </Button>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 md:col-span-2">
              <div>
                Already registered?{" "}
                <Link to="/login" className="font-bold text-[#2563EB] hover:underline">
                  Login to Portal
                </Link>
              </div>
              <div>
                <Link to="/" className="text-xs text-slate-500 hover:text-slate-900 transition-colors font-bold inline-flex items-center gap-1">
                  ← Homepage
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
