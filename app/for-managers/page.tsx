import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import {
  LayoutDashboard,
  RefreshCw,
  Users,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Check,
  Zap,
} from "@/components/icons/lucide-react";

const BASE_URL = "https://gameledger.io";

export const metadata: Metadata = {
  title: "Board Game Cafe Operations Software",
  description:
    "Operations tools for cafe managers. Host dashboard, real-time floor sync, staff workflows, and shift handoff that survives staff changes.",
  keywords: [
    "board game cafe operations software",
    "cafe manager software",
    "host dashboard",
    "board game cafe floor management",
    "cafe operations tools",
    "staff workflow software",
  ],
  openGraph: {
    title: "Board Game Cafe Operations Software for Managers | GameLedger",
    description:
      "Operations tools for cafe managers. Host dashboard, real-time sync, and staff workflows.",
    url: `${BASE_URL}/for-managers`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Board Game Cafe Operations Software | GameLedger",
    description:
      "Operations tools for cafe managers. Host dashboard, real-time sync, and staff workflows.",
  },
  alternates: {
    canonical: `${BASE_URL}/for-managers`,
  },
};

const faqData = [
  {
    question: "What devices does the Host Dashboard run on?",
    answer:
      "The Host Dashboard runs in any modern web browser—no special hardware required. Most cafes use a tablet at the host stand, but it works equally well on laptops or desktop computers. Staff can also access it from their phones for quick updates on the floor.",
  },
  {
    question: "How does condition tracking work across shifts?",
    answer:
      "When staff flag a game issue (missing piece, damaged box, etc.), it's logged with a timestamp and note. The next shift sees these flags immediately—no verbal handoffs needed. Games marked 'Needs Repair' are automatically hidden from guest recommendations until fixed.",
  },
  {
    question: "Can different staff have different permission levels?",
    answer:
      "Yes. Managers get full access to settings, analytics, and library management. Floor staff get streamlined access focused on session tracking and condition logging. You control who can do what.",
  },
  {
    question: "What happens when we get a rush and don't have time to log everything?",
    answer:
      "GameLedger is designed for busy nights. Session starts and ends are one-tap. Condition logging is optional per session (though recommended). The system helps during rushes, not adds to the chaos. Most actions take under 5 seconds.",
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
  name: "GameLedger Operations Dashboard",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "OperationsManagement",
  operatingSystem: "Web-based",
  description:
    "Operations management software for board game cafe managers. Features real-time floor tracking, staff workflows, condition logging, and shift handoff tools.",
  url: `${BASE_URL}/for-managers`,
  offers: {
    "@type": "Offer",
    name: "Free Pilot Weekend",
    price: "0",
    priceCurrency: "USD",
    description: "Try our operations tools risk-free with a complimentary pilot weekend.",
  },
  featureList: [
    "Real-time Host Dashboard",
    "Live floor status sync",
    "One-tap session tracking",
    "Condition logging with notes",
    "Shift handoff persistence",
    "Staff permission levels",
  ],
};

export default function ForManagersPage() {
  return (
    <>
      <Script
        id="managers-faq-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
      />
      <Script
        id="managers-software-schema"
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
              <Link className="hover:text-ink-primary transition-colors" href="/features/inventory">
                Inventory
              </Link>
              <Link className="hover:text-ink-primary transition-colors" href="/for-owners">
                For Owners
              </Link>
              <Link className="text-ink-primary" href="/for-managers">
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
              <li className="text-ink-primary font-medium">For Managers</li>
            </ol>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.3em] text-ink-secondary">
                For Cafe Managers
              </p>
              <h1 className="text-4xl md:text-5xl leading-[1.05] font-serif text-ink-primary">
                Run a Tighter Ship: Operations Tools for Cafe Managers
              </h1>
              <p className="text-lg md:text-xl text-ink-secondary max-w-2xl leading-relaxed">
                You&apos;re the one on the floor when things go sideways. GameLedger gives you{" "}
                <strong>real-time visibility</strong> and <strong>workflow tools</strong> that
                actually help during a rush—not add to the chaos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-accent text-card font-semibold shadow-floating border border-ink-primary/5 transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Talk to a host
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-ink-primary text-card font-semibold shadow-floating transition-transform duration-300 hover:-translate-y-0.5 border border-ink-primary"
                >
                  See the dashboard
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -left-4 -right-4 -top-4 -bottom-4 border border-stroke rounded-3xl"></div>
              <div className="relative bg-card rounded-3xl shadow-floating p-6 border border-stroke">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
                    Host Dashboard
                  </p>
                  <span className="px-3 py-1 rounded-full bg-brandTeal/15 text-brandTeal text-xs font-semibold border border-brandTeal/30">
                    LIVE
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-surface border border-stroke text-center">
                    <p className="text-2xl font-serif text-ink-primary">12</p>
                    <p className="text-xs text-ink-secondary">Active</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-stroke text-center">
                    <p className="text-2xl font-serif text-ink-primary">4</p>
                    <p className="text-xs text-ink-secondary">Available</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-stroke text-center">
                    <p className="text-2xl font-serif text-warn">2</p>
                    <p className="text-xs text-ink-secondary">Alerts</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-warn/10 border border-warn/30">
                    <span className="text-sm text-ink-primary">Table 4 running long</span>
                    <span className="text-xs text-warn font-semibold">+15 min</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-danger/10 border border-danger/30">
                    <span className="text-sm text-ink-primary">Scythe #2 flagged</span>
                    <span className="text-xs text-danger font-semibold">Missing piece</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Daily Chaos Section */}
        <section className="max-w-5xl mx-auto px-6 pb-20 md:pb-24 bg-section-warm py-10 rounded-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              The Daily Chaos
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h2 className="text-3xl font-serif text-ink-primary">
                Double-Bookings. Game Questions. Condition Tracking.
              </h2>
              <p className="text-lg text-ink-secondary leading-relaxed">
                Managing a board game cafe floor means juggling a dozen things at once. Generic
                tools don&apos;t understand your unique challenges—they just add more tabs to check.
              </p>
              <ul className="space-y-3 text-ink-primary font-medium">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="mt-1 h-4 w-4 text-warn" />
                  &ldquo;Is Table 6 almost done? The 7PM booking just arrived.&rdquo;
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="mt-1 h-4 w-4 text-warn" />
                  &ldquo;Which games work for 5 players in under an hour?&rdquo;
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="mt-1 h-4 w-4 text-warn" />
                  &ldquo;Did anyone log that Catan was missing pieces?&rdquo;
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="mt-1 h-4 w-4 text-warn" />
                  &ldquo;What did night shift say about the Wingspan box?&rdquo;
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: "The Double-Book",
                  description:
                    "Two groups show up for the same table. Someone has to play referee.",
                },
                {
                  title: "The Game Guru Tax",
                  description:
                    "Staff stuck explaining rules instead of managing the floor.",
                },
                {
                  title: "The Lost Note",
                  description:
                    "Night shift flagged a broken game. Day shift never got the memo.",
                },
              ].map((card, idx) => (
                <div
                  key={card.title}
                  className="relative p-5 bg-card border border-stroke rounded-2xl shadow-card"
                  style={{ transform: `rotate(${idx === 1 ? 1 : -0.5}deg)` }}
                >
                  <p className="text-sm uppercase tracking-[0.25em] text-danger">Chaos</p>
                  <p className="mt-2 text-xl font-serif text-ink-primary">{card.title}</p>
                  <p className="text-sm text-ink-secondary mt-1">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Host Dashboard Section */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Host Dashboard
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <div className="grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-8 w-8 text-brandTeal" />
                <h2 className="text-3xl font-serif text-ink-primary">
                  Real-Time Floor Visibility
                </h2>
              </div>
              <p className="text-lg text-ink-secondary leading-relaxed">
                The Host Dashboard shows you exactly what&apos;s happening on your floor right
                now—which tables are active, which games are in play, and where problems are
                brewing.
              </p>
              <ul className="space-y-3 text-ink-primary font-medium">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  Live table status: Available, In Session, Reserved
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  Session timers with running-long alerts
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  Upcoming reservations with guest details
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 text-success" />
                  Condition alerts for flagged games
                </li>
              </ul>
            </div>
            <div className="bg-card rounded-2xl border border-stroke shadow-floating p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-ink-secondary mb-4">
                Live Floor View
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 1, status: "available" },
                  { id: 2, status: "active" },
                  { id: 3, status: "active" },
                  { id: 4, status: "warning" },
                  { id: 5, status: "active" },
                  { id: 6, status: "reserved" },
                  { id: 7, status: "available" },
                  { id: 8, status: "active" },
                ].map((table) => (
                  <div
                    key={table.id}
                    className={`aspect-square rounded-xl flex items-center justify-center font-semibold text-sm border ${
                      table.status === "available"
                        ? "bg-success/10 border-success/30 text-success"
                        : table.status === "active"
                        ? "bg-brandTeal/10 border-brandTeal/30 text-brandTeal"
                        : table.status === "warning"
                        ? "bg-warn/10 border-warn/30 text-warn"
                        : "bg-accent/10 border-accent/30 text-accent"
                    }`}
                  >
                    T{table.id}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-stroke flex justify-between text-xs text-ink-secondary">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-success"></span> Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-brandTeal"></span> Active
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-warn"></span> Alert
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent"></span> Reserved
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Staff Workflow Section */}
        <section className="max-w-6xl mx-auto px-6 pb-20 md:pb-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Staff Workflows
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <h2 className="text-3xl font-serif text-ink-primary mb-6">
            Tools That Help During a Rush
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "One-Tap Actions",
                description:
                  "Start session, end session, flag issue—each action takes under 5 seconds. Designed for busy nights, not busy work.",
                color: "accent",
              },
              {
                icon: RefreshCw,
                title: "Real-Time Sync",
                description:
                  "Changes appear instantly across all devices. No refresh needed. If Table 4 ends, everyone sees it immediately.",
                color: "teal",
              },
              {
                icon: Users,
                title: "Permission Levels",
                description:
                  "Managers get full access. Floor staff get streamlined views focused on what they need. You control who can do what.",
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

        {/* Shift Handoff Section */}
        <section className="max-w-5xl mx-auto px-6 pb-20 md:pb-24 bg-section-teal py-10 rounded-3xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Shift Handoff
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <div className="grid md:grid-cols-[1fr_1.1fr] gap-10 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-8 w-8 text-brandTeal" />
                <h2 className="text-3xl font-serif text-ink-primary">
                  Condition Tracking That Survives Staff Changes
                </h2>
              </div>
              <p className="text-lg text-ink-secondary leading-relaxed">
                The biggest operational gap in most cafes: information lost between shifts.
                GameLedger makes sure what night shift knows, day shift sees.
              </p>
              <ul className="space-y-3 text-ink-primary font-medium">
                <li className="flex items-start gap-2">
                  <Clock className="mt-1 h-4 w-4 text-brandTeal" />
                  Condition notes logged with timestamp and staff name
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="mt-1 h-4 w-4 text-brandTeal" />
                  Flagged games visible to next shift immediately
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="mt-1 h-4 w-4 text-brandTeal" />
                  Repair history tracked over time
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="mt-1 h-4 w-4 text-brandTeal" />
                  No more verbal handoffs that get forgotten
                </li>
              </ul>
            </div>
            <div className="bg-card rounded-2xl border border-stroke shadow-floating p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-ink-secondary mb-4">
                Condition Log
              </p>
              <div className="space-y-3">
                {[
                  {
                    game: "Scythe #2",
                    issue: "Missing red player pieces",
                    staff: "Jamie",
                    time: "Yesterday, 9:42 PM",
                    status: "flagged",
                  },
                  {
                    game: "Wingspan #1",
                    issue: "Box corner repaired",
                    staff: "Alex",
                    time: "Today, 2:15 PM",
                    status: "resolved",
                  },
                  {
                    game: "Catan #3",
                    issue: "Marked for cleaning",
                    staff: "Sam",
                    time: "Today, 5:30 PM",
                    status: "pending",
                  },
                ].map((log) => (
                  <div
                    key={`${log.game}-${log.time}`}
                    className={`p-3 rounded-xl border ${
                      log.status === "flagged"
                        ? "bg-danger/5 border-danger/30"
                        : log.status === "resolved"
                        ? "bg-success/5 border-success/30"
                        : "bg-warn/5 border-warn/30"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-ink-primary">{log.game}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          log.status === "flagged"
                            ? "bg-danger/10 text-danger"
                            : log.status === "resolved"
                            ? "bg-success/10 text-success"
                            : "bg-warn/10 text-warn"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="text-sm text-ink-secondary">{log.issue}</p>
                    <p className="text-xs text-ink-secondary mt-1">
                      {log.staff} • {log.time}
                    </p>
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
            Questions from Managers
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
              See It In Action
            </span>
            <div className="h-px flex-1 bg-stroke"></div>
          </div>
          <h3 className="text-3xl font-serif text-ink-primary mb-4">
            Ready to run a tighter ship?
          </h3>
          <p className="text-lg text-ink-secondary mb-8 max-w-2xl mx-auto">
            Talk to a host who&apos;s used GameLedger on the floor. See how the dashboard works
            during a real Friday night rush.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-accent text-card font-semibold shadow-floating border border-ink-primary/5 transition-transform duration-300 hover:-translate-y-0.5"
            >
              Talk to a host
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/demo"
              className="px-6 py-3 rounded-full bg-ink-primary text-card font-semibold shadow-floating transition-transform duration-300 hover:-translate-y-0.5 border border-ink-primary"
            >
              See the dashboard
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
              <p className="text-xs uppercase tracking-[0.25em] text-success font-semibold">
                Feature
              </p>
              <p className="mt-2 text-lg font-serif text-ink-primary group-hover:text-success transition-colors">
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
