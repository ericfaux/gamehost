'use client';

import { cn } from '@/lib/utils';

export interface PulseTileProps {
  value: number | string;
  label: string;
  tone?: 'default' | 'warn' | 'danger' | 'accent' | 'success';
  badge?: string;
  onClick?: () => void;
  loading?: boolean;
}

/**
 * PulseTile - A substantial "punchcard" KPI tile for dashboard displays.
 * Designed to be readable across a room with large numbers and clear labels.
 */
export function PulseTile({
  value,
  label,
  tone = 'default',
  badge,
  onClick,
  loading = false,
}: PulseTileProps) {
  const isClickable = !!onClick;

  // Background tints based on tone
  const toneBg: Record<NonNullable<PulseTileProps['tone']>, string> = {
    default: 'bg-[color:var(--color-elevated)]',
    warn: 'bg-[color:var(--color-warn)]/5',
    danger: 'bg-[color:var(--color-danger)]/5',
    accent: 'bg-[color:var(--color-accent-soft)]/50',
    success: 'bg-[color:var(--color-success)]/5',
  };

  // Value text colors based on tone
  const toneText: Record<NonNullable<PulseTileProps['tone']>, string> = {
    default: 'text-[color:var(--color-ink-primary)]',
    warn: 'text-[color:var(--color-warn)]',
    danger: 'text-[color:var(--color-danger)]',
    accent: 'text-[color:var(--color-accent)]',
    success: 'text-[color:var(--color-success)]',
  };

  // Badge colors based on tone
  const toneBadge: Record<NonNullable<PulseTileProps['tone']>, string> = {
    default: 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)] border-[color:var(--color-structure)]',
    warn: 'bg-[color:var(--color-warn)]/10 text-[color:var(--color-warn)] border-[color:var(--color-warn)]/20',
    danger: 'bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)] border-[color:var(--color-danger)]/20',
    accent: 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-accent)]/20',
    success: 'bg-[color:var(--color-success)]/10 text-[color:var(--color-success)] border-[color:var(--color-success)]/20',
  };

  const Component = isClickable ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        // Base punchcard styling
        'relative rounded-xl border border-[color:var(--color-structure)] p-5',
        'shadow-card transition-all duration-150',
        toneBg[tone],
        // Clickable hover states
        isClickable && [
          'cursor-pointer',
          'hover:shadow-token hover:border-[color:var(--color-structure-strong)]',
          'hover:scale-[1.02]',
          'active:scale-[0.98] active:shadow-soft',
        ],
        // Focus state for accessibility
        isClickable && 'focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/50 focus:ring-offset-2',
      )}
      {...(isClickable ? { type: 'button' } : {})}
    >
      {/* Badge chip in corner */}
      {badge && !loading && (
        <span
          className={cn(
            'absolute top-3 right-3',
            'inline-flex items-center px-2 py-0.5 rounded-full',
            'text-[10px] font-semibold border',
            toneBadge[tone],
          )}
        >
          {badge}
        </span>
      )}

      {/* Main content */}
      <div className="flex flex-col gap-1">
        {loading ? (
          <>
            {/* Loading skeleton */}
            <div className="h-10 w-20 rounded-lg bg-[color:var(--color-muted)] animate-pulse" />
            <div className="h-4 w-24 rounded bg-[color:var(--color-muted)] animate-pulse mt-1" />
          </>
        ) : (
          <>
            {/* Large value display */}
            <span
              className={cn(
                'text-4xl font-bold tracking-tight leading-none',
                toneText[tone],
              )}
            >
              {value}
            </span>

            {/* Label */}
            <span className="text-sm text-[color:var(--color-ink-secondary)] font-medium">
              {label}
            </span>
          </>
        )}
      </div>
    </Component>
  );
}
