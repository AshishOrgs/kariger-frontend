import { useState } from "react";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Form";
import { authApi } from "@/services/modules";

const forgotSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export function ForgotPassword() {
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState("");
  const form = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function submit(values) {
    setMessage("");
    setResetToken("");
    try {
      const response = await authApi.forgotPassword({ email: values.email.trim() });
      setMessage("If an account exists for this email, a reset link has been generated.");
      if (response.data?.resetToken) setResetToken(response.data.resetToken);
    } catch (error) {
      form.setError("root", {
        message: error?.response?.data?.message || "Password reset request failed.",
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
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-black text-slate-900 tracking-tight">
            <KeyRound className="h-5 w-5 text-blue-600" />
            Forgot Password
          </CardTitle>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Account recovery & password reset
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
                placeholder="owner@shop.com"
                className="mt-1.5 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl text-xs h-11 shadow-sm"
                {...form.register("email")}
              />
            </Field>

            {form.formState.errors.root ? (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-semibold">
                {form.formState.errors.root.message}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700 font-semibold space-y-2">
                <p>{message}</p>
                {resetToken ? (
                  <Link
                    to={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                    className="mt-1 block break-all font-mono text-[11px] text-blue-700 underline"
                  >
                    Reset link: /reset-password?token={resetToken}
                  </Link>
                ) : null}
              </div>
            ) : null}

            <Button
              className="w-full h-11 text-xs font-black bg-[linear-gradient(135deg,#2563EB,#0EA5E9)] text-white border-none shadow-lg shadow-blue-500/25 hover:brightness-105 transition-all mt-4 rounded-xl cursor-pointer"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Sending..." : "Request Reset Link"}
            </Button>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-6 text-xs text-slate-500">
              <Link to="/login" className="font-bold text-[#2563EB] hover:underline">
                ← Back to login
              </Link>
              <Link to="/" className="hover:text-slate-900 transition-colors font-medium">
                Homepage
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
