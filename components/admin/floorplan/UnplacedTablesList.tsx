"use client";

import { Button } from "@/components/ui/button";
import type { VenueTableWithLayout } from "@/lib/db/types";
import type { TableSessionInfo } from "./TableNode";

interface UnplacedTablesListProps {
  tables: VenueTableWithLayout[];
  sessions: Map<string, TableSessionInfo>;
  onPlaceTable: (tableId: string) => void;
  isEditMode: boolean;
}

export function UnplacedTablesList({
  tables,
  sessions,
  onPlaceTable,
  isEditMode,
}: UnplacedTablesListProps) {
  if (!isEditMode) return null;

  const unplaced = tables.filter((table) => !table.zone_id);

  return (
    <div className="rounded-lg border border-[color:var(--color-structure)] bg-white p-3">
      <div className="mb-2 text-sm font-semibold">Unplaced tables</div>
      {unplaced.length === 0 && (
        <p className="text-sm text-[color:var(--color-ink-secondary)]">All tables are placed.</p>
      )}
      <div className="space-y-2">
        {unplaced.map((table) => {
          const session = sessions.get(table.id);
          return (
            <div key={table.id} className="flex items-center justify-between gap-2">
              <div className="text-sm">
                <div className="font-medium">{table.label}</div>
                {session && (
                  <div className="text-xs text-[color:var(--color-ink-secondary)]">
                    {session.status}
                  </div>
                )}
              </div>
              <Button size="sm" onClick={() => onPlaceTable(table.id)}>
                Place
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
