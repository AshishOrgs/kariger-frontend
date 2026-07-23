import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/utils/cn";

export function Input({ className, ...props }) {
  const isPhoneField =
    props.autoComplete === "tel" ||
    ["phone", "mobile"].includes(String(props.name || "").toLowerCase());
  const type = isPhoneField ? "tel" : props.type;

  const handleKeyDown = (event) => {
    if (isPhoneField && !isAllowedPhoneKey(event)) {
      event.preventDefault();
    }

    if (props.type === "number" && ["e", "E", "+", "-"].includes(event.key)) {
      event.preventDefault();
    }

    props.onKeyDown?.(event);
  };

  const handleChange = (event) => {
    if (isPhoneField) {
      event.target.value = event.target.value.replace(/\D/g, "").slice(0, 12);
    }

    props.onChange?.(event);
  };

  const handleWheel = (event) => {
    if (props.type === "number") {
      event.preventDefault();
      event.currentTarget.blur();
    }

    props.onWheel?.(event);
  };

  return (
    <input
      className={cn("focus-ring h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm placeholder:text-slate-400", className)}
      {...props}
      type={type}
      inputMode={isPhoneField ? "numeric" : props.inputMode}
      minLength={isPhoneField ? 10 : props.minLength}
      maxLength={isPhoneField ? 12 : props.maxLength}
      pattern={isPhoneField ? "\\d{10,12}" : props.pattern}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onWheel={handleWheel}
    />
  );
}

export function PasswordInput({ className, buttonClassName, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        className={cn(
          "absolute inset-y-0 right-3 grid place-items-center text-slate-400 hover:text-slate-700",
          buttonClassName,
        )}
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function isAllowedPhoneKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return true;
  if (/^\d$/.test(event.key)) return true;

  return [
    "Backspace",
    "Delete",
    "Tab",
    "Escape",
    "Enter",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ].includes(event.key);
}

export function Select({ className, ...props }) {
  return <select className={cn("focus-ring h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm", className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn("focus-ring min-h-24 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm placeholder:text-slate-400", className)} {...props} />;
}

export function Field({ label, error, className, children }) {
  return (
    <label className={cn("block text-sm font-medium", className)}>
      {label}
      <div className="mt-1">{children}</div>
      {error ? <span className="text-xs text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}
