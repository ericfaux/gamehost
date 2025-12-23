import type React from "react";
import { cn } from "../../lib/utils";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
};

export function Card({ children, className, as: Component = "div" }: CardProps) {
  return (
    <Component className={cn("bg-card border border-stroke shadow-card rounded-xl", className)}>
      {children}
    </Component>
  );
}
