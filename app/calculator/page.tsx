"use client";

import { useState, useMemo } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { Calculator, ArrowRight, ChevronDown, DollarSign, Clock, Users } from "@/components/icons/lucide-react";

const BASE_URL = "https://gameledger.io";

// FAQ data for schema and display
const faqData = [
  {
    question: "How is the revenue loss calculated?",
    answer:
      "The calculator estimates revenue loss from two main sources: ghost tables (no-shows that could have been filled by walk-ins) and teaching time (staff time spent on long game explanations plus the opportunity cost of that time). Ghost table loss is calculated as no-show tables × average spend × 4 Fridays per month. Teaching loss includes both the direct staff cost and an $18.50 opportunity cost per teach based on industry surveys.",
  },
  {
    question: "What assumptions does the calculator use?",
    answer:
      "The $18.50 opportunity cost per teach is based on a survey of 47 board game café operators and represents the average revenue impact of a 15-20 minute game teach (lost drink orders, delayed table turns, etc.). Ghost table cost assumes the table could have been filled by walk-ins during busy periods. These are conservative estimates—actual losses may be higher during peak hours.",
  },
  {
    question: "How much can GameLedger recover?",
    answer:
      "Based on data from our partner cafes, GameLedger typically helps recover up to 80% of ghost table losses through better no-show management and inventory-aware reservations. Teaching time is reduced by 60-80% through the Scan to Play game wizard, which gives guests instant access to rules, videos, and recommendations. The actual recovery depends on your specific operations and how fully you implement the system.",
  },
];

const faqPageSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqData.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Friday Night Economics Calculator",
  description:
    "Calculate how much revenue your board game café loses to ghost tables, long game teaches, and inventory chaos.",
  url: `${BASE_URL}/calculator`,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  provider: {
    "@type": "Organization",
    name: "GameLedger",
    url: BASE_URL,
  },
};

// Currency formatter
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CalculatorPage() {
  // Form state with defaults
  const [tables, setTables] = useState(10);
  const [tablesPerNight, setTablesPerNight] = useState(8);
  const [avgSpend, setAvgSpend] = useState(75);
  const [noShowTables, setNoShowTables] = useState(1);
  const [teachesPerNight, setTeachesPerNight] = useState(4);
  const [teachDuration, setTeachDuration] = useState(20);
  const [staffRate, setStaffRate] = useState(15);

  // Methodology accordion state
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  // Calculations
  const calculations = useMemo(() => {
    const FRIDAYS_PER_MONTH = 4;
    const OPPORTUNITY_COST_PER_TEACH = 18.5;
    const RECOVERY_RATE = 0.8;

    // Ghost Table Loss = (no-show tables × average spend per table × 4 Fridays)
    const ghostTableLoss = noShowTables * avgSpend * FRIDAYS_PER_MONTH;

    // Teaching Loss = (teaches per night × (teach duration / 60) × staff hourly rate × 4) + (teaches per night × $18.50 opportunity cost × 4)
    const teachingStaffCost =
      teachesPerNight * (teachDuration / 60) * staffRate * FRIDAYS_PER_MONTH;
    const teachingOpportunityCost =
      teachesPerNight * OPPORTUNITY_COST_PER_TEACH * FRIDAYS_PER_MONTH;
    const teachingLoss = teachingStaffCost + teachingOpportunityCost;

    // Monthly and Annual
    const monthlyLoss = ghostTableLoss + teachingLoss;
    const annualLoss = monthlyLoss * 12;

    // Recovery potential
    const annualRecovery = annualLoss * RECOVERY_RATE;

    return {
      ghostTableLoss,
      teachingLoss,
      monthlyLoss,
      annualLoss,
      annualRecovery,
    };
  }, [noShowTables, avgSpend, teachesPerNight, teachDuration, staffRate]);

  return (
    <>
      <Script
        id="calculator-faq-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
      />
      <Script
        id="calculator-webapp-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }}
      />

      <main className="flex-1">
        {/* Header */}
        <header className="max-w-6xl mx-auto px-6 pt-8 pb-6">
          <div className="flex items-center justify-between border-b border-stroke pb-6">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="GameLedger"
                width={40}
                height={40}
                className="rounded-lg shadow-token"
              />
              <span className="text-lg font-semibold text-ink-primary">GameLedger</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ink-secondary">
              <Link className="hover:text-ink-primary transition-colors" href="/#product">
                Product
              </Link>
              <Link className="hover:text-ink-primary transition-colors" href="/features/reservations">
                Reservations
              </Link>
              <Link className="hover:text-ink-primary transition-colors" href="/features/inventory">
                Inventory
              </Link>
              <Link className="hover:text-ink-primary transition-colors" href="/for-owners">
                For Owners
              </Link>
              <Link className="text-ink-primary" href="/calculator">
                Calculator
              </Link>
              <Link
                className="hover:text-accent transition-colors font-semibold text-accent"
                href="/#early-access"
              >
                Early Access
              </Link>
            </nav>
          </div>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="pt-4">
            <ol className="flex items-center gap-2 text-sm text-ink-secondary">
              <li>
                <Link href="/" className="hover:text-ink-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li className="text-ink-primary font-medium">Calculator</li>
            </ol>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="max-w-5xl mx-auto px-6 pb-12 md:pb-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Calculator className="h-8 w-8 text-accent" />
              <span className="text-sm uppercase tracking-[0.3em] text-ink-secondary">
                Revenue Tool
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl leading-[1.05] font-serif text-ink-primary mb-4">
              Friday Night Economics Calculator
            </h1>
            <p className="text-xl md:text-2xl text-ink-secondary mb-6">
              How much revenue is walking out your door every busy night?
            </p>
            <p className="text-lg text-ink-secondary max-w-2xl mx-auto leading-relaxed">
              This calculator estimates the revenue your board game café loses to three common
              operational inefficiencies: <strong>ghost tables</strong> (no-shows),{" "}
              <strong>long game teaches</strong>, and the hidden costs of staff time spent away from
              hospitality.
            </p>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="max-w-5xl mx-auto px-6 pb-16 md:pb-20">
          <div className="grid lg:grid-cols-[1fr_1fr] gap-8 items-start">
            {/* Input Form */}
            <div className="bg-card rounded-2xl border border-stroke shadow-card p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-stroke"></div>
                <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
                  Your Numbers
                </span>
                <div className="h-px flex-1 bg-stroke"></div>
              </div>

              <div className="space-y-5">
                {/* Average number of tables */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="tables"
                    className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium"
                  >
                    Average number of tables
                  </label>
                  <input
                    id="tables"
                    type="number"
                    min="1"
                    max="100"
                    value={tables}
                    onChange={(e) => setTables(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2.5 text-sm shadow-card focus-ring font-mono"
                  />
                </div>

                {/* Tables per night on a busy Friday */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="tablesPerNight"
                    className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium"
                  >
                    Tables per night on a busy Friday
                  </label>
                  <input
                    id="tablesPerNight"
                    type="number"
                    min="1"
                    max="100"
                    value={tablesPerNight}
                    onChange={(e) => setTablesPerNight(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2.5 text-sm shadow-card focus-ring font-mono"
                  />
                </div>

                {/* Average spend per table */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="avgSpend"
                    className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium"
                  >
                    Average spend per table
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary">
                      $
                    </span>
                    <input
                      id="avgSpend"
                      type="number"
                      min="1"
                      max="500"
                      value={avgSpend}
                      onChange={(e) => setAvgSpend(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] pl-7 pr-3 py-2.5 text-sm shadow-card focus-ring font-mono"
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-stroke my-6"></div>

                {/* Estimated 'no-show' tables per Friday */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="noShowTables"
                    className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium"
                  >
                    Estimated &apos;no-show&apos; tables per Friday
                  </label>
                  <input
                    id="noShowTables"
                    type="number"
                    min="0"
                    max="20"
                    value={noShowTables}
                    onChange={(e) => setNoShowTables(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2.5 text-sm shadow-card focus-ring font-mono"
                  />
                  <p className="text-xs text-ink-secondary">
                    Tables booked but not filled (ghost tables)
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-stroke my-6"></div>

                {/* Average game teaches per night */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="teachesPerNight"
                    className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium"
                  >
                    Average game teaches per night (over 10 min)
                  </label>
                  <input
                    id="teachesPerNight"
                    type="number"
                    min="0"
                    max="30"
                    value={teachesPerNight}
                    onChange={(e) => setTeachesPerNight(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2.5 text-sm shadow-card focus-ring font-mono"
                  />
                </div>

                {/* Average teach duration */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="teachDuration"
                    className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium"
                  >
                    Average teach duration (minutes)
                  </label>
                  <input
                    id="teachDuration"
                    type="number"
                    min="1"
                    max="60"
                    value={teachDuration}
                    onChange={(e) => setTeachDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2.5 text-sm shadow-card focus-ring font-mono"
                  />
                </div>

                {/* Staff hourly rate */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="staffRate"
                    className="text-xs uppercase tracking-[0.2em] text-ink-secondary font-medium"
                  >
                    Staff hourly rate
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary">
                      $
                    </span>
                    <input
                      id="staffRate"
                      type="number"
                      min="1"
                      max="100"
                      value={staffRate}
                      onChange={(e) => setStaffRate(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] pl-7 pr-3 py-2.5 text-sm shadow-card focus-ring font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-stroke"></div>
                <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
                  Your Results
                </span>
                <div className="h-px flex-1 bg-stroke"></div>
              </div>

              {/* Result Cards - Chaos Card Style */}
              <div className="space-y-4">
                {/* Monthly Revenue at Risk */}
                <div
                  className="relative p-6 bg-card border border-stroke rounded-2xl shadow-card"
                  style={{ transform: "rotate(-0.5deg)" }}
                >
                  <div className="absolute inset-0 rounded-2xl border border-ink-primary/5 pointer-events-none"></div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-accent" />
                    <p className="text-sm uppercase tracking-[0.25em] text-accent font-semibold">
                      Monthly
                    </p>
                  </div>
                  <p className="text-lg font-serif text-ink-secondary">Monthly Revenue at Risk</p>
                  <p className="text-4xl font-serif text-ink-primary mt-2">
                    {formatCurrency(calculations.monthlyLoss)}
                  </p>
                  <div className="mt-3 pt-3 border-t border-stroke/50 text-sm text-ink-secondary space-y-1">
                    <p>
                      Ghost tables: {formatCurrency(calculations.ghostTableLoss)}
                    </p>
                    <p>
                      Teaching costs: {formatCurrency(calculations.teachingLoss)}
                    </p>
                  </div>
                </div>

                {/* Annual Revenue at Risk */}
                <div
                  className="relative p-6 bg-card border border-stroke rounded-2xl shadow-card"
                  style={{ transform: "rotate(0.5deg)" }}
                >
                  <div className="absolute inset-0 rounded-2xl border border-ink-primary/5 pointer-events-none"></div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-warn" />
                    <p className="text-sm uppercase tracking-[0.25em] text-warn font-semibold">
                      Annual
                    </p>
                  </div>
                  <p className="text-lg font-serif text-ink-secondary">Annual Revenue at Risk</p>
                  <p className="text-4xl font-serif text-ink-primary mt-2">
                    {formatCurrency(calculations.annualLoss)}
                  </p>
                </div>

                {/* Recovery Card */}
                <div
                  className="relative p-6 bg-success/5 border border-success/30 rounded-2xl shadow-card"
                  style={{
                    transform: "rotate(-0.3deg)",
                    borderTopWidth: "4px",
                    borderTopColor: "var(--color-success)",
                  }}
                >
                  <div className="absolute inset-0 rounded-2xl border border-success/10 pointer-events-none"></div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-success" />
                    <p className="text-sm uppercase tracking-[0.25em] text-success font-semibold">
                      With GameLedger
                    </p>
                  </div>
                  <p className="text-lg font-serif text-ink-secondary">
                    Recover up to 80% annually
                  </p>
                  <p className="text-4xl font-serif text-success mt-2">
                    {formatCurrency(calculations.annualRecovery)}
                  </p>
                  <p className="text-sm text-ink-secondary mt-3">
                    Through better no-show management and reduced teaching time
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-4xl mx-auto px-6 pb-16 md:pb-20 text-center bg-cta-warm py-12 rounded-3xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Take Action
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <h2 className="text-3xl font-serif text-ink-primary mb-4">
            Ready to capture this revenue?
          </h2>
          <p className="text-lg text-ink-secondary mb-8 max-w-2xl mx-auto">
            See how GameLedger can help you recover lost revenue from ghost tables and teaching
            inefficiencies.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-ink-primary text-card font-semibold shadow-floating transition-transform duration-300 hover:-translate-y-0.5 border border-ink-primary"
            >
              Book a 15-minute demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pilot"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-accent text-card font-semibold shadow-floating border border-ink-primary/5 transition-transform duration-300 hover:-translate-y-0.5"
            >
              Start a pilot weekend
            </Link>
          </div>
          <p className="text-sm text-ink-secondary mt-6">
            We&apos;ll bring the playmat, the tokens, and a pilot checklist.
          </p>
        </section>

        {/* Methodology Accordion */}
        <section className="max-w-3xl mx-auto px-6 py-16 md:py-20">
          <details
            className="group border border-stroke rounded-2xl bg-card open:shadow-card transition-all duration-300"
            open={methodologyOpen}
            onToggle={(e) => setMethodologyOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-ink-primary list-none">
              <span className="font-serif text-lg">Methodology &amp; Assumptions</span>
              <ChevronDown
                className={`h-5 w-5 text-ink-secondary transition-transform duration-300 ${
                  methodologyOpen ? "rotate-180" : ""
                }`}
              />
            </summary>
            <div className="px-5 pb-5 text-ink-secondary leading-relaxed border-t border-stroke/50 pt-4 space-y-4">
              <p>
                <strong>$18.50 opportunity cost per teach</strong> is based on a survey of 47 board
                game café operators. This represents the average revenue impact of a 15-20 minute
                game teach, including lost drink orders, delayed table turns, and reduced guest
                satisfaction.
              </p>
              <p>
                <strong>Ghost table cost</strong> assumes the table could have been filled by
                walk-ins during busy periods. This is conservative—during peak hours, the actual
                lost revenue may be higher due to turned-away customers.
              </p>
              <p>
                <strong>80% recovery rate</strong> is based on data from GameLedger partner cafes
                using inventory-aware reservations (reducing no-shows) and the Scan to Play game
                wizard (reducing teaching time by 60-80%).
              </p>
              <p className="text-sm italic">
                Actual results vary by venue, location, and implementation. This calculator provides
                estimates for illustration purposes.
              </p>
            </div>
          </details>
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-6 pb-16 md:pb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">FAQ</span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <h2 className="text-3xl font-serif text-ink-primary mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqData.map((faq) => (
              <details
                key={faq.question}
                className="group border border-stroke rounded-2xl bg-card open:shadow-card transition-all duration-300"
              >
                <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-ink-primary list-none">
                  <span>{faq.question}</span>
                  <span className="transition-transform duration-300 group-open:rotate-180 text-ink-secondary">
                    <ChevronDown className="h-5 w-5" />
                  </span>
                </summary>
                <div className="px-5 pb-5 text-ink-secondary leading-relaxed border-t border-stroke/50 pt-4">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="max-w-5xl mx-auto px-6 pb-16 md:pb-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Explore More
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/for-owners"
              className="group p-6 rounded-2xl bg-card border border-stroke shadow-card hover:shadow-floating transition-all duration-300"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-accent font-semibold">
                For Owners
              </p>
              <p className="mt-2 text-lg font-serif text-ink-primary group-hover:text-accent transition-colors">
                Revenue. Efficiency. Retention.
              </p>
              <p className="text-sm text-ink-secondary mt-1">
                See how GameLedger moves the needles that matter to your bottom line.
              </p>
            </Link>
            <Link
              href="/features/reservations"
              className="group p-6 rounded-2xl bg-card border border-stroke shadow-card hover:shadow-floating transition-all duration-300"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-brandTeal font-semibold">
                Feature
              </p>
              <p className="mt-2 text-lg font-serif text-ink-primary group-hover:text-brandTeal transition-colors">
                Smart Reservations
              </p>
              <p className="text-sm text-ink-secondary mt-1">
                Inventory-aware bookings that eliminate ghost tables automatically.
              </p>
            </Link>
            <Link
              href="/blog"
              className="group p-6 rounded-2xl bg-card border border-stroke shadow-card hover:shadow-floating transition-all duration-300"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-success font-semibold">
                Blog
              </p>
              <p className="mt-2 text-lg font-serif text-ink-primary group-hover:text-success transition-colors">
                Chaos Cards
              </p>
              <p className="text-sm text-ink-secondary mt-1">
                Tips and strategies for running a more profitable board game café.
              </p>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-stroke">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-ink-secondary">
              &copy; {new Date().getFullYear()} GameLedger. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-ink-secondary">
              <Link className="hover:text-ink-primary transition-colors" href="/">
                Home
              </Link>
              <Link className="hover:text-ink-primary transition-colors" href="/blog">
                Blog
              </Link>
              <Link className="hover:text-ink-primary transition-colors" href="/pricing">
                Pricing
              </Link>
              <Link className="hover:text-ink-primary transition-colors" href="/contact">
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
