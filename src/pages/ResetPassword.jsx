import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, PasswordInput } from "@/components/ui/Form";
import { authApi } from "@/services/modules";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [message, setMessage] = useState("");
  const form = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function submit(values) {
    setMessage("");

    if (!token) {
      form.setError("root", {
        message: "Reset token is missing. Please request a new password reset link.",
      });
      return;
    }

    try {
      await authApi.resetPassword({ token, password: values.password });
      setMessage("Password reset successful. Redirecting to login...");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      form.setError("root", {
        message: error?.response?.data?.message || "Password reset failed.",
      });
    }
  }

  return (
    <main
      className="relative grid min-h-screen place-items-center px-4 py-12 bg-cover bg-center bg-no-repeat antialiased font-sans"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0f4c75 70%, #0d9488 100%)" }}
    >
      <div className="absolute inset-0 bg-slate-50/15 backdrop-blur-[1px]" />
      <Card className="relative z-10 w-full max-w-md border border-white/50 bg-white/75 backdrop-blur-xl shadow-2xl shadow-slate-200/50 rounded-2xl overflow-hidden p-2">
        <CardHeader className="text-center pb-2 pt-6 border-b-0">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-black bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] bg-clip-text text-transparent">
            <KeyRound className="h-5 w-5 text-[#1769aa]" />
            Reset Password
          </CardTitle>
          <p className="mt-1 text-xs font-semibold text-slate-500">Create a new account password</p>
        </CardHeader>
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <Field label="New password" error={form.formState.errors.password?.message}>
              <PasswordInput autoComplete="new-password" placeholder="At least 8 characters" {...form.register("password")} />
            </Field>
            <Field label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
              <PasswordInput autoComplete="new-password" placeholder="Repeat new password" {...form.register("confirmPassword")} />
            </Field>
            {form.formState.errors.root ? (
              <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-semibold">
                {form.formState.errors.root.message}
              </div>
            ) : null}
            {message ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700 font-semibold">
                {message}
              </div>
            ) : null}
            <Button
              className="w-full h-11 text-xs font-black bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] text-white border-none shadow-lg shadow-blue-200/50"
              disabled={form.formState.isSubmitting || !token}
            >
              {form.formState.isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
            <div className="text-center text-xs text-slate-500">
              <Link to="/forgot-password" className="font-bold text-[#1769aa] hover:underline">
                Request a new link
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
