"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, ...props }, ref) => (
    <label className="flex flex-col gap-2 text-sm text-ink-primary">
      {label && <span className="text-xs uppercase tracking-ledger text-ink-secondary">{label}</span>}
      <input
        ref={ref}
        className={cn(
          "w-full rounded-token border border-stroke bg-card/80 px-3 py-2 text-sm font-medium shadow-inner shadow-stroke/30 focus:border-ink-primary focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-ink-primary/10",
          className
        )}
        {...props}
      />
      {hint && <span className="text-xs text-ink-secondary">{hint}</span>}
    </label>
  )
);

Input.displayName = "Input";

export { Input };
