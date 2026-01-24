import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAllPosts } from "@/lib/data/blogData";
import { Clock, ArrowRight } from "@/components/icons/lucide-react";

export const metadata: Metadata = {
  title: "Insights for Board Game Cafe Operators",
  description:
    "Practical strategies to boost revenue, reduce operational chaos, and create memorable guest experiences at your board game cafe. From inventory management to reservation optimization.",
  openGraph: {
    title: "Insights for Board Game Cafe Operators | GameLedger Blog",
    description:
      "Practical strategies to boost revenue, reduce operational chaos, and create memorable guest experiences at your board game cafe.",
    type: "website",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <main className="flex-1">
      {/* Header Navigation */}
      <header className="max-w-6xl mx-auto px-6 pt-8 pb-6">
        <div className="flex items-center justify-between border-b border-stroke pb-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="GameLedger logo"
              width={40}
              height={40}
              className="rounded-lg shadow-token"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-secondary">
                Blog
              </p>
              <p className="text-lg font-semibold text-ink-primary">
                GameLedger
              </p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ink-secondary">
            <Link
              className="hover:text-ink-primary transition-colors"
              href="/#product"
            >
              Product
            </Link>
            <Link
              className="hover:text-ink-primary transition-colors"
              href="/#stats"
            >
              Results
            </Link>
            <Link
              className="text-ink-primary font-semibold transition-colors"
              href="/blog"
            >
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
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-8 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-stroke"></div>
          <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
            Chaos Cards
          </span>
          <div className="h-px flex-1 bg-stroke"></div>
        </div>

        <h1 className="text-4xl md:text-5xl font-serif text-ink-primary mb-4 text-center">
          Insights for Board Game Cafe Operators
        </h1>

        <p className="text-lg text-ink-secondary text-center max-w-2xl mx-auto leading-relaxed">
          Practical strategies to turn operational chaos into revenue. Learn how
          top-performing cafes maximize every Friday night.
        </p>
      </section>

      {/* Blog Posts Grid */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-1">
          {posts.map((post, idx) => (
            <article
              key={post.id}
              className="group relative bg-card rounded-2xl border border-stroke shadow-card hover:shadow-floating transition-all duration-300 overflow-hidden"
              style={{
                transform: `rotate(${idx === 1 ? 0.5 : idx === 0 ? -0.5 : 0.3}deg)`,
              }}
            >
              <div className="absolute inset-0 rounded-2xl border border-ink-primary/5 pointer-events-none"></div>

              {/* Chaos Card Badge */}
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/30">
                  Chaos Card
                </span>
              </div>

              <div className="p-8">
                {/* Chaos Card Mini */}
                <div className="mb-6 p-4 rounded-xl bg-surface border border-stroke inline-block">
                  <p className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
                    {post.chaosCard.title}
                  </p>
                  <p className="text-sm text-ink-primary mt-1">
                    {post.chaosCard.description}
                  </p>
                </div>

                {/* Post Content */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-ink-secondary">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {post.readTime}
                    </span>
                  </div>

                  <h2 className="text-2xl font-serif text-ink-primary group-hover:text-accent transition-colors">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>

                  <p className="text-ink-secondary leading-relaxed">
                    {post.excerpt}
                  </p>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 text-accent font-semibold group/link"
                  >
                    Read the full article
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-cta-warm rounded-3xl p-8 md:p-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px flex-1 max-w-16 bg-stroke"></div>
            <span className="text-xs uppercase tracking-[0.25em] text-ink-secondary">
              Take Action
            </span>
            <div className="h-px flex-1 max-w-16 bg-stroke"></div>
          </div>

          <h2 className="text-3xl font-serif text-ink-primary mb-4">
            Stop Losing Revenue to Chaos
          </h2>

          <p className="text-lg text-ink-secondary mb-8 max-w-xl mx-auto">
            Every Friday night, hidden inefficiencies drain your bottom line.
            Find out exactly how much with our calculator.
          </p>

          <Link
            href="/calculator"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-accent text-card font-semibold shadow-floating border border-ink-primary/5 transition-all duration-300 hover:-translate-y-0.5"
          >
            Try the Friday Night Economics Calculator
          </Link>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-stroke">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="GameLedger"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-sm text-ink-secondary">
              © {new Date().getFullYear()} GameLedger. All rights reserved.
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-ink-secondary">
            <Link href="/" className="hover:text-ink-primary transition-colors">
              Home
            </Link>
            <Link
              href="/blog"
              className="hover:text-ink-primary transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/#early-access"
              className="hover:text-ink-primary transition-colors"
            >
              Early Access
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
