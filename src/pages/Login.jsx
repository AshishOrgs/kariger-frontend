import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowRight, Loader2, LogIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, PasswordInput } from "@/components/ui/Form";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@/utils/permissions";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export function Login() {
  const { login, isAuthenticated, user, hasPermission } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      if (hasPermission(PERMISSIONS.SUPER_ADMIN_MANAGE)) {
        navigate("/super-admin/dashboard", { replace: true });
      } else if (
        hasPermission(PERMISSIONS.SUBSCRIPTION_MANAGE) &&
        user.business?.subscription?.status === "NOT_SELECTED"
      ) {
        navigate("/plans", { replace: true });
      } else if (hasPermission(PERMISSIONS.REPAIR_INTAKE, PERMISSIONS.SUBSCRIPTION_MANAGE)) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [hasPermission, isAuthenticated, user, navigate]);

  async function submit(values) {
    try {
      await login({
        email: values.email.trim(),
        password: values.password,
      });
    } catch (error) {
      const errorMsg = error?.response?.data?.message;
      const isInvalidCreds = errorMsg?.toLowerCase().includes("invalid credentials");

      form.setError("root", {
        message: isInvalidCreds
          ? "Invalid email or password. If you do not have an account, please contact your administrator."
          : errorMsg || "Failed to sign in. Please try again.",
      });
    }
  }

  return (
    <main className="hero-premium relative grid min-h-screen place-items-center px-4 py-12 overflow-hidden antialiased font-sans">
      {/* Background Ambience & Grid */}
      <div className="hero-grid-bg absolute inset-0 pointer-events-none" />
      <div className="hero-glow hero-glow-primary absolute -left-20 top-20 h-80 w-80 rounded-full blur-3xl pointer-events-none" />
      <div className="hero-glow hero-glow-accent absolute -right-20 bottom-20 h-96 w-96 rounded-full blur-3xl pointer-events-none" />

      <Card className="relative z-10 w-full max-w-md border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-2xl shadow-blue-500/10 rounded-2xl overflow-hidden p-3 sm:p-5">
        <CardHeader className="text-center pb-3 pt-4 border-b-0">
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
          <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome Back
          </CardTitle>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Login to your repair shop workspace
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <Field
              label={
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  Email Address
                </span>
              }
              error={form.formState.errors.email?.message}
            >
              <Input
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                className="mt-1.5 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-xs h-11 shadow-sm"
                {...form.register("email")}
              />
            </Field>

            <Field
              label={
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                    Password
                  </span>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              }
              error={form.formState.errors.password?.message}
            >
              <PasswordInput
                autoComplete="current-password"
                placeholder="••••••••"
                className="mt-1.5 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-xs h-11 shadow-sm"
                {...form.register("password")}
              />
            </Field>

            {form.formState.errors.root ? (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-semibold leading-normal">
                {form.formState.errors.root.message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="group relative w-full h-12 mt-5 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] font-medium text-white shadow-lg shadow-blue-500/25 transition-all duration-300 ease-out hover:bg-[position:right_center] hover:shadow-xl hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:transform-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
            >
              {/* Subtle top-edge glass bevel */}
              <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

              {/* Smooth light sweep sheen on hover */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full pointer-events-none" />

              {/* Button content */}
              <span className="relative flex h-full w-full items-center justify-center gap-2.5 px-4 text-sm font-semibold tracking-wide text-white">
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-white/90" />
                    <span>Signing in to workspace...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 opacity-85 transition-transform duration-300 group-hover:scale-110" />
                    <span>Login to Portal</span>
                    <ArrowRight className="h-4 w-4 opacity-80 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100" />
                  </>
                )}
              </span>
            </button>

            <div className="pt-4 border-t border-slate-100 mt-6 space-y-3 text-center">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-500 font-medium">New to Kariger?</span>
                <Link to="/signup" className="font-bold text-[#2563EB] hover:underline">
                  Owner Signup →
                </Link>
              </div>

              <div>
                <Link
                  to="/"
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors font-bold inline-flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-slate-100/80"
                >
                  <span>←</span> Back to homepage
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
