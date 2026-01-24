import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { Calendar, Clock, Users, Check, X, AlertTriangle, ArrowRight } from "@/components/icons/lucide-react";

const BASE_URL = "https://gameledger.io";

export const metadata: Metadata = {
  title: "Board Game Cafe Reservation System",
  description:
    "Inventory-aware booking system for board game cafes. Prevent ghost tables, double-bookings, and sync reservations with your game library.",
  keywords: [
    "board game cafe reservation system",
    "board game cafe booking software",
    "inventory-aware reservations",
    "cafe table management",
    "game cafe scheduling",
  ],
  openGraph: {
    title: "Board Game Cafe Reservation System | GameLedger",
    description:
      "Inventory-aware booking system for board game cafes. Prevent ghost tables and double-bookings.",
    url: `${BASE_URL}/features/reservations`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Board Game Cafe Reservation System | GameLedger",
    description:
      "Inventory-aware booking system for board game cafes. Prevent ghost tables and double-bookings.",
  },
  alternates: {
    canonical: `${BASE_URL}/features/reservations`,
  },
};

const faqData = [
  {
    question: "How is GameLedger different from OpenTable or Calendly?",
    answer:
      "Generic booking tools only manage time slots—they don't understand your actual capacity. GameLedger knows which tables are currently occupied, which games are in play, and how long sessions typically run. This means no more 'ghost tables' where a booking shows available but the physical table is still occupied.",
  },
  {
    question: "Can guests reserve specific games when they book?",
    answer:
      "Yes. Because our reservation system is connected to your inventory, guests can request specific games during booking. If Scythe is their must-play, they can reserve it along with their table—ensuring it's available when they arrive.",
  },
  {
    question: "What happens if a session runs over the booked time?",
    answer:
      "GameLedger tracks live session status. If Table 4 is running long, your host dashboard shows a warning before the next booking arrives. Staff can proactively manage transitions instead of discovering conflicts when guests show up.",
  },
  {
    question: "Do you charge commission on bookings?",
    answer:
      "No. Unlike platforms that take a cut of every reservation, GameLedger is flat-fee software. Your bookings are yours—we don't tax your success.",
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
  name: "GameLedger Reservation System",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "ReservationSystem",
  operatingSystem: "Web-based",
  description:
    "Inventory-aware reservation system designed specifically for board game cafes. Syncs bookings with live table status and game availability to eliminate double-bookings and ghost tables.",
  url: `${BASE_URL}/features/reservations`,
  offers: {
    "@type": "Offer",
    name: "Free Pilot Weekend",
    price: "0",
    priceCurrency: "USD",
    description: "Try our reservation system risk-free with a complimentary pilot weekend.",
  },
  featureList: [
    "Inventory-aware table booking",
    "Live session tracking",
    "Game reservation during booking",
    "Ghost table prevention",
    "Real-time availability sync",
    "No booking commissions",
  ],
};

const comparisonData = [
  {
    feature: "Understands Game Sessions",
    gameledger: true,
    opentable: false,
    calendly: false,
    spreadsheets: false,
  },
  {
    feature: "Prevents Ghost Tables",
    gameledger: true,
    opentable: false,
    calendly: false,
    spreadsheets: false,
  },
  {
    feature: "Game Reservation with Booking",
    gameledger: true,
    opentable: false,
    calendly: false,
    spreadsheets: false,
  },
  {
    feature: "Live Session Tracking",
    gameledger: true,
    opentable: false,
    calendly: false,
    spreadsheets: false,
  },
  {
    feature: "Syncs with Inventory",
    gameledger: true,
    opentable: false,
    calendly: false,
    spreadsheets: false,
  },
  {
    feature: "No Booking Commission",
    gameledger: true,
    opentable: false,
    calendly: true,
    spreadsheets: true,
  },
  {
    feature: "Real-time Availability",
    gameledger: true,
    opentable: true,
    calendly: true,
    spreadsheets: false,
  },
];

export default function ReservationsPage() {
  return (
    <>
      <Script
        id="reservations-faq-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
      />
      <Script
        id="reservations-software-schema"
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
              <Link className="text-ink-primary" href="/features/reservations">
                Reservations
              </Link>
              <Link className="hover:text-ink-primary transition-colors" href="/features/inventory">
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
                <Link href="/features/reservations" className="hover:text-ink-primary transition-colors">
                  Features
                </Link>
              </li>
              <li>/</li>
              <li className="text-ink-primary font-medium">Reservations</li>
            </ol>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.3em] text-ink-secondary">
                Inventory-Aware Bookings
              </p>
              <h1 className="text-4xl md:text-5xl leading-[1.05] font-serif text-ink-primary">
                Board Game Cafe Reservation System That Knows Your Inventory
              </h1>
              <p className="text-lg md:text-xl text-ink-secondary max-w-2xl leading-relaxed">
                Generic booking tools manage time slots. GameLedger manages{" "}
                <strong>reality</strong>—syncing reservations with live table status, game
                availability, and session duration so you never overbook again.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href="/pilot"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-accent text-card font-semibold shadow-floating border border-ink-primary/5 transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Start a pilot weekend
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-ink-primary text-card font-semibold shadow-floating transition-transform duration-300 hover:-translate-y-0.5 border border-ink-primary"
                >
                  Book a demo
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -left-4 -right-4 -top-4 -bottom-4 border border-stroke rounded-3xl"></div>
              <div className="relative bg-card rounded-3xl shadow-floating p-6 border border-stroke">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
                    Live Floor Status
                  </p>
                  <span className="px-3 py-1 rounded-full bg-brandTeal/15 text-brandTeal text-xs font-semibold border border-brandTeal/30">
                    SYNCED
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { table: "Table 2", status: "Available", time: "7:00 PM slot open", color: "success" },
                    { table: "Table 4", status: "In Session", time: "Ends ~7:15 PM", color: "teal" },
                    { table: "Table 6", status: "Reserved", time: "7:30 PM - Party of 4", color: "accent" },
                  ].map((row) => (
                    <div
                      key={row.table}
                      className="flex items-center justify-between p-3 rounded-xl border border-stroke bg-surface"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-3 w-3 rounded-full ${
                            row.color === "success"
                              ? "bg-success"
                              : row.color === "teal"
                              ? "bg-brandTeal"
                              : "bg-accent"
                          }`}
                        ></span>
                        <span className="font-semibold text-ink-primary">{row.table}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-ink-primary">{row.status}</p>
                        <p className="text-xs text-ink-secondary">{row.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="max-w-5xl mx-auto px-6 pb-20 md:pb-24 bg-section-warm py-10 rounded-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">The Problem</span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h2 className="text-3xl font-serif text-ink-primary">
                Why Generic Booking Tools Fail Board Game Cafes
              </h2>
              <p className="text-lg text-ink-secondary leading-relaxed">
                OpenTable, Calendly, and spreadsheets were built for restaurants and meetings—not
                game sessions. They don&apos;t understand that a &ldquo;2-hour booking&rdquo; for
                Twilight Imperium might actually run 4 hours.
              </p>
              <ul className="space-y-3 text-ink-primary font-medium">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-danger"></span>
                  They can&apos;t see if a table is still occupied by an ongoing session
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-danger"></span>
                  They don&apos;t know which games are available to reserve
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-danger"></span>
                  They create awkward conflicts when bookings overlap reality
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: "The Blind Slot",
                  description:
                    "A 7PM booking arrives, but the 5PM group is mid-game. Now what?",
                },
                {
                  title: "The Missing Game",
                  description:
                    "Guest reserved 'Scythe night' but someone else grabbed it an hour ago.",
                },
                {
                  title: "The Double-Book",
                  description:
                    "Two parties show up for the same premium booth. Staff plays referee.",
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

        {/* Solution Section */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              The GameLedger Way
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <h2 className="text-3xl font-serif text-ink-primary mb-6">
            Inventory-Aware Bookings That Actually Work
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Calendar,
                title: "Live Table Sync",
                description:
                  "Reservations see real-time table status. If Table 4 is in a session, the booking system knows—and adjusts availability accordingly.",
                color: "accent",
              },
              {
                icon: Users,
                title: "Game Reservations",
                description:
                  "Let guests reserve specific games when they book. Scythe enthusiasts can guarantee their copy is waiting when they arrive.",
                color: "teal",
              },
              {
                icon: Clock,
                title: "Smart Duration",
                description:
                  "BGG data helps estimate session length. A Ticket to Ride booking gets different buffer time than a Twilight Imperium marathon.",
                color: "success",
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
                      : feature.color === "teal"
                      ? "var(--color-teal)"
                      : "var(--color-success)",
                }}
              >
                <feature.icon
                  className={`h-8 w-8 mb-4 ${
                    feature.color === "accent"
                      ? "text-accent"
                      : feature.color === "teal"
                      ? "text-brandTeal"
                      : "text-success"
                  }`}
                />
                <h3 className="text-xl font-serif text-ink-primary mb-2">{feature.title}</h3>
                <p className="text-ink-secondary leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Ghost Table Section */}
        <section className="max-w-5xl mx-auto px-6 pb-20 md:pb-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Ghost Tables
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-10 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-serif text-ink-primary">
                The &ldquo;Ghost Table&rdquo; Problem—Solved
              </h2>
              <p className="text-lg text-ink-secondary leading-relaxed">
                A &ldquo;Ghost Table&rdquo; happens when your booking system shows a table as
                available, but it&apos;s actually still occupied. The 7PM reservation arrives to
                find the 5PM group deep into Pandemic Legacy.
              </p>
              <p className="text-ink-secondary leading-relaxed">
                GameLedger eliminates ghost tables by connecting reservations to live session
                tracking. Your host dashboard shows real-time status, and the booking system only
                offers slots that are actually available.
              </p>
            </div>
            <div className="bg-card rounded-2xl border border-stroke shadow-floating p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-5 w-5 text-warn" />
                <p className="text-sm font-semibold text-ink-primary">Ghost Table Alert</p>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-warn/10 border border-warn/30">
                  <p className="text-sm font-mono text-ink-primary">
                    <span className="text-warn font-semibold">WITHOUT GAMELEDGER:</span>
                  </p>
                  <p className="text-sm text-ink-secondary mt-1">
                    Table 4 shows &ldquo;Available 7PM&rdquo; in OpenTable, but it&apos;s 6:45 and the current
                    group is mid-game. Conflict incoming.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                  <p className="text-sm font-mono text-ink-primary">
                    <span className="text-success font-semibold">WITH GAMELEDGER:</span>
                  </p>
                  <p className="text-sm text-ink-secondary mt-1">
                    Table 4 shows &ldquo;In Session until ~7:15 PM&rdquo;. Next available slot automatically
                    adjusts to 7:30 PM. No surprises.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="max-w-6xl mx-auto px-6 pb-20 md:pb-24 bg-section-teal py-10 rounded-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Comparison
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <h2 className="text-3xl font-serif text-ink-primary mb-6">
            GameLedger vs. Generic Booking Tools
          </h2>
          <div className="rounded-2xl border border-stroke bg-card shadow-floating overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-stroke">
                  <th className="px-4 py-3 text-left font-mono text-xs uppercase tracking-wider text-ink-secondary">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-wider text-brandTeal">
                    GameLedger
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-wider text-ink-secondary">
                    OpenTable
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-wider text-ink-secondary">
                    Calendly
                  </th>
                  <th className="px-4 py-3 text-center font-mono text-xs uppercase tracking-wider text-ink-secondary">
                    Spreadsheets
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className={idx !== comparisonData.length - 1 ? "border-b border-stroke" : ""}
                  >
                    <td className="px-4 py-4 font-serif text-ink-primary">{row.feature}</td>
                    <td className="px-4 py-4 text-center col-highlight-success">
                      {row.gameledger ? (
                        <Check className="h-5 w-5 text-success mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-danger mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {row.opentable ? (
                        <Check className="h-5 w-5 text-success mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-ink-secondary/40 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {row.calendly ? (
                        <Check className="h-5 w-5 text-success mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-ink-secondary/40 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {row.spreadsheets ? (
                        <Check className="h-5 w-5 text-success mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-ink-secondary/40 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-6 pb-20 md:pb-24">
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
            Ready to eliminate ghost tables?
          </h3>
          <p className="text-lg text-ink-secondary mb-8 max-w-2xl mx-auto">
            Start a pilot weekend and see how inventory-aware reservations transform your Friday
            nights. No commitment, no risk—just better bookings.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/pilot"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-accent text-card font-semibold shadow-floating border border-ink-primary/5 transition-transform duration-300 hover:-translate-y-0.5"
            >
              Start a pilot weekend
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/demo"
              className="px-6 py-3 rounded-full bg-ink-primary text-card font-semibold shadow-floating transition-transform duration-300 hover:-translate-y-0.5 border border-ink-primary"
            >
              Book a demo
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
              href="/features/inventory"
              className="group p-6 rounded-2xl bg-card border border-stroke shadow-card hover:shadow-floating transition-all duration-300"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-accent font-semibold">
                Feature
              </p>
              <p className="mt-2 text-lg font-serif text-ink-primary group-hover:text-accent transition-colors">
                Inventory Management
              </p>
              <p className="text-sm text-ink-secondary mt-1">
                Track conditions, import from BGG, and know what to buy or retire.
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
