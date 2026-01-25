"use client";

import { useState, useMemo } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { Calculator, ArrowRight, ChevronDown, DollarSign, Clock, Users } from "@/components/icons/lucide-react";

const BASE_URL = "https://gameledger.io";

// Industry sources for citations
const industrySources = {
  sevenRoomsNoShow: {
    name: "SevenRooms",
    url: "https://sevenrooms.com/blog/restaurant-reservation-process-leaky-bucket/",
    description: "No-show benchmark data (~3.5% with integrated systems)",
  },
  sevenRoomsTurnTime: {
    name: "SevenRooms",
    url: "https://sevenrooms.com/blog/restaurant-revenue-management-strategies-to-maximize-every-shift/",
    description: "Restaurant turn time benchmarks (~90 minutes)",
  },
  openTableNoShow: {
    name: "OpenTable",
    url: "https://www.opentable.com/restaurant-solutions/resources/no-show-diners-numbers/",
    description: "No-show behavior data (40% reduction with integrated booking)",
  },
  openTableTurnTime: {
    name: "OpenTable Support",
    url: "https://support.opentable.com/s/article/Online-Availability-Settings",
    description: "Table duration settings (~90 minutes)",
  },
  sipNPlay: {
    name: "Sip & Play (Brooklyn)",
    url: "https://www.sipnplaynyc.com/",
    description: "Pricing: $10-15/person for 3 hours ($3.33-$5.00/seat-hour)",
  },
  theUncommonsAbout: {
    name: "The Uncommons (NYC)",
    url: "https://uncommonsnyc.com/about/",
    description: "Pricing: $15/person with 3-hour limit ($5.00/seat-hour)",
  },
  theUncommonsFAQ: {
    name: "The Uncommons FAQ",
    url: "https://uncommonsnyc.com/faq/",
    description: "Inventory checking: ~30 minutes for complex games",
  },
  boardPlayCafe: {
    name: "Board Play Café",
    url: "https://boardplaycafe.com/reservations/",
    description: "Standard 3-hour reservations",
  },
  draughtsLondon: {
    name: "Draughts London",
    url: "https://www.draughtslondon.com/faqs/",
    description: "Pricing: £7.50-£9.50 for 3 hours (£2.50-£3.17/seat-hour)",
  },
  kamCompetitiveSocialising: {
    name: "KAM Competitive Socialising Report",
    url: "https://kaminsight.com/wp-content/uploads/sites/2044/2024/05/KAM-Competitive-Socialising-Report-May-2024.pdf",
    description: "58% of visits involve eating; 2 in 5 go for drinks after",
  },
  nowbookit: {
    name: "Nowbookit",
    url: "https://www.nowbookit.com/hospitality/restaurant-booking-statistics/",
    description: "No-show rates can reach ~20% without management",
  },
  bistrochat: {
    name: "Bistrochat/ResDiary",
    url: "https://www.bistrochat.com/foodforthought/en/posts/usa-restaurant-reservation-systems-market-data.html",
    description: "No-show rates ~8% in 2023 (vs 5% in 2022)",
  },
  imarcGroup: {
    name: "IMARC Group",
    url: "https://www.imarcgroup.com/board-game-cafe-business-plan-project-report",
    description: "Board game café business model requiring knowledgeable staff",
  },
};

// FAQ data for schema and display
const faqData = [
  {
    question: "How is the revenue loss calculated?",
    answer:
      "The calculator estimates revenue loss from two main sources: ghost tables (no-shows that could have been filled by walk-ins) and teaching time (direct staff labor cost when explaining games). Ghost table loss is calculated as no-show tables × average spend × Fridays per month. Teaching loss is calculated as teaches × duration × hourly rate. Actual results vary by venue, location, and implementation.",
  },
  {
    question: "What assumptions does the calculator use?",
    answer:
      "Teaching cost uses your actual staff hourly rate and estimated teach duration—no fabricated 'opportunity cost' figures. Ghost table cost assumes tables could have been filled during busy periods. Industry data shows board game cafés typically operate ~3-hour sessions (vs ~90 min in casual dining) with admission yields of $3-5 per seat-hour. Sources: Sip & Play, The Uncommons, SevenRooms, OpenTable.",
  },
  {
    question: "What are typical no-show rates?",
    answer:
      "Industry benchmarks show no-show rates vary significantly: ~3-4% with integrated reservation systems and automated reminders (SevenRooms global benchmark), but 8-20% without proper management (OpenTable, Nowbookit, Bistrochat data). The improvement from better systems can range from 50% to 80%+ depending on your baseline.",
  },
  {
    question: "How much can integrated reservations improve no-shows?",
    answer:
      "SevenRooms reports a global benchmark of ~3.5% no-shows with integrated systems. OpenTable data shows diners booking through integrated platforms are 40% less likely to no-show than via search engines. Conservative improvement: (8% baseline → 4%) = 50% reduction. Optimistic improvement: (20% baseline → 3.5%) = 82.5% reduction. Your results depend on your current processes.",
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

  // Calculations using verified industry benchmarks
  const calculations = useMemo(() => {
    const FRIDAYS_PER_MONTH = 4;

    // No-show improvement rates based on industry data:
    // Conservative: (8% baseline → 4% improved) / 8% = 50% improvement (Bistrochat, SevenRooms)
    // Optimistic: (20% baseline → 3.5% improved) / 20% = 82.5% improvement (Nowbookit, SevenRooms)
    const CONSERVATIVE_NO_SHOW_IMPROVEMENT = 0.5;
    const OPTIMISTIC_NO_SHOW_IMPROVEMENT = 0.825;

    // Ghost Table Loss = (no-show tables × average spend per table × Fridays per month)
    const ghostTableLoss = noShowTables * avgSpend * FRIDAYS_PER_MONTH;

    // Teaching Loss = direct labor cost only (no fabricated "opportunity cost")
    // Formula: teaches per night × (teach duration / 60) × staff hourly rate × Fridays
    // Note: The Uncommons reports complex games can take ~30 minutes to check through
    const teachingLoss =
      teachesPerNight * (teachDuration / 60) * staffRate * FRIDAYS_PER_MONTH;

    // Monthly and Annual totals
    const monthlyLoss = ghostTableLoss + teachingLoss;
    const annualLoss = monthlyLoss * 12;

    // Recovery estimates using industry-benchmarked no-show improvements
    // Ghost tables: use no-show improvement range
    // Teaching time: self-service tools can significantly reduce staff teach time
    const annualGhostTableLoss = ghostTableLoss * 12;
    const annualTeachingLoss = teachingLoss * 12;

    // Conservative recovery: 50% of ghost table losses + 50% of teaching time
    const conservativeRecovery =
      (annualGhostTableLoss * CONSERVATIVE_NO_SHOW_IMPROVEMENT) +
      (annualTeachingLoss * 0.5);

    // Optimistic recovery: 82.5% of ghost table losses + 75% of teaching time
    const optimisticRecovery =
      (annualGhostTableLoss * OPTIMISTIC_NO_SHOW_IMPROVEMENT) +
      (annualTeachingLoss * 0.75);

    return {
      ghostTableLoss,
      teachingLoss,
      monthlyLoss,
      annualLoss,
      conservativeRecovery,
      optimisticRecovery,
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
                      Potential Recovery
                    </p>
                  </div>
                  <p className="text-lg font-serif text-ink-secondary">
                    Estimated annual recovery range
                  </p>
                  <p className="text-3xl font-serif text-success mt-2">
                    {formatCurrency(calculations.conservativeRecovery)} – {formatCurrency(calculations.optimisticRecovery)}
                  </p>
                  <p className="text-sm text-ink-secondary mt-3">
                    Based on industry benchmarks: no-show rates can improve 50-82%
                    with integrated reservation systems{" "}
                    <a
                      href="https://sevenrooms.com/blog/restaurant-reservation-process-leaky-bucket/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline hover:no-underline"
                    >
                      (SevenRooms)
                    </a>
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
                <strong>Teaching cost</strong> is calculated as direct staff labor only: (teaches per night) × (duration in hours) × (your hourly rate) × (Fridays per month). We do not apply a fabricated "opportunity cost" figure. For context, The Uncommons notes that{" "}
                <a href="https://uncommonsnyc.com/faq/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">"some games can take 30 minutes to check through"</a>.
              </p>
              <p>
                <strong>Ghost table cost</strong> assumes tables could have been filled by walk-ins during busy periods. Board game cafés typically operate ~3-hour sessions vs ~90 minutes in casual dining (
                <a href="https://www.sipnplaynyc.com/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">Sip & Play</a>,{" "}
                <a href="https://uncommonsnyc.com/about/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">The Uncommons</a>,{" "}
                <a href="https://sevenrooms.com/blog/restaurant-revenue-management-strategies-to-maximize-every-shift/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">SevenRooms</a>).
              </p>
              <p>
                <strong>No-show improvement range</strong> is based on published industry benchmarks:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>
                  <a href="https://sevenrooms.com/blog/restaurant-reservation-process-leaky-bucket/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">SevenRooms</a>: Global benchmark of ~3.5% no-shows with integrated systems (~11% cancellations)
                </li>
                <li>
                  <a href="https://www.opentable.com/restaurant-solutions/resources/no-show-diners-numbers/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">OpenTable</a>: Diners booking via integrated platforms are 40% less likely to no-show
                </li>
                <li>
                  <a href="https://www.nowbookit.com/hospitality/restaurant-booking-statistics/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">Nowbookit</a>: No-shows can reach ~20% without active management
                </li>
                <li>
                  <a href="https://www.bistrochat.com/foodforthought/en/posts/usa-restaurant-reservation-systems-market-data.html" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">Bistrochat/ResDiary</a>: No-shows ~8% in 2023
                </li>
              </ul>
              <p>
                <strong>Recovery range calculation:</strong> Conservative assumes improvement from 8% → 4% (50% reduction). Optimistic assumes improvement from 20% → 3.5% (82.5% reduction).
              </p>
              <p className="text-sm italic border-t border-stroke/30 pt-3 mt-3">
                <strong>Disclaimer:</strong> Actual results vary by venue, location, and implementation. F&B revenue split data is not publicly available at industry level. This calculator provides estimates based on published benchmarks for illustration purposes only.
              </p>
            </div>
          </details>
        </section>

        {/* Sources Section */}
        <section className="max-w-3xl mx-auto px-6 pb-12">
          <details className="group border border-stroke rounded-2xl bg-card open:shadow-card transition-all duration-300">
            <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-ink-primary list-none">
              <span className="font-serif text-lg">Industry Sources &amp; Citations</span>
              <ChevronDown className="h-5 w-5 text-ink-secondary transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="px-5 pb-5 text-ink-secondary leading-relaxed border-t border-stroke/50 pt-4">
              <p className="text-sm mb-4">
                All benchmarks in this calculator are sourced from published industry data. Click any link to view the original source.
              </p>

              <h4 className="font-semibold text-ink-primary mt-4 mb-2">Session Duration &amp; Turn Time</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://www.sipnplaynyc.com/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">Sip & Play (Brooklyn)</a>{" "}
                  — $10-15/person for 3 hours gameplay
                </li>
                <li>
                  <a href="https://uncommonsnyc.com/about/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">The Uncommons (NYC)</a>{" "}
                  — $15/person with 3-hour limit during peak
                </li>
                <li>
                  <a href="https://boardplaycafe.com/reservations/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">Board Play Café</a>{" "}
                  — Standard 3-hour reservations
                </li>
                <li>
                  <a href="https://www.draughtslondon.com/faqs/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">Draughts London</a>{" "}
                  — £7.50-£9.50 for up to 3 hours gaming
                </li>
                <li>
                  <a href="https://sevenrooms.com/blog/restaurant-revenue-management-strategies-to-maximize-every-shift/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">SevenRooms (Turn Time)</a>{" "}
                  — Casual dining ~90-minute turn benchmark
                </li>
                <li>
                  <a href="https://support.opentable.com/s/article/Online-Availability-Settings" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">OpenTable Support</a>{" "}
                  — 90-minute table duration default
                </li>
              </ul>

              <h4 className="font-semibold text-ink-primary mt-6 mb-2">No-Show Rate Benchmarks</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://sevenrooms.com/blog/restaurant-reservation-process-leaky-bucket/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">SevenRooms (No-Show Data)</a>{" "}
                  — ~3.5% no-shows with integrated systems
                </li>
                <li>
                  <a href="https://www.opentable.com/restaurant-solutions/resources/no-show-diners-numbers/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">OpenTable (No-Show Report)</a>{" "}
                  — 40% reduction via integrated booking; 28% of Americans have no-showed
                </li>
                <li>
                  <a href="https://www.nowbookit.com/hospitality/restaurant-booking-statistics/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">Nowbookit</a>{" "}
                  — No-shows can reach ~20% without management
                </li>
                <li>
                  <a href="https://www.bistrochat.com/foodforthought/en/posts/usa-restaurant-reservation-systems-market-data.html" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">Bistrochat/ResDiary</a>{" "}
                  — No-shows ~8% in 2023 (up from 5% in 2022)
                </li>
                <li>
                  <a href="https://krghospitality.com/2024/08/06/sevenrooms-drops-extensive-2024-report/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">KRG Hospitality</a>{" "}
                  — Reservation cancellation/no-show research
                </li>
              </ul>

              <h4 className="font-semibold text-ink-primary mt-6 mb-2">Staff Time &amp; Operations</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://uncommonsnyc.com/faq/" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">The Uncommons FAQ</a>{" "}
                  — "Some games can take 30 minutes to check through"
                </li>
                <li>
                  <a href="https://www.imarcgroup.com/board-game-cafe-business-plan-project-report" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">IMARC Group</a>{" "}
                  — Board game café business models require knowledgeable staff
                </li>
              </ul>

              <h4 className="font-semibold text-ink-primary mt-6 mb-2">F&amp;B Attach Behavior</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://kaminsight.com/wp-content/uploads/sites/2044/2024/05/KAM-Competitive-Socialising-Report-May-2024.pdf" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">KAM Competitive Socialising Report (May 2024)</a>{" "}
                  — 58% of visits involve eating; 2 in 5 go for drinks after
                </li>
                <li>
                  <a href="https://publeaders.com.au/wp-content/uploads/sites/7/2025/07/NIQ-On-Premise-Pub-Leaders-Summit-Draft-2025_-Final.pdf" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">NielsenIQ/CGA Pub Leaders Summit</a>{" "}
                  — Average drinks per occasion: 2.9-3.2
                </li>
              </ul>

              <h4 className="font-semibold text-ink-primary mt-6 mb-2">Market Research</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://www.credenceresearch.com/report/board-game-cafes-market" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:no-underline">Credence Research</a>{" "}
                  — Board game café market: F&B integration as core growth driver
                </li>
              </ul>
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
