import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import {
  Library,
  Download,
  AlertTriangle,
  TrendingUp,
  Check,
  Wrench,
  BarChart3,
  ArrowRight,
} from "@/components/icons/lucide-react";

const BASE_URL = "https://gameledger.io";

export const metadata: Metadata = {
  title: "Board Game Library Management Software",
  description:
    "Track game conditions, import 500+ games from BGG in minutes, and use analytics to know what to buy or retire. Built for board game cafes.",
  keywords: [
    "board game cafe inventory management",
    "board game library management",
    "game condition tracking",
    "BGG import",
    "board game cafe software",
    "game library software",
  ],
  openGraph: {
    title: "Board Game Library Management & Inventory Tracking | GameLedger",
    description:
      "Track game conditions, import from BGG in minutes, and use analytics to know what to buy or retire.",
    url: `${BASE_URL}/features/inventory`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Board Game Library Management | GameLedger",
    description:
      "Track game conditions, import from BGG in minutes, and use analytics to know what to buy or retire.",
  },
  alternates: {
    canonical: `${BASE_URL}/features/inventory`,
  },
};

const faqData = [
  {
    question: "How does the BGG import work?",
    answer:
      "Simply search for games by name and we pull all the metadata directly from the BoardGameGeek API—player counts, playtime, complexity ratings, descriptions, and images. You can add your entire 500+ game library in minutes instead of weeks of manual data entry.",
  },
  {
    question: "How do staff log game conditions?",
    answer:
      "At the end of each session, staff can mark a game's condition with one tap: Good, Minor Issue, or Needs Repair. If flagged, they can add a quick note like 'Missing red dice' or 'Box corner damaged'. The system automatically removes damaged games from recommendations until fixed.",
  },
  {
    question: "What analytics do I get about my library?",
    answer:
      "GameLedger tracks play frequency, average session duration, condition history, and popularity trends. You'll see which games are earning their shelf space and which are gathering dust—data you need to make smart purchasing and retirement decisions.",
  },
  {
    question: "Can I track multiple copies of the same game?",
    answer:
      "Yes. Each physical copy gets its own tracking record. So if you have 3 copies of Catan, you can see which specific copy has condition issues, which gets played most often, and manage them independently.",
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

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GameLedger Inventory Management",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "InventoryManagement",
  operatingSystem: "Web-based",
  description:
    "Board game library management and inventory tracking system for cafes. Features instant BGG import, real-time condition tracking, and usage analytics.",
  url: `${BASE_URL}/features/inventory`,
  offers: {
    "@type": "Offer",
    name: "Free Pilot Weekend",
    price: "0",
    priceCurrency: "USD",
    description: "Try our inventory management system risk-free with a complimentary pilot weekend.",
  },
  featureList: [
    "Instant BGG metadata import",
    "Real-time condition tracking",
    "Multi-copy management",
    "Usage analytics dashboard",
    "Automatic damage flagging",
    "Purchase/retire recommendations",
  ],
};

export default function InventoryPage() {
  return (
    <>
      <Script
        id="inventory-faq-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
      />
      <Script
        id="inventory-software-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
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
              <Link className="text-ink-primary" href="/features/inventory">
                Inventory
              </Link>
              <Link className="hover:text-ink-primary transition-colors" href="/blog">
                Blog
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
              <li>
                <Link href="/features/inventory" className="hover:text-ink-primary transition-colors">
                  Features
                </Link>
              </li>
              <li>/</li>
              <li className="text-ink-primary font-medium">Inventory</li>
            </ol>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.3em] text-ink-secondary">
                Library Management
              </p>
              <h1 className="text-4xl md:text-5xl leading-[1.05] font-serif text-ink-primary">
                Board Game Library Management &amp; Inventory Tracking
              </h1>
              <p className="text-lg md:text-xl text-ink-secondary max-w-2xl leading-relaxed">
                Stop losing money on damaged games and dusty shelves. GameLedger tracks every play,
                every condition issue, and tells you exactly what to buy or retire—backed by{" "}
                <strong>real data from your community</strong>.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-ink-primary text-card font-semibold shadow-floating transition-transform duration-300 hover:-translate-y-0.5 border border-ink-primary"
                >
                  Book a demo
                </Link>
                <Link
                  href="/pilot"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-accent text-card font-semibold shadow-floating border border-ink-primary/5 transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Start a pilot weekend
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -left-4 -right-4 -top-4 -bottom-4 border border-stroke rounded-3xl"></div>
              <div className="relative bg-card rounded-3xl shadow-floating p-6 border border-stroke">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
                    Library Dashboard
                  </p>
                  <span className="px-3 py-1 rounded-full bg-success/15 text-success text-xs font-semibold border border-success/30">
                    512 GAMES
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { title: "Azul", copies: "3 copies", status: "All Good", statusColor: "success" },
                    { title: "Scythe", copies: "2 copies", status: "1 Needs Repair", statusColor: "warn" },
                    { title: "Wingspan", copies: "2 copies", status: "All Good", statusColor: "success" },
                    { title: "Catan", copies: "4 copies", status: "1 Missing Piece", statusColor: "danger" },
                  ].map((game) => (
                    <div
                      key={game.title}
                      className="flex items-center justify-between p-3 rounded-xl border border-stroke bg-surface"
                    >
                      <div>
                        <p className="font-semibold text-ink-primary">{game.title}</p>
                        <p className="text-xs text-ink-secondary">{game.copies}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                          game.statusColor === "success"
                            ? "bg-success/10 text-success border border-success/30"
                            : game.statusColor === "warn"
                            ? "bg-warn/10 text-warn border border-warn/30"
                            : "bg-danger/10 text-danger border border-danger/30"
                        }`}
                      >
                        {game.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hidden Cost Section */}
        <section className="max-w-5xl mx-auto px-6 pb-20 md:pb-24 bg-section-warm py-10 rounded-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              The Hidden Cost
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h2 className="text-3xl font-serif text-ink-primary">
                Damaged Games &amp; Missing Pieces Are Bleeding Revenue
              </h2>
              <p className="text-lg text-ink-secondary leading-relaxed">
                Every incomplete game that makes it to a table costs you: a frustrated customer, a
                bad review, and a game you can&apos;t sell or recommend. Most cafes don&apos;t know a
                game is damaged until it&apos;s too late.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-card border border-stroke shadow-card">
                  <p className="text-3xl font-serif text-danger">23%</p>
                  <p className="text-sm text-ink-secondary mt-1">
                    of games have unreported condition issues
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-card border border-stroke shadow-card">
                  <p className="text-3xl font-serif text-warn">$2,400</p>
                  <p className="text-sm text-ink-secondary mt-1">
                    avg. annual cost from damaged inventory
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: "The Missing Piece",
                  description:
                    "Guest discovers halfway through setup that critical pieces are gone. Session ruined.",
                },
                {
                  title: "The Silent Damage",
                  description:
                    "Box looks fine on the shelf, but the rulebook is torn and tokens are scratched.",
                },
                {
                  title: "The Dusty Shelf",
                  description:
                    "Games nobody plays take up space. Without data, you don't know which to retire.",
                },
              ].map((card, idx) => (
                <div
                  key={card.title}
                  className="relative p-5 bg-card border border-stroke rounded-2xl shadow-card"
                  style={{ transform: `rotate(${idx === 1 ? 1 : -0.5}deg)` }}
                >
                  <p className="text-sm uppercase tracking-[0.25em] text-danger">Problem</p>
                  <p className="mt-2 text-xl font-serif text-ink-primary">{card.title}</p>
                  <p className="text-sm text-ink-secondary mt-1">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BGG Import Section */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Instant Setup
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-10 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Download className="h-8 w-8 text-brandTeal" />
                <h2 className="text-3xl font-serif text-ink-primary">
                  500+ Games in Minutes
                </h2>
              </div>
              <p className="text-lg text-ink-secondary leading-relaxed">
                Forget weeks of manual data entry. GameLedger connects directly to the{" "}
                <strong>BoardGameGeek API</strong> to pull player counts, playtime, complexity
                ratings, descriptions, and images automatically.
              </p>
              <ul className="space-y-3 text-ink-primary font-medium">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  Search by name, instant metadata pull
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  Accurate player counts and playtimes
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  Complexity ratings for the game wizard
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  High-quality box art images
                </li>
              </ul>
            </div>
            <div className="bg-card rounded-2xl border border-stroke shadow-floating p-6">
              <div className="flex items-center gap-3 mb-4">
                <Library className="h-5 w-5 text-brandTeal" />
                <p className="text-sm font-semibold text-ink-primary">BGG Import</p>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-surface border border-stroke">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-brandTeal/10 flex items-center justify-center">
                      <span className="text-2xl">🎲</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-ink-primary">Wingspan</p>
                      <p className="text-xs text-ink-secondary">1-5 players • 40-70 min • Weight: 2.4</p>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-brandTeal text-card text-sm font-semibold">
                      Add
                    </button>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-surface border border-stroke">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-brandTeal/10 flex items-center justify-center">
                      <span className="text-2xl">🏰</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-ink-primary">Azul</p>
                      <p className="text-xs text-ink-secondary">2-4 players • 30-45 min • Weight: 1.8</p>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-success/10 text-success text-sm font-semibold border border-success/30">
                      Added
                    </span>
                  </div>
                </div>
                <p className="text-xs text-ink-secondary text-center pt-2">
                  Data powered by BoardGameGeek API
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Condition Tracking Section */}
        <section className="max-w-6xl mx-auto px-6 pb-20 md:pb-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Condition Tracking
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <h2 className="text-3xl font-serif text-ink-primary mb-6">
            Real-Time Condition Tracking Across Shifts
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Wrench,
                title: "One-Tap Logging",
                description:
                  "Staff marks condition at session end: Good, Minor Issue, or Needs Repair. Takes 5 seconds.",
                color: "accent",
              },
              {
                icon: AlertTriangle,
                title: "Auto-Remove",
                description:
                  "Damaged games are instantly hidden from the recommendation engine. No more bad surprises.",
                color: "warn",
              },
              {
                icon: Library,
                title: "Shift Handoff",
                description:
                  "Condition notes persist across shifts. Morning staff sees what night staff flagged.",
                color: "teal",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-card border border-stroke shadow-card"
                style={{
                  borderTopWidth: "4px",
                  borderTopColor:
                    feature.color === "accent"
                      ? "var(--color-accent)"
                      : feature.color === "warn"
                      ? "var(--color-warn)"
                      : "var(--color-teal)",
                }}
              >
                <feature.icon
                  className={`h-8 w-8 mb-4 ${
                    feature.color === "accent"
                      ? "text-accent"
                      : feature.color === "warn"
                      ? "text-warn"
                      : "text-brandTeal"
                  }`}
                />
                <h3 className="text-xl font-serif text-ink-primary mb-2">{feature.title}</h3>
                <p className="text-ink-secondary leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Analytics Section */}
        <section className="max-w-5xl mx-auto px-6 pb-20 md:pb-24 bg-section-teal py-10 rounded-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Usage Analytics
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <div className="grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-brandTeal" />
                <h2 className="text-3xl font-serif text-ink-primary">
                  Know What to Buy &amp; Retire
                </h2>
              </div>
              <p className="text-lg text-ink-secondary leading-relaxed">
                Stop guessing. GameLedger tracks every session so you can see which games are
                earning their shelf space and which are gathering dust.
              </p>
              <ul className="space-y-3 text-ink-primary font-medium">
                <li className="flex items-start gap-2">
                  <BarChart3 className="mt-1 h-4 w-4 text-brandTeal" />
                  Play frequency by game and copy
                </li>
                <li className="flex items-start gap-2">
                  <BarChart3 className="mt-1 h-4 w-4 text-brandTeal" />
                  Average session duration trends
                </li>
                <li className="flex items-start gap-2">
                  <BarChart3 className="mt-1 h-4 w-4 text-brandTeal" />
                  Condition history over time
                </li>
                <li className="flex items-start gap-2">
                  <BarChart3 className="mt-1 h-4 w-4 text-brandTeal" />
                  Popularity trends by player count
                </li>
              </ul>
            </div>
            <div className="bg-card rounded-2xl border border-stroke shadow-floating p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-ink-secondary mb-4">
                Top Performers This Month
              </p>
              <div className="space-y-3">
                {[
                  { game: "Azul", plays: 47, trend: "+12%" },
                  { game: "Ticket to Ride", plays: 42, trend: "+8%" },
                  { game: "Wingspan", plays: 38, trend: "+15%" },
                  { game: "Codenames", plays: 35, trend: "-3%" },
                ].map((item, idx) => (
                  <div
                    key={item.game}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface border border-stroke"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-brandTeal/10 text-brandTeal text-xs font-semibold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-ink-primary">{item.game}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-ink-secondary">{item.plays} plays</span>
                      <span
                        className={`text-xs font-semibold ${
                          item.trend.startsWith("+") ? "text-success" : "text-danger"
                        }`}
                      >
                        {item.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-6 py-20 md:py-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">FAQ</span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <h2 className="text-3xl font-serif text-ink-primary mb-8">
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
                    ▼
                  </span>
                </summary>
                <div className="px-5 pb-5 text-ink-secondary leading-relaxed border-t border-stroke/50 pt-4">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-4xl mx-auto px-6 pb-16 md:pb-24 text-center bg-cta-warm py-12 rounded-3xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Get Started
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <h3 className="text-3xl font-serif text-ink-primary mb-4">
            Ready to take control of your library?
          </h3>
          <p className="text-lg text-ink-secondary mb-8 max-w-2xl mx-auto">
            Book a demo to see how GameLedger&apos;s inventory management can save you thousands in
            damaged games and help you make smarter purchasing decisions.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-ink-primary text-card font-semibold shadow-floating transition-transform duration-300 hover:-translate-y-0.5 border border-ink-primary"
            >
              Book a demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pilot"
              className="px-6 py-3 rounded-full bg-accent text-card font-semibold shadow-floating border border-ink-primary/5 transition-transform duration-300 hover:-translate-y-0.5"
            >
              Start a pilot weekend
            </Link>
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
              href="/features/reservations"
              className="group p-6 rounded-2xl bg-card border border-stroke shadow-card hover:shadow-floating transition-all duration-300"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-accent font-semibold">
                Feature
              </p>
              <p className="mt-2 text-lg font-serif text-ink-primary group-hover:text-accent transition-colors">
                Reservation System
              </p>
              <p className="text-sm text-ink-secondary mt-1">
                Inventory-aware bookings that eliminate ghost tables.
              </p>
            </Link>
            <Link
              href="/for-owners"
              className="group p-6 rounded-2xl bg-card border border-stroke shadow-card hover:shadow-floating transition-all duration-300"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-brandTeal font-semibold">
                For Owners
              </p>
              <p className="mt-2 text-lg font-serif text-ink-primary group-hover:text-brandTeal transition-colors">
                Turn Chaos Into Revenue
              </p>
              <p className="text-sm text-ink-secondary mt-1">
                See how GameLedger drives revenue, efficiency, and retention.
              </p>
            </Link>
            <Link
              href="/for-managers"
              className="group p-6 rounded-2xl bg-card border border-stroke shadow-card hover:shadow-floating transition-all duration-300"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-success font-semibold">
                For Managers
              </p>
              <p className="mt-2 text-lg font-serif text-ink-primary group-hover:text-success transition-colors">
                Run a Tighter Ship
              </p>
              <p className="text-sm text-ink-secondary mt-1">
                Operations tools for daily floor management and staff workflows.
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
