"use client";

import { useMemo } from "react";
import type { VenueTableWithLayout, VenueZone } from "@/lib/db/types";

interface TableInspectorProps {
  table: VenueTableWithLayout | null;
  zones: VenueZone[];
  onRotationChange: (tableId: string, rotation: number) => void;
  onShapeChange: (tableId: string, shape: string) => void;
  onZoneChange: (tableId: string, zoneId: string) => void;
}

export function TableInspector({
  table,
  zones,
  onRotationChange,
  onShapeChange,
  onZoneChange,
}: TableInspectorProps) {
  const zoneOptions = useMemo(() => zones ?? [], [zones]);

  if (!table) {
    return (
      <div className="rounded-lg border border-[color:var(--color-structure)] bg-white p-3 text-sm text-[color:var(--color-ink-secondary)]">
        Select a table to edit.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[color:var(--color-structure)] bg-white p-3 space-y-3">
      <div className="text-sm font-semibold">Table settings</div>
      <div className="text-sm">Capacity: {table.capacity ?? "—"}</div>
      <div className="space-y-1 text-sm">
        <div className="text-[color:var(--color-ink-secondary)]">Shape</div>
        <select
          className="w-full rounded-md border border-[color:var(--color-structure)] bg-white px-2 py-1"
          value={table.layout_shape ?? "rectangle"}
          onChange={(event) => onShapeChange(table.id, event.target.value)}
        >
          <option value="rectangle">Rectangle</option>
          <option value="circle">Circle</option>
        </select>
      </div>
      <div className="space-y-1 text-sm">
        <div className="text-[color:var(--color-ink-secondary)]">Rotation</div>
        <select
          className="w-full rounded-md border border-[color:var(--color-structure)] bg-white px-2 py-1"
          value={String(table.rotation_deg ?? 0)}
          onChange={(event) => onRotationChange(table.id, Number(event.target.value))}
        >
          <option value="0">0°</option>
          <option value="90">90°</option>
          <option value="180">180°</option>
          <option value="270">270°</option>
        </select>
      </div>
      <div className="space-y-1 text-sm">
        <div className="text-[color:var(--color-ink-secondary)]">Zone</div>
        <select
          className="w-full rounded-md border border-[color:var(--color-structure)] bg-white px-2 py-1"
          value={table.zone_id ?? ""}
          onChange={(event) => onZoneChange(table.id, event.target.value)}
        >
          <option value="">Unassigned</option>
          {zoneOptions.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
