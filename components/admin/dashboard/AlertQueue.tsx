'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from '@/components/icons';
import { AlertRow } from './AlertRow';
import type { Alert, AlertType, AlertSeverity } from '@/lib/data/dashboard';

export interface AlertQueueProps {
  alerts: Alert[];
  onAction: (alert: Alert, action: 'primary' | 'secondary') => void;
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

interface AlertGroup {
  category: AlertCategory;
  alerts: Alert[];
}

/**
 * Collapsible section header for alert groups
 */
function AlertGroupHeader({
  category,
  count,
  isOpen,
  onToggle,
}: {
  category: AlertCategory;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between px-4 py-2.5',
        'bg-[color:var(--color-muted)]/50 border-b border-[color:var(--color-structure)]',
        'hover:bg-[color:var(--color-muted)] transition-colors',
      )}
      aria-expanded={isOpen}
    >
      <span className="flex items-center gap-2">
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
        >
          {count}
        </span>
      </span>
      {isOpen ? (
        <ChevronUp className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
      ) : (
        <ChevronDown className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
      )}
    </button>
  );
}

/**
 * AlertQueue - Container displaying alerts grouped by category with collapsible sections.
 */
export function AlertQueue({ alerts, onAction }: AlertQueueProps) {
  // Track which sections are expanded (all open by default)
  const [expandedSections, setExpandedSections] = useState<Set<AlertCategory>>(
    () => new Set(categoryOrder)
  );

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

  // Empty state
  if (alerts.length === 0) {
    return (
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="text-sm text-[color:var(--color-ink-secondary)]">
              No alerts—smooth sailing! ⛵
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="panel-surface">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Alerts</CardTitle>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full',
            'text-xs font-semibold border',
            'bg-[color:var(--color-muted)] border-[color:var(--color-structure)]',
            'text-[color:var(--color-ink-secondary)]',
          )}
        >
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {alertGroups.map((group) => {
          const isOpen = expandedSections.has(group.category);

          return (
            <div key={group.category}>
              <AlertGroupHeader
                category={group.category}
                count={group.alerts.length}
                isOpen={isOpen}
                onToggle={() => toggleSection(group.category)}
              />
              {isOpen && (
                <div className="divide-y divide-[color:var(--color-structure)]/50">
                  {group.alerts.map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onAction={(action) => handleAction(alert, action)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
