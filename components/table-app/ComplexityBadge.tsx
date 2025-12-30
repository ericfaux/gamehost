'use client';

/**
 * Badge component for displaying game complexity level.
 * Uses theme tokens for consistent "Tabletop Tactile" styling.
 */

import type { GameComplexity } from '@/lib/db/types';

interface ComplexityBadgeProps {
  complexity: GameComplexity;
  className?: string;
}

const complexityConfig: Record<GameComplexity, { label: string; classes: string }> = {
  simple: {
    label: 'Simple',
    classes:
      'bg-[#e8f0e9] text-[color:var(--color-success)] border border-[color:var(--color-success)]/20',
  },
  medium: {
    label: 'Medium',
    classes:
      'bg-[#faf3e6] text-[color:var(--color-warn)] border border-[color:var(--color-warn)]/20',
  },
  complex: {
    label: 'Complex',
    classes:
      'bg-[#f5e8e8] text-[color:var(--color-danger)] border border-[color:var(--color-danger)]/20',
  },
};

export function ComplexityBadge({ complexity, className = '' }: ComplexityBadgeProps) {
  const config = complexityConfig[complexity];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
