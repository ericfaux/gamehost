/**
 * GuestHeader - Sticky header for guest-facing pages.
 * Provides consistent "paper panel" styling with back navigation.
 */

import Link from 'next/link';
import { ReactNode } from 'react';

interface GuestHeaderProps {
  /** Title displayed in the header */
  title: string;
  /** Optional subtitle (e.g., venue/table info) */
  subtitle?: string;
  /** Back link URL (if provided, shows back button) */
  backHref?: string;
  /** Back link aria label */
  backLabel?: string;
  /** Optional content to the right of the title */
  rightContent?: ReactNode;
}

export function GuestHeader({
  title,
  subtitle,
  backHref,
  backLabel = 'Go back',
  rightContent,
}: GuestHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-[color:var(--color-elevated)] border-b border-[color:var(--color-structure)] px-4 py-3 shadow-sm">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="p-2 -ml-2 text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)] rounded-lg transition-colors focus-ring"
            aria-label={backLabel}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-[color:var(--color-ink-primary)] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[color:var(--color-ink-secondary)]">{subtitle}</p>
          )}
        </div>
        {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
      </div>
    </header>
  );
}
