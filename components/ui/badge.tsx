import { cn } from "../../lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

type BadgeProps = {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
};

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-stroke/40 text-ink-primary border border-stroke",
  success: "bg-accent-secondary/15 text-accent-secondary border border-accent-secondary/40",
  warning: "bg-highlight text-ink-primary border border-stroke",
  danger: "bg-danger/10 text-danger border border-danger/30",
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-chit px-3 py-1 text-xs font-semibold tracking-wide",
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
