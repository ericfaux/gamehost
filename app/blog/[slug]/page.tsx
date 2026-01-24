import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllPosts } from "@/lib/data/blogData";
import {
  Clock,
  ArrowLeft,
  Calculator,
  TrendingUp,
} from "@/components/icons/lucide-react";

const BASE_URL = "https://gameledger.io";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | GameLedger Blog`,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: ["GameLedger"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
    alternates: {
      canonical: `${BASE_URL}/blog/${slug}`,
    },
  };
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const allPosts = getAllPosts();
  const relatedPosts = allPosts.filter((p) => p.id !== post.id).slice(0, 2);

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

      {/* Back Link */}
      <div className="max-w-6xl mx-auto px-6 pt-4">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-ink-secondary hover:text-ink-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all articles
        </Link>
      </div>

      {/* Article + Sidebar Layout */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[1fr_320px] gap-12">
          {/* Main Article */}
          <article className="min-w-0">
            {/* Article Header */}
            <header className="mb-10">
              {/* Chaos Card Badge */}
              <div className="mb-6 p-5 rounded-xl bg-surface border border-stroke inline-block shadow-card">
                <p className="text-xs uppercase tracking-[0.25em] text-accent font-semibold mb-1">
                  Chaos Card
                </p>
                <p className="text-lg font-serif text-ink-primary">
                  {post.chaosCard.title}
                </p>
                <p className="text-sm text-ink-secondary mt-1">
                  {post.chaosCard.description}
                </p>
              </div>

              <h1 className="text-3xl md:text-4xl font-serif text-ink-primary mb-4 leading-tight">
                {post.title}
              </h1>

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
            </header>

            {/* Article Content */}
            <div
              className="prose prose-lg max-w-none
                prose-headings:font-serif prose-headings:text-ink-primary
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-ink-secondary prose-p:leading-relaxed
                prose-strong:text-ink-primary prose-strong:font-semibold
                prose-ul:text-ink-secondary prose-ol:text-ink-secondary
                prose-li:my-1
                prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                [&_.lead]:text-xl [&_.lead]:text-ink-primary [&_.lead]:leading-relaxed [&_.lead]:mb-6
                [&_.calculation-box]:bg-surface [&_.calculation-box]:border [&_.calculation-box]:border-stroke [&_.calculation-box]:rounded-xl [&_.calculation-box]:p-6 [&_.calculation-box]:my-6
              "
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Article Footer */}
            <footer className="mt-12 pt-8 border-t border-stroke">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-ink-secondary hover:text-ink-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to all articles
                </Link>

                <Link
                  href="/calculator"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-accent text-card font-semibold shadow-token transition-all duration-300 hover:-translate-y-0.5"
                >
                  Calculate Your Revenue Loss
                </Link>
              </div>
            </footer>
          </article>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-8 space-y-8 h-fit">
            {/* Friday Night Economics CTA */}
            <div className="bg-card rounded-2xl border-2 border-accent/30 shadow-floating p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-accent/10">
                    <Calculator className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">
                    Friday Night Economics
                  </span>
                </div>

                <h3 className="text-xl font-serif text-ink-primary mb-3">
                  How much revenue is walking out your door?
                </h3>

                <p className="text-sm text-ink-secondary mb-5 leading-relaxed">
                  Use our Friday Night Economics Calculator to find out exactly
                  how much ghost tables, long teaches, and inventory chaos cost
                  you each month.
                </p>

                <Link
                  href="/calculator"
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full bg-accent text-card font-semibold shadow-token transition-all duration-300 hover:-translate-y-0.5"
                >
                  <TrendingUp className="w-4 h-4" />
                  Calculate Now
                </Link>
              </div>
            </div>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="bg-surface rounded-2xl border border-stroke p-6">
                <h3 className="text-sm uppercase tracking-[0.2em] text-ink-secondary font-semibold mb-4">
                  More Chaos Cards
                </h3>

                <div className="space-y-4">
                  {relatedPosts.map((relatedPost) => (
                    <Link
                      key={relatedPost.id}
                      href={`/blog/${relatedPost.slug}`}
                      className="block p-4 bg-card rounded-xl border border-stroke hover:shadow-card transition-all duration-300 group"
                    >
                      <p className="text-xs text-accent font-semibold mb-1">
                        {relatedPost.chaosCard.title}
                      </p>
                      <h4 className="text-sm font-medium text-ink-primary group-hover:text-accent transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h4>
                      <p className="text-xs text-ink-secondary mt-2">
                        {relatedPost.readTime}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter CTA */}
            <div className="bg-section-warm rounded-2xl border border-stroke p-6">
              <h3 className="text-lg font-serif text-ink-primary mb-2">
                Get insights in your inbox
              </h3>
              <p className="text-sm text-ink-secondary mb-4">
                Weekly tips for running a more profitable board game cafe.
              </p>
              <Link
                href="/#early-access"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-full bg-ink-primary text-card font-medium text-sm transition-all duration-300 hover:-translate-y-0.5"
              >
                Join the Waitlist
              </Link>
            </div>
          </aside>
        </div>
      </div>

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
