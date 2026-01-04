'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TokenChip } from '@/components/AppShell';
import { ChevronRight, MoreVertical } from '@/components/icons';
import type { Alert, AlertSeverity, ChipTone } from '@/lib/data/dashboard';
import { useState, useRef, useEffect } from 'react';

export interface AlertRowProps {
  alert: Alert;
  onAction: (action: 'primary' | 'secondary') => void;
}

/**
 * Maps severity to visual styles
 */
const severityStyles: Record<AlertSeverity, {
  dot: string;
  border: string;
  bg: string;
}> = {
  low: {
    dot: 'bg-[color:var(--color-ink-secondary)]',
    border: '',
    bg: 'hover:bg-[color:var(--color-muted)]/50',
  },
  medium: {
    dot: 'bg-[color:var(--color-warn)]',
    border: '',
    bg: 'hover:bg-[color:var(--color-warn)]/5',
  },
  high: {
    dot: 'bg-[color:var(--color-danger)]',
    border: 'border-l-2 border-l-[color:var(--color-danger)]',
    bg: 'hover:bg-[color:var(--color-danger)]/5',
  },
};

/**
 * Maps ChipTone to TokenChip tone
 */
function mapChipTone(tone: ChipTone): 'default' | 'accent' | 'muted' | 'warn' {
  switch (tone) {
    case 'danger':
      return 'warn'; // TokenChip doesn't have danger, use warn
    case 'accent':
      return 'accent';
    case 'warn':
      return 'warn';
    default:
      return 'default';
  }
}

/**
 * AlertRow - Individual alert card with severity indicator, actions, and context chips.
 */
export function AlertRow({ alert, onAction }: AlertRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const styles = severityStyles[alert.severity];

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 px-4 py-3 transition-colors',
        styles.bg,
        styles.border,
      )}
    >
      {/* Severity indicator dot */}
      <div className="flex-shrink-0 pt-1.5">
        <div
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            styles.dot,
          )}
          title={`${alert.severity} severity`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <p className="font-semibold text-sm text-[color:var(--color-ink-primary)]">
          {alert.title}
        </p>

        {/* Details */}
        {alert.details && (
          <p className="text-xs text-[color:var(--color-ink-secondary)] mt-0.5">
            {alert.details}
          </p>
        )}

        {/* Context chips */}
        {alert.contextChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {alert.contextChips.map((chip, index) => (
              <TokenChip key={index} tone={mapChipTone(chip.tone)}>
                {chip.label}
              </TokenChip>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Primary action */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction('primary')}
          className="text-[color:var(--color-accent)]"
        >
          {alert.primaryAction.label}
          <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </Button>

        {/* Secondary action (overflow menu) */}
        {alert.secondaryAction && (
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="More actions"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {menuOpen && (
              <div
                className={cn(
                  'absolute right-0 top-full mt-1 z-10',
                  'min-w-[140px] rounded-lg border border-[color:var(--color-structure)]',
                  'bg-[color:var(--color-elevated)] shadow-card',
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    onAction('secondary');
                    setMenuOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm',
                    'hover:bg-[color:var(--color-muted)] transition-colors',
                    'text-[color:var(--color-ink-primary)]',
                  )}
                >
                  {alert.secondaryAction.label}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
