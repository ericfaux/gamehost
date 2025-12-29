import * as React from "react";
import { cn } from "@/lib/utils";

const variantStyles = {
  primary:
    "bg-[color:var(--color-ink-primary)] text-[color:var(--color-surface)] shadow-token border border-[color:var(--color-ink-primary)] hover:-translate-y-0.5",
  secondary:
    "bg-[color:var(--color-elevated)] text-[color:var(--color-ink-primary)] border border-[color:var(--color-structure)] shadow-card hover:-translate-y-0.5",
  ghost:
    "bg-transparent text-[color:var(--color-ink-primary)] border border-transparent hover:border-[color:var(--color-structure)]",
  destructive:
    "bg-[color:var(--color-danger)] text-[color:var(--color-surface)] border border-[color:var(--color-danger)] shadow-token hover:-translate-y-0.5",
} as const;

const sizeStyles = {
  md: "px-4 py-2.5 text-sm",
  sm: "px-3 py-2 text-xs",
  lg: "px-5 py-3 text-sm",
  icon: "p-2",
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  pill?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", pill, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 font-semibold transition-transform duration-200 focus-ring",
          variantStyles[variant],
          sizeStyles[size],
          pill ? "rounded-full" : "rounded-token",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
