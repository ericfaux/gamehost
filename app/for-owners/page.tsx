import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import {
  Coins,
  Clock,
  Crown,
  TrendingUp,
  Users,
  Calculator,
  ArrowRight,
  Check,
} from "@/components/icons/lucide-react";

const BASE_URL = "https://gameledger.io";

export const metadata: Metadata = {
  title: "Board Game Cafe Software for Owners",
  description:
    "Turn Friday night chaos into predictable revenue. GameLedger helps cafe owners drive 15% more F&B sales, save 12 min per table, and boost return visits 18%.",
  keywords: [
    "board game cafe software for owners",
    "board game cafe business software",
    "cafe owner software",
    "board game cafe revenue",
    "cafe management for owners",
    "board game cafe ROI",
  ],
  openGraph: {
    title: "Board Game Cafe Software for Owners | GameLedger",
    description:
      "Turn Friday night chaos into predictable revenue. Drive 15% more F&B sales and boost return visits 18%.",
    url: `${BASE_URL}/for-owners`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Board Game Cafe Software for Owners | GameLedger",
    description:
      "Turn Friday night chaos into predictable revenue. Drive 15% more F&B sales and boost return visits 18%.",
  },
  alternates: {
    canonical: `${BASE_URL}/for-owners`,
  },
};

const faqData = [
  {
    question: "What kind of ROI can I expect from GameLedger?",
    answer:
      "Our partner cafes report an average 15% increase in F&B revenue (from faster game selection freeing up time for more orders), 12 minutes saved per table (staff time redirected to hospitality), and an 18% boost in return bookings (better guest experience drives loyalty). For a typical 20-table cafe, this translates to thousands in additional monthly revenue.",
  },
  {
    question: "How long does it take to see results?",
    answer:
      "Most cafes see measurable improvements within the first weekend. The game wizard immediately reduces shelf-staring time, and inventory tracking catches condition issues from day one. The full impact on return visits typically shows within 4-6 weeks as guests experience the improved service and come back.",
  },
  {
    question: "What does the pilot weekend include?",
    answer:
      "The pilot weekend is free and includes full access to GameLedger, dedicated setup support to import your game library, QR codes for your tables, and staff training. We'll help you measure before/after metrics so you can see the real impact on your operations.",
  },
  {
    question: "Is there a long-term contract?",
    answer:
      "No. GameLedger is month-to-month after your pilot. We don't believe in locking you into contracts—we'd rather earn your business every month by delivering real value. Founding members who join during the pilot program also lock in special pricing.",
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

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GameLedger",
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description:
    "The operating system for board game cafes. GameLedger provides smart reservations, BGG-powered game discovery, and inventory management to help cafe owners increase revenue and return visits.",
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    url: `${BASE_URL}/contact`,
  },
};

export default function ForOwnersPage() {
  return (
    <>
      <Script
        id="owners-faq-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
      />
      <Script
        id="owners-organization-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
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
              <Link className="text-ink-primary" href="/for-owners">
                For Owners
              </Link>
              <Link className="hover:text-ink-primary transition-colors" href="/for-managers">
                For Managers
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
              <li className="text-ink-primary font-medium">For Owners</li>
            </ol>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-20">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-start">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.3em] text-ink-secondary">
                For Cafe Owners
              </p>
              <h1 className="text-4xl md:text-5xl leading-[1.05] font-serif text-ink-primary">
                Turn Friday Night Chaos Into Predictable Revenue
              </h1>
              <p className="text-lg md:text-xl text-ink-secondary max-w-2xl leading-relaxed">
                You didn&apos;t open a board game cafe to spend your evenings managing booking
                conflicts and explaining Catan. GameLedger handles the operational chaos so you can
                focus on what matters: <strong>growing your business</strong>.
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
              <div className="absolute inset-0 blur-3xl bg-accent/10 -z-10"></div>
              <div className="relative flex flex-col gap-4">
                {[
                  {
                    title: "Shelf-Staring Guests",
                    description: "20 minutes picking a game = 20 minutes not ordering drinks.",
                  },
                  {
                    title: "Overwhelmed Staff",
                    description: "Your best host stuck explaining rules instead of upselling.",
                  },
                  {
                    title: "Booking Confusion",
                    description:
                      "The 7PM party arrives but the 5PM group is mid-game. Now what?",
                  },
                ].map((card, idx) => (
                  <div
                    key={card.title}
                    className="relative p-5 bg-card border border-stroke rounded-2xl shadow-card"
                    style={{ transform: `rotate(${idx === 1 ? 1 : -0.5 * idx}deg)` }}
                  >
                    <p className="text-sm uppercase tracking-[0.25em] text-accent">Pain Point</p>
                    <p className="mt-2 text-xl font-serif text-ink-primary">{card.title}</p>
                    <p className="text-sm text-ink-secondary mt-1">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Three Outcomes Section */}
        <section className="max-w-6xl mx-auto px-6 pb-20 md:pb-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              The Three Outcomes
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <h2 className="text-3xl font-serif text-ink-primary mb-6 text-center">
            Revenue. Efficiency. Retention.
          </h2>
          <p className="text-lg text-ink-secondary text-center max-w-3xl mx-auto mb-10">
            Every feature in GameLedger is designed to move one of these three needles. Here&apos;s
            what our partner cafes are seeing:
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Coins,
                metric: "15%",
                label: "F&B Revenue Lift",
                description:
                  "When guests pick games in 2 minutes instead of 20, they order more rounds. Faster table turns = more revenue per seat per night.",
                color: "accent",
              },
              {
                icon: Clock,
                metric: "12m",
                label: "Saved Per Table",
                description:
                  "Staff time reclaimed from rule explanations and game searches. Redirected to hospitality, upselling, and floor management.",
                color: "teal",
              },
              {
                icon: Crown,
                metric: "+18%",
                label: "Return Bookings",
                description:
                  "Better guest experience drives loyalty. Guests who have a smooth visit come back—and bring friends.",
                color: "success",
              },
            ].map((outcome) => (
              <div
                key={outcome.label}
                className="p-6 rounded-2xl bg-card border border-stroke shadow-card"
                style={{
                  borderTopWidth: "4px",
                  borderTopColor:
                    outcome.color === "accent"
                      ? "var(--color-accent)"
                      : outcome.color === "teal"
                      ? "var(--color-teal)"
                      : "var(--color-success)",
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <outcome.icon
                    className={`h-6 w-6 ${
                      outcome.color === "accent"
                        ? "text-accent"
                        : outcome.color === "teal"
                        ? "text-brandTeal"
                        : "text-success"
                    }`}
                  />
                  <span
                    className={`text-xs uppercase tracking-[0.2em] font-semibold ${
                      outcome.color === "accent"
                        ? "text-accent"
                        : outcome.color === "teal"
                        ? "text-brandTeal"
                        : "text-success"
                    }`}
                  >
                    {outcome.color === "accent"
                      ? "Revenue"
                      : outcome.color === "teal"
                      ? "Efficiency"
                      : "Retention"}
                  </span>
                </div>
                <p className="text-4xl font-serif text-ink-primary mb-1">{outcome.metric}</p>
                <p className="text-sm uppercase tracking-[0.15em] text-ink-secondary mb-3">
                  {outcome.label}
                </p>
                <p className="text-ink-secondary leading-relaxed">{outcome.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="max-w-5xl mx-auto px-6 pb-20 md:pb-24 bg-section-warm py-10 rounded-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Partner Stories
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <h2 className="text-3xl font-serif text-ink-primary mb-8 text-center">
            What Owners Are Saying
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <article
              className="border border-stroke rounded-2xl bg-card shadow-card overflow-hidden"
              style={{ borderLeftWidth: "6px", borderLeftColor: "#C64D2F" }}
            >
              <div className="p-6">
                <p className="text-lg font-serif text-ink-primary leading-relaxed">
                  &ldquo;Guests pick faster and we sell more rounds—GameLedger made our busy nights
                  manageable. Our F&B revenue is up noticeably, and my staff actually enjoys Friday
                  nights now instead of dreading them.&rdquo;
                </p>
                <div className="mt-4 pt-4 border-t border-stroke/50">
                  <p className="font-semibold text-ink-primary">Partner Cafe #1</p>
                  <p className="text-sm text-ink-secondary">Owner, 24-table venue</p>
                </div>
              </div>
            </article>
            <article
              className="border border-stroke rounded-2xl bg-card shadow-card overflow-hidden"
              style={{ borderLeftWidth: "6px", borderLeftColor: "var(--color-teal)" }}
            >
              <div className="p-6">
                <p className="text-lg font-serif text-ink-primary leading-relaxed">
                  &ldquo;Scan to Play cut decision time to under two minutes and boosted repeat
                  visits. I can finally see which games are worth the shelf space and which ones
                  should go. Data-driven decisions instead of guesswork.&rdquo;
                </p>
                <div className="mt-4 pt-4 border-t border-stroke/50">
                  <p className="font-semibold text-ink-primary">Riverside Games</p>
                  <p className="text-sm text-ink-secondary">Owner, 18-table venue</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* ROI Calculator Section */}
        <section className="max-w-5xl mx-auto px-6 py-20 md:py-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              ROI Calculator
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <div className="grid md:grid-cols-[1fr_1.2fr] gap-10 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calculator className="h-8 w-8 text-brandTeal" />
                <h2 className="text-3xl font-serif text-ink-primary">Calculate Your ROI</h2>
              </div>
              <p className="text-lg text-ink-secondary leading-relaxed">
                Every cafe is different, but the math is consistent. Here&apos;s a rough estimate
                of what GameLedger could mean for your bottom line:
              </p>
            </div>
            <div className="bg-card rounded-2xl border border-stroke shadow-floating p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-xl bg-surface border border-stroke">
                  <span className="text-ink-secondary">Tables</span>
                  <span className="font-semibold text-ink-primary font-mono">20</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-surface border border-stroke">
                  <span className="text-ink-secondary">Avg. sessions/table/night</span>
                  <span className="font-semibold text-ink-primary font-mono">2.5</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-surface border border-stroke">
                  <span className="text-ink-secondary">Nights open/week</span>
                  <span className="font-semibold text-ink-primary font-mono">6</span>
                </div>
                <div className="border-t border-stroke pt-4">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-success/10 border border-success/30">
                    <span className="text-success font-semibold">Est. Monthly Revenue Lift</span>
                    <span className="font-serif text-2xl text-success">$1,800+</span>
                  </div>
                  <p className="text-xs text-ink-secondary mt-3 text-center">
                    Based on 15% F&B lift from faster table turns and improved guest experience
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-stroke text-center">
                <Link
                  href="/demo"
                  className="text-accent font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Get a personalized ROI estimate
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pilot Offer Section */}
        <section className="max-w-5xl mx-auto px-6 pb-20 md:pb-24 bg-section-teal py-10 rounded-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Pilot Program
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-serif text-ink-primary">
                Free Pilot Weekend + Founding Member Pricing
              </h2>
              <p className="text-lg text-ink-secondary leading-relaxed">
                We&apos;re onboarding a limited number of cafes for our founding partner program.
                Start with a free pilot weekend to prove the value, then lock in special pricing if
                you continue.
              </p>
              <ul className="space-y-3 text-ink-primary font-medium">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  Full access during pilot weekend—no restrictions
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  Dedicated setup support and staff training
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  Before/after metrics tracking
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  Founding member pricing locked in forever
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  No long-term contracts—month-to-month
                </li>
              </ul>
            </div>
            <div className="bg-card rounded-2xl border border-stroke shadow-floating p-6 text-center">
              <p className="text-xs uppercase tracking-[0.25em] text-ink-secondary mb-2">
                Limited Availability
              </p>
              <p className="text-4xl font-serif text-ink-primary mb-2">Free Pilot</p>
              <p className="text-ink-secondary mb-6">
                One weekend, full access, zero commitment
              </p>
              <Link
                href="/pilot"
                className="inline-flex items-center justify-center w-full px-6 py-3 rounded-full bg-accent text-card font-semibold shadow-floating border border-ink-primary/5 transition-transform duration-300 hover:-translate-y-0.5"
              >
                Request a pilot weekend
              </Link>
              <p className="text-xs text-ink-secondary mt-4">
                Founding member spots remaining: <span className="font-semibold">7</span>
              </p>
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
            Questions from Owners
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
              Take the Next Step
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <h3 className="text-3xl font-serif text-ink-primary mb-4">
            Ready to transform your Friday nights?
          </h3>
          <p className="text-lg text-ink-secondary mb-8 max-w-2xl mx-auto">
            Join the cafes that have turned operational chaos into predictable revenue. Start with
            a free pilot weekend and see the results for yourself.
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
              href="/features/inventory"
              className="group p-6 rounded-2xl bg-card border border-stroke shadow-card hover:shadow-floating transition-all duration-300"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-brandTeal font-semibold">
                Feature
              </p>
              <p className="mt-2 text-lg font-serif text-ink-primary group-hover:text-brandTeal transition-colors">
                Inventory Management
              </p>
              <p className="text-sm text-ink-secondary mt-1">
                Track conditions, import from BGG, and know what to buy or retire.
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
