import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
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
    <main
      className="relative grid min-h-screen place-items-center px-4 py-12 bg-cover bg-center bg-no-repeat antialiased font-sans"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0f4c75 70%, #0d9488 100%)" }}
    >
      {/* Light Glassy Backdrop Overlay */}
      <div className="absolute inset-0 bg-slate-50/15 backdrop-blur-[1px]" />

      <Card className="relative z-10 w-full max-w-md border border-white/50 bg-white/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 rounded-2xl overflow-hidden p-2">
        <CardHeader className="text-center pb-2 pt-6 border-b-0">
          <Link to="/" className="inline-block mx-auto mb-3">
            <div className="h-11 w-11 rounded-2xl bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] grid place-items-center text-white font-black shadow-md shadow-blue-200/60 hover:scale-105 transition-transform">
              RF
            </div>
          </Link>
          <CardTitle className="text-2xl font-black bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Access the KARIGER Dashboard
          </p>
        </CardHeader>
        <CardContent className="p-6">
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
                className="mt-1.5 bg-white/80 border-slate-200/80 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-xs h-11"
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
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:underline"
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
                className="mt-1.5 bg-white/80 border-slate-200/80 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-xs h-11"
                {...form.register("password")}
              />
            </Field>

            {form.formState.errors.root ? (
              <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-semibold leading-normal">
                {form.formState.errors.root.message}
              </div>
            ) : null}

            <Button
              className="w-full h-11 text-xs font-black bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] text-white border-none shadow-lg shadow-blue-200/50 hover:brightness-95 transition-all mt-4 rounded-lg cursor-pointer"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Signing in..."
                : "Login to Portal"}
            </Button>

            <div className="pt-4 border-t border-slate-100/80 mt-6 text-center">
              <Link
                to="/"
                className="text-xs text-slate-500 hover:text-slate-900 transition-colors font-bold inline-flex items-center gap-1.5 py-1 px-3 rounded-md hover:bg-slate-100/60"
              >
                <span>←</span> Back to homepage
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
