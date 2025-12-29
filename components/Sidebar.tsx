"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Play, Settings, Wrench } from "lucide-react";
import type React from "react";
import { cn } from "../lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
};

const navItems: NavItem[] = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/sessions", label: "Sessions", icon: Play },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-stroke bg-card/70 backdrop-blur-sm">
      <div className="px-6 py-5 border-b border-stroke flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-ink-primary text-card flex items-center justify-center font-serif text-xl shadow-token">
          GH
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-ledger text-ink-secondary">Operator</p>
          <p className="text-lg font-semibold text-ink-primary">GameHost</p>
        </div>
      </div>
      <nav className="p-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-token px-3 py-2 font-semibold transition-colors border border-transparent",
                active
                  ? "bg-card text-ink-primary border-stroke shadow-card"
                  : "text-ink-secondary hover:text-ink-primary hover:bg-highlight"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
