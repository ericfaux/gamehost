"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-primary text-card border border-ink-primary/30 shadow-token hover:-translate-y-0.5 hover:shadow-floating",
  secondary:
    "bg-card text-ink-primary border border-ink-primary/40 hover:bg-highlight shadow-card hover:-translate-y-0.5",
  ghost: "text-ink-primary border border-transparent hover:border-ink-primary/20 hover:bg-highlight",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-token px-4 py-2 text-sm font-semibold transition-transform duration-200",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = "Button";

export { Button };
