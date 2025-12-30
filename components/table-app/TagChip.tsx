'use client';

/**
 * Small chip component for displaying tags like vibes or complexity.
 * Uses theme tokens for consistent "Tabletop Tactile" styling.
 */

interface TagChipProps {
  label: string;
  variant?: 'default' | 'primary' | 'selected';
  onClick?: () => void;
  className?: string;
}

/**
 * Formats a vibe/tag string for display (e.g., "light_silly" → "Light Silly").
 */
export function formatTagLabel(tag: string): string {
  return tag
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function TagChip({ label, variant = 'default', onClick, className = '' }: TagChipProps) {
  const baseClasses =
    'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all border';

  const variantClasses = {
    default:
      'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)] border-[color:var(--color-structure)]',
    primary:
      'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-accent)]/30',
    selected:
      'bg-[color:var(--color-accent)] text-[color:var(--color-surface)] border-[color:var(--color-accent)] shadow-[var(--shadow-token)]',
  };

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:shadow-sm active:scale-95 focus-ring'
    : '';

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${interactiveClasses} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {formatTagLabel(label)}
    </span>
  );
}
