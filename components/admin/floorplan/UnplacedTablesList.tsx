'use client';

/**
 * UnplacedTablesList - Sidebar showing tables that haven't been placed on the floor plan.
 */

import { Plus, Users } from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { VenueTableWithLayout } from '@/lib/db/types';
import type { TableSessionInfo } from './TableNode';

interface UnplacedTablesListProps {
  tables: VenueTableWithLayout[];
  sessions: Map<string, TableSessionInfo>;
  onPlaceTable: (tableId: string) => void;
  isEditMode: boolean;
}

function getStatusDot(session: TableSessionInfo | undefined): string {
  if (!session) return 'bg-[color:var(--color-accent)]';
  if (session.status === 'playing') return 'bg-green-500';
  if (session.status === 'browsing') return 'bg-blue-500';
  return 'bg-[color:var(--color-accent)]';
}

export function UnplacedTablesList({
  tables,
  sessions,
  onPlaceTable,
  isEditMode,
}: UnplacedTablesListProps) {
  // Filter to tables without layout positions
  const unplacedTables = tables.filter(
    (t) => t.layout_x === null || t.layout_y === null || t.zone_id === null
  );

  if (unplacedTables.length === 0) {
    return null;
  }

  return (
    <div className="panel-surface p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-ink-secondary)] mb-2">
        Unplaced Tables ({unplacedTables.length})
      </h4>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {unplacedTables.map((table) => {
          const session = sessions.get(table.id);
          return (
            <div
              key={table.id}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-[color:var(--color-muted)]/50 hover:bg-[color:var(--color-muted)] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full ${getStatusDot(session)}`} />
                <span className="text-sm font-medium truncate">{table.label}</span>
                {table.capacity && (
                  <span className="flex items-center gap-0.5 text-xs text-[color:var(--color-ink-secondary)]">
                    <Users className="h-3 w-3" />
                    {table.capacity}
                  </span>
                )}
              </div>
              {isEditMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPlaceTable(table.id)}
                  className="flex-shrink-0"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Place
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {!isEditMode && (
        <p className="text-xs text-[color:var(--color-ink-secondary)] mt-2">
          Switch to edit mode to place tables
        </p>
      )}
    </div>
  );
}
