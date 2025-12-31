"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import type { VenueTableWithLayout, VenueZone } from "@/lib/db/types";
import type { TableSessionInfo } from "./TableNode";

interface FloorPlanCanvasProps {
  zone: VenueZone;
  tables: VenueTableWithLayout[];
  sessions: Map<string, TableSessionInfo>;
  isEditMode: boolean;
  selectedTableId: string | null;
  showGrid: boolean;
  onTableClick: (tableId: string) => void;
  onTableMove: (tableId: string, x: number, y: number) => void;
  onTableResize: (tableId: string, w: number, h: number) => void;
}

export function FloorPlanCanvas({
  zone,
  tables,
  sessions,
  isEditMode,
  selectedTableId,
  showGrid,
  onTableClick,
}: FloorPlanCanvasProps) {
  const zoneTables = useMemo(
    () => tables.filter((table) => table.zone_id === zone.id),
    [tables, zone.id]
  );

  return (
    <Card
      className="relative w-full border border-[color:var(--color-structure)] bg-[color:var(--color-muted)]/20"
      style={{ minHeight: 320 }}
    >
      <div className="flex items-center justify-between px-4 py-2 text-sm text-[color:var(--color-ink-secondary)]">
        <span>
          Zone canvas {showGrid ? "with grid" : ""} ({zoneTables.length} tables)
        </span>
        {isEditMode && <span>Edit mode</span>}
      </div>
      <div className="space-y-2 px-4 pb-4 text-sm">
        {zoneTables.length === 0 && (
          <p className="text-[color:var(--color-ink-secondary)]">No tables placed in this zone.</p>
        )}
        {zoneTables.map((table) => {
          const session = sessions.get(table.id);
          const isSelected = selectedTableId === table.id;
          return (
            <button
              key={table.id}
              type="button"
              onClick={() => onTableClick(table.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                isSelected
                  ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/10"
                  : "border-[color:var(--color-structure)] bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{table.label}</div>
                {session && (
                  <span className="text-xs text-[color:var(--color-ink-secondary)]">
                    {session.status === "playing" ? "Playing" : "Browsing"}
                  </span>
                )}
              </div>
              {session?.gameTitle && (
                <p className="text-xs text-[color:var(--color-ink-secondary)]">{session.gameTitle}</p>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
