'use client';

/**
 * Small chip component for displaying tags like vibes or complexity.
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
    'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors';

  const variantClasses = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    selected: 'bg-blue-600 text-white dark:bg-blue-500',
  };

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:opacity-80 active:scale-95'
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
