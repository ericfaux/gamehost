'use client';

import { useState, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronDown, Table2, Wrench, MessageSquare } from '@/components/icons';
import { AlertRow } from './AlertRow';
import type { Alert, AlertType, AlertSeverity } from '@/lib/data/dashboard';

export interface AlertQueueProps {
  alerts: Alert[];
  onAction: (alert: Alert, action: 'primary' | 'secondary') => void;
  loading?: boolean;
}

/**
 * Alert categories for grouping
 */
type AlertCategory = 'Tables' | 'Maintenance' | 'Experience';

/**
 * Maps alert types to categories
 */
function getAlertCategory(type: AlertType): AlertCategory {
  switch (type) {
    case 'table_browsing_stale':
    case 'game_bottlenecked':
    case 'turnover_risk':
      return 'Tables';
    case 'game_problematic':
    case 'game_out_for_repair':
      return 'Maintenance';
    case 'feedback_negative_game':
    case 'feedback_negative_venue':
      return 'Experience';
    default:
      return 'Tables';
  }
}

/**
 * Severity order for sorting (high first)
 */
const severityOrder: Record<AlertSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Category display order
 */
const categoryOrder: AlertCategory[] = ['Tables', 'Maintenance', 'Experience'];

/**
 * Maps categories to their icons
 */
const categoryIcons: Record<AlertCategory, React.ComponentType<{ className?: string }>> = {
  Tables: Table2,
  Maintenance: Wrench,
  Experience: MessageSquare,
};

interface AlertGroup {
  category: AlertCategory;
  alerts: Alert[];
}

/**
 * Skeleton row for loading state
 */
function AlertSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
      {/* Skeleton dot */}
      <div className="flex-shrink-0 pt-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-muted)]" />
      </div>
      {/* Skeleton content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 w-3/4 rounded bg-[color:var(--color-muted)]" />
        <div className="h-3 w-1/2 rounded bg-[color:var(--color-muted)]" />
        <div className="flex gap-2 mt-2">
          <div className="h-5 w-16 rounded-full bg-[color:var(--color-muted)]" />
          <div className="h-5 w-20 rounded-full bg-[color:var(--color-muted)]" />
        </div>
      </div>
      {/* Skeleton action */}
      <div className="h-8 w-20 rounded bg-[color:var(--color-muted)]" />
    </div>
  );
}

/**
 * Collapsible section header for alert groups
 */
function AlertGroupHeader({
  category,
  count,
  isOpen,
  onToggle,
  id,
}: {
  category: AlertCategory;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  id: string;
}) {
  const Icon = categoryIcons[category];

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between px-4 py-2.5',
        'bg-[color:var(--color-muted)]/50 border-b border-[color:var(--color-structure)]',
        'hover:bg-[color:var(--color-muted)] transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[color:var(--color-accent)]/50',
      )}
      aria-expanded={isOpen}
      aria-controls={`alert-group-${id}`}
      id={`alert-header-${id}`}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
        <span className="text-sm font-semibold text-[color:var(--color-ink-primary)]">
          {category}
        </span>
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5',
            'rounded-full text-[10px] font-semibold',
            'bg-[color:var(--color-elevated)] border border-[color:var(--color-structure)]',
            'text-[color:var(--color-ink-secondary)]',
          )}
          aria-label={`${count} alert${count !== 1 ? 's' : ''}`}
        >
          {count}
        </span>
      </span>
      <ChevronDown
        className={cn(
          'h-4 w-4 text-[color:var(--color-ink-secondary)] transition-transform duration-200',
          isOpen && 'rotate-180',
        )}
      />
    </button>
  );
}

/**
 * AlertQueue - Container displaying alerts grouped by category with collapsible sections.
 */
export function AlertQueue({ alerts, onAction, loading = false }: AlertQueueProps) {
  // Track which sections are expanded (all open by default)
  const [expandedSections, setExpandedSections] = useState<Set<AlertCategory>>(
    () => new Set(categoryOrder)
  );

  // Track section heights for smooth transitions
  const sectionRefs = useRef<Map<AlertCategory, HTMLDivElement>>(new Map());

  // Group and sort alerts
  const alertGroups = useMemo<AlertGroup[]>(() => {
    // Group by category
    const grouped = new Map<AlertCategory, Alert[]>();

    for (const alert of alerts) {
      const category = getAlertCategory(alert.type);
      const existing = grouped.get(category) ?? [];
      grouped.set(category, [...existing, alert]);
    }

    // Sort alerts within each group by severity (high first)
    for (const [category, categoryAlerts] of grouped) {
      grouped.set(
        category,
        categoryAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      );
    }

    // Convert to array in category order, only including non-empty groups
    return categoryOrder
      .filter((category) => grouped.has(category))
      .map((category) => ({
        category,
        alerts: grouped.get(category) ?? [],
      }));
  }, [alerts]);

  const toggleSection = (category: AlertCategory) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleAction = (alert: Alert, action: 'primary' | 'secondary') => {
    onAction(alert, action);
  };

  // Loading state
  if (loading) {
    return (
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[color:var(--color-structure)]/50">
            <AlertSkeleton />
            <AlertSkeleton />
            <AlertSkeleton />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (alerts.length === 0) {
    return (
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <span className="text-4xl mb-3 block" role="img" aria-label="Sailboat">⛵</span>
            <p className="text-sm text-[color:var(--color-ink-secondary)]">
              No alerts—smooth sailing!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="panel-surface" role="region" aria-label="Alert queue">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Alerts</CardTitle>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full',
            'text-xs font-semibold border',
            'bg-[color:var(--color-muted)] border-[color:var(--color-structure)]',
            'text-[color:var(--color-ink-secondary)]',
          )}
          role="status"
          aria-live="polite"
        >
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {alertGroups.map((group) => {
          const isOpen = expandedSections.has(group.category);
          const groupId = group.category.toLowerCase().replace(/\s+/g, '-');

          return (
            <div key={group.category}>
              <AlertGroupHeader
                category={group.category}
                count={group.alerts.length}
                isOpen={isOpen}
                onToggle={() => toggleSection(group.category)}
                id={groupId}
              />
              <div
                id={`alert-group-${groupId}`}
                role="region"
                aria-labelledby={`alert-header-${groupId}`}
                className={cn(
                  'overflow-hidden transition-all duration-200 ease-in-out',
                  isOpen ? 'opacity-100' : 'opacity-0 max-h-0',
                )}
                ref={(el) => {
                  if (el) sectionRefs.current.set(group.category, el);
                }}
              >
                <div className="divide-y divide-[color:var(--color-structure)]/50">
                  {group.alerts.map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onAction={(action) => handleAction(alert, action)}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
