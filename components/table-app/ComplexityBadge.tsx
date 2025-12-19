'use client';

/**
 * Badge component for displaying game complexity level.
 */

import type { GameComplexity } from '@/lib/db/types';

interface ComplexityBadgeProps {
  complexity: GameComplexity;
  className?: string;
}

const complexityConfig: Record<GameComplexity, { label: string; classes: string }> = {
  simple: {
    label: 'Simple',
    classes: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  medium: {
    label: 'Medium',
    classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  complex: {
    label: 'Complex',
    classes: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
};

export function ComplexityBadge({ complexity, className = '' }: ComplexityBadgeProps) {
  const config = complexityConfig[complexity];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
