"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Library, ScanLine, Settings, Sparkle, Wrench, BarChart2, Bell, Search, Menu } from "@/components/icons";
import { createContext, useContext, useMemo, useState } from "react";
import { mockGames } from "@/lib/mockData";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";

const navItems = [
  { href: "/admin/library", label: "Library", icon: Library },
  { href: "/admin/sessions", label: "Sessions", icon: ScanLine },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export type Density = "cozy" | "compact";

const DensityContext = createContext<{ density: Density; toggle: () => void } | undefined>(undefined);

export function useDensity() {
  const ctx = useContext(DensityContext);
  if (!ctx) throw new Error("useDensity must be used within AppShell");
  return ctx;
}

export type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  tone?: "neutral" | "success" | "danger";
};

const ToastContext = createContext<{
  toasts: ToastMessage[];
  push: (toast: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within AppShell");
  return ctx;
}

export function AppShell({
  children,
  userVenues = []
}: {
  children: React.ReactNode;
  userVenues?: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const [density, setDensity] = useState<Density>("cozy");
  const [openMobile, setOpenMobile] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [venueId, setVenueId] = useState(userVenues[0]?.id ?? "");

  const toggleDensity = () => setDensity((prev) => (prev === "cozy" ? "compact" : "cozy"));

  const push = (toast: Omit<ToastMessage, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3400);
  };

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const filteredGames = useMemo(() => {
    if (!searchTerm) return [];
    return mockGames
      .filter((game) => game.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 6);
  }, [searchTerm]);

  return (
    <DensityContext.Provider value={{ density, toggle: toggleDensity }}>
      <ToastContext.Provider value={{ toasts, push, dismiss }}>
        <div className="min-h-screen grid lg:grid-cols-[260px_1fr] bg-noise">
          <aside
            className={cn(
              "border-r border-[color:var(--color-structure)] bg-[color:var(--color-surface)]/90 backdrop-blur-sm",
              openMobile ? "block" : "hidden lg:block",
            )}
          >
            <div className="p-5 flex items-center justify-between border-b border-[color:var(--color-structure)]">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[color:var(--color-ink-primary)] text-[color:var(--color-surface)] flex items-center justify-center font-serif text-xl shadow-token">
                  GH
                </div>
                <div>
                  <p className="text-xs tracking-rulebook uppercase text-ink-secondary">Service HUD</p>
                  <p className="font-semibold text-[color:var(--color-ink-primary)]">GameHost</p>
                </div>
              </div>
              <Button
                aria-label="Close menu"
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setOpenMobile(false)}
              >
                ✕
              </Button>
            </div>
            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all duration-150",
                      active
                        ? "bg-[color:var(--color-elevated)] shadow-card border-[color:var(--color-structure)]"
                        : "border-transparent hover:border-[color:var(--color-structure)] hover:bg-[color:var(--color-muted)]/60",
                    )}
                  >
                    <span
                      className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center border border-[color:var(--color-structure)]",
                        active ? "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]" : "bg-[color:var(--color-elevated)]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-[color:var(--color-ink-primary)]">{item.label}</p>
                      <p className="text-xs text-[color:var(--color-ink-secondary)]">{active ? "On shift" : "Navigate"}</p>
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 pb-6">
              <div className="rounded-xl border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] p-3 space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)]">
                  Density
                  <span className="px-2 py-1 rounded-full bg-[color:var(--color-muted)] text-[color:var(--color-ink-primary)] font-semibold text-[11px]">
                    {density === "cozy" ? "Cozy" : "Compact"}
                  </span>
                </div>
                <Button variant="secondary" size="sm" className="w-full" onClick={toggleDensity}>
                  Toggle spacing
                </Button>
              </div>
            </div>
          </aside>

          <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-30 border-b border-[color:var(--color-structure)] backdrop-blur-sm bg-[color:var(--color-surface)]/80">
              <div className="flex items-center gap-3 px-4 py-3">
                <Button
                  aria-label="Open menu"
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setOpenMobile(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
                  <Sparkle className="h-4 w-4 text-[color:var(--color-accent)]" />
                  <select
                    value={venueId}
                    onChange={(e) => setVenueId(e.target.value)}
                    className="bg-transparent text-sm font-semibold focus:outline-none"
                    aria-label="Select venue"
                  >
                    {userVenues.length === 0 ? (
                      <option value="" className="text-[color:var(--color-ink-primary)]">
                        No Venue Found
                      </option>
                    ) : (
                      userVenues.map((venue) => (
                        <option key={venue.id} value={venue.id} className="text-[color:var(--color-ink-primary)]">
                          {venue.name}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
                </div>
                <div className="flex-1 relative">
                  <Input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search games by title"
                    className="w-full pl-10"
                    aria-label="Search games"
                  />
                  <Search className="h-4 w-4 absolute left-3 top-3 text-[color:var(--color-ink-secondary)]" />
                  {searchTerm && (
                    <div className="absolute mt-2 w-full bg-[color:var(--color-elevated)] border border-[color:var(--color-structure)] rounded-xl shadow-card">
                      {filteredGames.length === 0 && (
                        <p className="px-4 py-3 text-sm text-[color:var(--color-ink-secondary)]">No matches</p>
                      )}
                      {filteredGames.map((game) => (
                        <div key={game.id} className="px-4 py-3 flex items-center justify-between hover:bg-[color:var(--color-muted)]/60">
                          <div>
                            <p className="font-semibold text-sm">{game.title}</p>
                            <p className="text-xs text-[color:var(--color-ink-secondary)]">{game.vibes.join(" · ")}</p>
                          </div>
                          <Link
                            href="/admin/library"
                            className="text-xs font-semibold text-[color:var(--color-accent)] underline"
                            onClick={() => setSearchTerm("")}
                          >
                            open
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" aria-label="Notifications">
                    <Bell className="h-5 w-5" />
                  </Button>
                  <div className="h-10 w-10 rounded-xl bg-[color:var(--color-accent-soft)] border border-[color:var(--color-structure)] flex items-center justify-center text-[color:var(--color-accent)] font-semibold">
                    AV
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 px-4 md:px-6 py-6 bg-rulebook-grid">
              <div className="max-w-6xl mx-auto space-y-4" data-density={density}>
                {children}
              </div>
            </main>
          </div>
        </div>
        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </ToastContext.Provider>
    </DensityContext.Provider>
  );
}

export function TokenChip({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" | "muted" | "warn" }) {
  const palette = {
    default: "bg-[color:var(--color-elevated)] border-[color:var(--color-structure)] text-[color:var(--color-ink-primary)]",
    accent: "bg-[color:var(--color-accent-soft)] border-[color:var(--color-accent)] text-[color:var(--color-accent)]",
    muted: "bg-[color:var(--color-muted)] border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)]",
    warn: "bg-[color:var(--color-warn)]/10 border-[color:var(--color-warn)]/20 text-[color:var(--color-warn)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-card",
        palette[tone],
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    in_rotation: { label: "In rotation", className: "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]" },
    out_for_repair: { label: "Out for repair", className: "bg-[color:var(--color-warn)]/10 text-[color:var(--color-warn)]" },
    retired: { label: "Retired", className: "bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)]" },
    for_sale: { label: "For sale", className: "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]" },
    available: { label: "Available", className: "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]" },
    in_use: { label: "In use", className: "bg-[color:var(--color-warn)]/10 text-[color:var(--color-warn)]" },
    maintenance: { label: "Maintenance", className: "bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]" },
  };

  const tone = map[status] ?? { label: status, className: "bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)]" };
  return <span className={cn("px-3 py-1 text-xs font-semibold rounded-full border border-[color:var(--color-structure)] whitespace-nowrap", tone.className)}>{tone.label}</span>;
}

export function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-[color:var(--color-structure-strong)] rounded-xl bg-[color:var(--color-muted)]/70 p-4 shadow-inner">
      <p className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)] mb-1">{title}</p>
      <p className="text-sm text-[color:var(--color-ink-primary)]">{children}</p>
    </div>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 space-y-3 z-50 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "panel-surface px-4 py-3 border-l-4",
            toast.tone === "success" && "border-l-[color:var(--color-success)]",
            toast.tone === "danger" && "border-l-[color:var(--color-danger)]",
            (!toast.tone || toast.tone === "neutral") && "border-l-[color:var(--color-accent)]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">{toast.title}</p>
              {toast.description && <p className="text-xs text-[color:var(--color-ink-secondary)] mt-1">{toast.description}</p>}
            </div>
            <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss" className="text-sm text-[color:var(--color-ink-secondary)]">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
