"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Coins, Hourglass, Crown } from "@/components/icons/lucide-react";
import { EarlyAccessForm } from "@/components/public/EarlyAccessForm";
import { RequestAccessDialog } from "@/components/public/RequestAccessDialog";
import { LandingFAQ } from "@/components/public/LandingFAQ";

type RequestType = "demo" | "pilot" | "host_inquiry";

const simulatorSteps = [
  {
    title: "Scan Table QR",
    description: "No app download, no login. Guest scans and your host stand sees the table go live — one less thing for staff to track.",
  },
  {
    title: "Pick in 2 Minutes",
    description: "BGG-powered wizard matches players to games fast. Less shelf-staring = more time (and rounds) at the table.",
  },
  {
    title: "Session & Feedback",
    description: "Timer runs, condition gets logged, and a quick prompt catches issues before they hit your reviews.",
  },
];

export default function LandingPage() {
  const [turnStage, setTurnStage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequestType, setSelectedRequestType] = useState<RequestType | null>(null);
  const currentStep = simulatorSteps[turnStage];

  const advanceTurn = () => {
    setTurnStage((prev) => (prev + 1) % simulatorSteps.length);
  };

  const handleOpenDialog = (type: RequestType) => {
    setSelectedRequestType(type);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRequestType(null);
  };

  return (
    <main className="flex-1">
      <section className="relative max-w-6xl mx-auto px-6 pt-12 pb-16 md:pt-16 md:pb-24">
        <div className="flex items-center justify-between border-b border-stroke pb-6 mb-8">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="GameLedger - Board game café management software logo"
              width={40}
              height={40}
              className="rounded-lg shadow-token"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-secondary">Edition 2025</p>
              <p className="text-lg font-semibold text-ink-primary">GameLedger Rulebook</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-ink-secondary">
            <Link className="hover:text-ink-primary transition-colors" href="#product">
              Product
            </Link>
            <Link className="hover:text-ink-primary transition-colors" href="#stats">
              Results
            </Link>
            <Link className="hover:text-ink-primary transition-colors" href="#comparison">
              Stat Sheet
            </Link>
            <Link className="hover:text-ink-primary transition-colors" href="#faq">
              FAQ
            </Link>
            <Link className="hover:text-ink-primary transition-colors" href="/blog">
              Blog
            </Link>
            <Link className="hover:text-ink-primary transition-colors" href="/calculator">
              Calculator
            </Link>
            <Link className="hover:text-accent transition-colors font-semibold text-accent" href="#early-access">
              Early Access
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-start">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.3em] text-ink-secondary">The Turn Sequence</p>
            <h1 className="text-4xl md:text-5xl leading-[1.05] font-serif text-ink-primary">
              Booked. Picked. Played.
            </h1>
            <p className="text-lg md:text-xl text-ink-secondary max-w-2xl leading-relaxed">
              Maximize revenue per table with the first OS built for board game cafés. From <strong>smart bookings</strong> to <strong>instant game discovery</strong> and <strong>automated inventory tracking</strong>, GameLedger turns operational chaos into a seamless guest experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={() => handleOpenDialog("demo")}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-ink-primary text-card font-semibold shadow-floating transition-transform duration-300 hover:-translate-y-0.5 border border-ink-primary"
              >
                Book a 15-minute demo
              </button>
              <button
                onClick={() => handleOpenDialog("pilot")}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-accent text-card font-semibold shadow-floating border border-ink-primary/5 transition-all duration-300 hover:-translate-y-0.5"
              >
                Start a pilot weekend
              </button>
            </div>
            <p className="text-sm text-ink-secondary max-w-2xl leading-relaxed">
              When guests pick games in 2 minutes instead of 20, they order more rounds. When staff aren&apos;t explaining rules, they&apos;re delivering hospitality. GameLedger is built to drive higher F&B spend and more return bookings.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -left-6 -right-6 -top-6 -bottom-6 border border-stroke rounded-3xl"></div>
            <div className="relative bg-card rounded-3xl shadow-floating p-6 border border-stroke overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs uppercase tracking-[0.25em] text-ink-secondary">Turn Simulator</div>
                <button
                  type="button"
                  onClick={advanceTurn}
                  className="px-3 py-2 rounded-full bg-accent text-card text-sm font-semibold shadow-token border border-ink-primary/10 transition-all duration-300 hover:-translate-y-0.5"
                >
                  Next Turn
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 rounded-2xl border border-stroke bg-surface shadow-card transition-all duration-500">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-mono text-ink-secondary">Step {turnStage + 1} / 3</span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brandTeal/10 text-brandTeal border border-brandTeal/30">
                      {currentStep.title}
                    </span>
                  </div>
                  <p className="text-ink-primary font-medium leading-relaxed">{currentStep.description}</p>
                </div>

                {turnStage === 0 && (
                  <div className="p-5 rounded-2xl border-2 border-dashed border-ink-secondary/30 bg-card shadow-card transition-all duration-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-ink-secondary">Table token</p>
                        <p className="text-xl font-serif text-ink-primary">Table 4 · QR Ready</p>
                      </div>
                      <button
                        className="px-4 py-3 rounded-xl bg-ink-primary text-card font-semibold shadow-token transition-transform duration-300 hover:-translate-y-0.5"
                        onClick={advanceTurn}
                        type="button"
                      >
                        Scan Table QR
                      </button>
                    </div>
                  </div>
                )}

                {turnStage === 1 && (
                  <div className="p-5 rounded-2xl border border-stroke bg-surface shadow-card transition-all duration-500">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm font-semibold text-ink-primary">Quick Wizard</p>
                      <span className="text-[10px] font-mono text-brandTeal bg-brandTeal/10 px-2 py-1 rounded border border-brandTeal/20">Linked to Booking #402</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm font-medium text-ink-primary">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-[0.2em] text-ink-secondary">Players</span>
                        <div className="rounded-xl border border-stroke px-3 py-2 bg-card shadow-inner shadow-stroke/20">2-4</div>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-[0.2em] text-ink-secondary">Time</span>
                        <div className="rounded-xl border border-stroke px-3 py-2 bg-card shadow-inner shadow-stroke/20">45-60m</div>
                      </label>
                      <div className="col-span-2 mt-1 p-2 rounded-xl border border-accent/30 bg-accent/5 flex items-center gap-3">
                        <Crown className="w-4 h-4 text-accent" />
                        <span className="text-xs text-ink-primary font-semibold">&ldquo;Scythe&rdquo; Reserved — Skipped the line</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-stroke flex items-center justify-end gap-1.5 opacity-60">
                      <span className="text-[10px] uppercase tracking-wider text-ink-secondary">Data via BoardGameGeek API</span>
                    </div>
                  </div>
                )}

                {turnStage === 2 && (
                  <div className="p-5 rounded-2xl border-2 border-brandTeal/50 bg-card shadow-floating transition-all duration-500">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-brandTeal text-card flex items-center justify-center font-serif text-2xl shadow-token">
                        ●
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-secondary">Session & Feedback</p>
                        <p className="text-xl font-serif text-ink-primary">Azul (Copy #2) → Table 4</p>
                        <p className="text-sm font-mono text-ink-secondary">Timer 00:42 · Condition logging · Feedback at end</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20 mhd:pb-24 bg-section-warm py-10 rounded-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-stroke"></div>
          <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">🎲 Chapter II</span>
          <div className="h-px flex-1 bg-stroke"></div>
        </div>
        <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
          <div className="space-y-4">
            <h2 className="text-3xl font-serif text-ink-primary">Friday Night? Smooth.</h2>
            <p className="text-lg text-ink-secondary leading-relaxed">
              Every minute a guest spends staring at shelves is a minute they&apos;re not ordering another round. Every staff interrupt is hospitality you&apos;re not delivering elsewhere. GameLedger turns chaos into revenue.
            </p>
            <ul className="space-y-3 text-ink-primary font-medium">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-accent"></span>
                Flip the ratio: Turn 20 minutes of shelf-staring into 2 minutes of picking and more time playing.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-accent"></span>
                Staff interruptions for recommendations and teaching drop dramatically.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-accent"></span>
                Inventory damage and missing parts are tracked and acted upon immediately.
              </li>
            </ul>
          </div>
          <div className="relative h-full">
            <div className="absolute inset-0 blur-3xl bg-accent/10 -z-10"></div>
            <div className="relative flex flex-col gap-4">
              {["The 20-Min Teach", "The Missing Piece", "The 'Ghost' Table"].map((title, idx) => (
                <div
                  key={title}
                  className="relative p-5 bg-card border border-stroke rounded-2xl shadow-card rotate-[-1deg]"
                  style={{ transform: `rotate(${idx === 1 ? 2 : -1 * idx}deg)` }}
                >
                  <div className="absolute inset-0 rounded-2xl border border-ink-primary/5 pointer-events-none"></div>
                  <p className="text-sm uppercase tracking-[0.25em] text-ink-secondary">Chaos Card</p>
                  <p className="mt-2 text-xl font-serif text-ink-primary">{title}</p>
                  <p className="text-sm text-ink-secondary mt-1">
                    {title === "The 20-Min Teach" && "Staff stuck explaining rules instead of selling drinks."}
                    {title === "The Missing Piece" && "Guest finds a broken game 30 mins into the session."}
                    {title === "The 'Ghost' Table" && "Table 4 booked for 7pm, but Table 4 is still playing Catan."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="max-w-6xl mx-auto px-6 pb-20 md:pb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-stroke"></div>
          <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">🎲 Chapter III</span>
          <div className="h-px flex-1 bg-stroke"></div>
        </div>
        <div className="grid md:grid-cols-[0.95fr_1.05fr] gap-12 items-start">
          <div className="space-y-4">
            <h2 className="text-3xl font-serif text-ink-primary">Run a Tighter Ship</h2>
            <p className="text-lg text-ink-secondary leading-relaxed">
              No more double-bookings. No more guessing which games need repair. The Host Dashboard gives you real-time control so you spend less time firefighting and more time delighting guests.
            </p>
            <p className="text-sm font-mono text-ink-secondary">Mode: Floor Ops · Last Sync: 00:11</p>
          </div>
          <div className="relative bg-card rounded-3xl border border-stroke shadow-floating p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-[0.25em] text-ink-secondary">Live Tables</p>
              <span className="px-3 py-1 rounded-full bg-brandTeal/15 text-brandTeal text-xs font-semibold border border-brandTeal/30">
                IN PLAY
              </span>
            </div>
            <div className="rounded-2xl border border-ink-primary/10 bg-surface overflow-hidden shadow-card">
              <div className="grid grid-cols-[1.1fr_0.6fr_0.6fr_0.6fr] text-xs uppercase tracking-[0.12em] text-ink-secondary border-b border-stroke bg-card/80 px-4 py-3 font-mono">
                <div>Title</div>
                <div>Copy</div>
                <div>Status</div>
                <div>Table</div>
              </div>
              <div className="grid grid-cols-[1.1fr_0.6fr_0.6fr_0.6fr] items-center px-4 py-4 text-ink-primary font-mono text-sm">
                <div className="font-semibold">Azul</div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-accent shadow-token"></span>
                  Copy #2
                </div>
                <div>
                  <span className="px-2 py-1 rounded-lg bg-brandTeal/10 text-brandTeal border border-brandTeal/30 text-[11px] font-semibold">
                    IN PLAY
                  </span>
                </div>
                <div className="font-semibold">Table 4</div>
              </div>
              <div className="border-t border-stroke px-4 py-3 text-xs text-ink-secondary font-mono bg-card/70">
                Condition: Clean · Logged: 00:42 · Staff: Jamie
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="stats" className="max-w-6xl mx-auto px-6 pb-20 md:pb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-stroke"></div>
          <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">🎲 Chapter IV</span>
          <div className="h-px flex-1 bg-stroke"></div>
        </div>
        <div className="flex items-center gap-4 mb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-ink-secondary">Why It Matters</p>
          <Image
            src="/meeple-group.svg"
            alt="Board game café metrics: 20% no-show revenue at risk, 30 minutes lost per teach, 76% of guests read reviews before visiting"
            width={120}
            height={72}
            className="opacity-75"
          />
        </div>
        <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-12 items-start">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "No-Show Revenue at Risk", pillar: "Revenue", icon: Coins, color: "accent" },
              { label: "Minutes Lost per Teach", pillar: "Time", icon: Hourglass, color: "teal" },
              { label: "Read Reviews Before Visiting", pillar: "Brand", icon: Crown, color: "success" }
            ].map(
              (stat) => (
                <div
                  key={stat.label}
                  className="p-5 rounded-2xl bg-card border border-stroke shadow-card"
                  style={{ borderTopWidth: "4px", borderTopColor: stat.color === "accent" ? "var(--color-accent)" : stat.color === "teal" ? "var(--color-teal)" : "var(--color-success)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`h-4 w-4 ${stat.color === "accent" ? "text-accent" : stat.color === "teal" ? "text-brandTeal" : "text-success"}`} />
                    <span className={`text-[10px] uppercase tracking-[0.2em] font-semibold ${stat.color === "accent" ? "text-accent" : stat.color === "teal" ? "text-brandTeal" : "text-success"}`}>{stat.pillar}</span>
                  </div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-secondary">{stat.label}</p>
                </div>
              ),
            )}
          </div>
          <div className="space-y-4">
            {[
              { quote: "Guests pick faster and we sell more rounds — GameLedger made our busy nights manageable.", attr: "Owner, Partner Café #1" },
              { quote: "Scan to Play cut decision time to under two minutes and boosted repeat visits.", attr: "Manager, Riverside Games" }
            ].map(
              (testimonial) => (
                <article
                  key={testimonial.quote}
                  className="border border-stroke rounded-2xl bg-card shadow-card overflow-hidden"
                  style={{ borderLeftWidth: "6px", borderLeftColor: "#C64D2F" }}
                >
                  <div className="p-5">
                    <p className="text-lg font-serif text-ink-primary">&ldquo;{testimonial.quote}&rdquo;</p>
                    <p className="mt-3 text-sm text-ink-secondary font-mono">{testimonial.attr}</p>
                  </div>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      <section id="faq" className="max-w-4xl mx-auto px-6 pb-20 md:pb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-stroke"></div>
          <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">Chapter V</span>
          <div className="h-px flex-1 bg-stroke"></div>
        </div>
        <h2 className="text-3xl font-serif text-ink-primary mb-8">Frequently Asked Questions</h2>
        <div className="bg-card rounded-2xl border border-stroke shadow-card p-6 md:p-8">
          <LandingFAQ />
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20 md:pb-24">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">Common Questions</span>
        </div>
        <h2 className="text-3xl font-serif text-ink-primary mb-8 text-center">For Owners &amp; Managers</h2>
        <div className="space-y-4">
          <details className="group border border-stroke rounded-2xl bg-card open:shadow-card transition-all duration-300">
            <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-ink-primary list-none">
              <span>How hard is it to import my game library?</span>
              <span className="transition-transform duration-300 group-open:rotate-180 text-ink-secondary">▼</span>
            </summary>
            <div className="px-5 pb-5 text-ink-secondary leading-relaxed border-t border-stroke/50 pt-4">
              It&apos;s instant. We integrate directly with the <strong>BoardGameGeek (BGG)</strong> API. You don&apos;t need to manually type in player counts, playtimes, or complexity ratings—just select your games and we pull the metadata automatically.
            </div>
          </details>

          <details className="group border border-stroke rounded-2xl bg-card open:shadow-card transition-all duration-300">
            <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-ink-primary list-none">
              <span>Does this replace my reservation system?</span>
              <span className="transition-transform duration-300 group-open:rotate-180 text-ink-secondary">▼</span>
            </summary>
            <div className="px-5 pb-5 text-ink-secondary leading-relaxed border-t border-stroke/50 pt-4">
              Yes. GameLedger includes a native booking system that understands your inventory. However, if you prefer your current tool, we can operate as a &ldquo;Library OS&rdquo; alongside it—though you lose the benefit of preventing &ldquo;Ghost Tables.&rdquo;
            </div>
          </details>

          <details className="group border border-stroke rounded-2xl bg-card open:shadow-card transition-all duration-300">
            <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-ink-primary list-none">
              <span>How does the library management work?</span>
              <span className="transition-transform duration-300 group-open:rotate-180 text-ink-secondary">▼</span>
            </summary>
            <div className="px-5 pb-5 text-ink-secondary leading-relaxed border-t border-stroke/50 pt-4">
              We track every play session. If a guest or staff flags a game as &ldquo;Damaged,&rdquo; it is instantly removed from the recommendation engine. You get a dashboard showing exactly which games are earning their keep and which should be retired.
            </div>
          </details>
        </div>
      </section>

      <section id="early-access" className="max-w-4xl mx-auto px-6 pb-20 md:pb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-stroke"></div>
          <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">Join the Waitlist</span>
          <div className="h-px flex-1 bg-stroke"></div>
        </div>
        <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 items-start">
          <div className="space-y-4">
            <h2 className="text-3xl font-serif text-ink-primary">Request Early Access</h2>
            <p className="text-lg text-ink-secondary leading-relaxed">
              Be among the first board game cafés to run GameLedger. We&apos;re onboarding a limited number of venues for our pilot program.
            </p>
            <ul className="space-y-2 text-ink-primary text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-brandTeal"></span>
                Priority access to new features
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-brandTeal"></span>
                Dedicated onboarding support
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-brandTeal"></span>
                Founding member pricing
              </li>
            </ul>
          </div>
          <div className="bg-card rounded-2xl border border-stroke shadow-floating p-6">
            <EarlyAccessForm />
          </div>
        </div>
      </section>

      <section
        id="comparison"
        className="max-w-6xl mx-auto px-6 pb-20 md:pb-24 bg-section-teal py-10 rounded-3xl"
        aria-labelledby="comparison-heading"
      >
        <div className="flex flex-col items-center gap-2 mb-8">
          <Image
            src="/medieval-flourish.svg"
            alt="Decorative medieval flourish divider for board game café software comparison"
            width={200}
            height={24}
            className="opacity-70"
          />
          <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">Appendix A</span>
        </div>
        <h2 id="comparison-heading" className="text-3xl font-serif text-ink-primary mb-6">
          The Stat Sheet
        </h2>
        <div className="rounded-3xl border border-ink-primary/10 bg-card shadow-floating overflow-hidden">
          <div className="grid grid-cols-3 text-xs uppercase tracking-[0.18em] text-ink-secondary bg-surface border-b border-stroke font-mono">
            <div className="px-4 py-3 border-r border-stroke">Feature</div>
            <div className="px-4 py-3 border-r border-stroke">GameLedger</div>
            <div className="px-4 py-3">Generic Tools</div>
          </div>
          {[{
            feature: "Guest Experience",
            gameledger: "BGG-Powered Wizard: Accurate metadata & smart recs",
            genericTools: "Confusion & analysis paralysis",
          },
          {
            feature: "Library Setup",
            gameledger: "Instant BGG Import: Add 500+ games in minutes",
            genericTools: "Weeks of manual data entry",
          },
          {
            feature: "Bookings",
            gameledger: "Inventory-Aware: Zero 'Ghost Tables' or double-bookings",
            genericTools: "Time-slots only (Blind to actual capacity)",
          },
          {
            feature: "Library Management",
            gameledger: "Asset Tracking: Stop losing money on broken games",
            genericTools: "Manual notes lost between shifts",
          },
          {
            feature: "Analytics",
            gameledger: "Usage Data: Know exactly what to buy/sell",
            genericTools: "Guesswork",
          }].map((row, idx) => (
            <div
              key={row.feature}
              className={`grid grid-cols-3 text-sm font-medium text-ink-primary bg-card ${idx !== 4 ? "border-b border-stroke" : ""}`}
            >
              <div className="px-4 py-4 border-r border-stroke font-serif">{row.feature}</div>
              <div className="px-4 py-4 border-r border-stroke font-mono text-brandTeal col-highlight-success">{row.gameledger}</div>
              <div className="px-4 py-4 font-mono text-ink-secondary">{row.genericTools}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20 md:pb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-stroke"></div>
          <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">Chaos Cards</span>
          <div className="h-px flex-1 bg-stroke"></div>
        </div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-serif text-ink-primary">Latest from the Blog</h2>
          <Link
            href="/blog"
            className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
          >
            View all articles →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "The 20-Min Teach",
              description: "The hidden revenue cost of rule explanations",
              slug: "cost-of-board-game-teaches",
            },
            {
              title: "Ghost Tables",
              description: "Why your reservation system is losing you money",
              slug: "stop-board-game-cafe-ghost-tables",
            },
            {
              title: "The Missing Piece",
              description: "How inventory chaos kills customer retention",
              slug: "board-game-inventory-management-tips",
            },
          ].map((post, idx) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group relative p-5 bg-card border border-stroke rounded-2xl shadow-card hover:shadow-floating transition-all duration-300"
              style={{ transform: `rotate(${idx === 1 ? 1 : idx === 0 ? -0.5 : 0.5}deg)` }}
            >
              <div className="absolute inset-0 rounded-2xl border border-ink-primary/5 pointer-events-none"></div>
              <p className="text-xs uppercase tracking-[0.25em] text-accent font-semibold">Chaos Card</p>
              <p className="mt-2 text-lg font-serif text-ink-primary group-hover:text-accent transition-colors">{post.title}</p>
              <p className="text-sm text-ink-secondary mt-1">{post.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-16 md:pb-24 text-center bg-cta-warm py-12 rounded-3xl relative overflow-hidden">
        <Image
          src="/dice-pair.svg"
          alt="Board game dice illustration representing GameLedger café management tools"
          width={80}
          height={60}
          className="absolute top-6 right-8 opacity-60 hidden md:block"
        />
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-px flex-1 bg-stroke"></div>
          <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">Final Scoring</span>
          <div className="h-px flex-1 bg-stroke"></div>
        </div>
        <h3 className="text-3xl font-serif text-ink-primary mb-4">Ready to run a pilot?</h3>
        <p className="text-lg text-ink-secondary mb-8">
          We&apos;ll bring the playmat, the tokens, and a pilot checklist so your first weekend is effortless. Book a demo or request a pilot and we&apos;ll help you connect bookings to the QR experience.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => handleOpenDialog("pilot")}
            className="px-6 py-3 rounded-full bg-accent text-card font-semibold shadow-floating border border-ink-primary/5 transition-transform duration-300 hover:-translate-y-0.5"
          >
            Request a pilot
          </button>
          <button
            onClick={() => handleOpenDialog("host_inquiry")}
            className="px-6 py-3 rounded-full bg-accent text-card font-semibold shadow-floating border border-ink-primary/5 transition-transform duration-300 hover:-translate-y-0.5"
          >
            Talk to a host
          </button>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-ink-secondary">
          <Link className="hover:text-ink-primary transition-colors" href="/docs">
            Docs
          </Link>
          <Link className="hover:text-ink-primary transition-colors" href="/pricing">
            Pricing
          </Link>
          <Link className="hover:text-ink-primary transition-colors" href="/blog">
            Blog
          </Link>
          <Link className="hover:text-ink-primary transition-colors" href="/calculator">
            Calculator
          </Link>
          <Link className="hover:text-ink-primary transition-colors" href="/about">
            About
          </Link>
        </div>
      </section>

      {selectedRequestType && (
        <RequestAccessDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          requestType={selectedRequestType}
        />
      )}
    </main>
  );
}
