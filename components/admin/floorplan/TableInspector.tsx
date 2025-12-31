'use client';

/**
 * TableInspector - Panel for editing table properties in edit mode.
 * Allows rotation, shape, and zone assignment.
 */

import { RotateCw, Square, Circle } from '@/components/icons';
import type { VenueZone, VenueTableWithLayout, TableShape } from '@/lib/db/types';

interface TableInspectorProps {
  table: VenueTableWithLayout | null;
  zones: VenueZone[];
  onRotationChange: (tableId: string, rotation: number) => void;
  onShapeChange: (tableId: string, shape: TableShape) => void;
  onZoneChange: (tableId: string, zoneId: string) => void;
}

const SHAPE_OPTIONS: { value: TableShape; label: string; icon: typeof Square }[] = [
  { value: 'rect', label: 'Rectangle', icon: Square },
  { value: 'round', label: 'Round', icon: Circle },
  { value: 'booth', label: 'Booth', icon: Square },
];

export function TableInspector({
  table,
  zones,
  onRotationChange,
  onShapeChange,
  onZoneChange,
}: TableInspectorProps) {
  if (!table) {
    return (
      <div className="panel-surface p-3">
        <p className="text-sm text-[color:var(--color-ink-secondary)] text-center">
          Select a table to edit
        </p>
      </div>
    );
  }

  return (
    <div className="panel-surface p-3 space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-ink-secondary)]">
        Edit: {table.label}
      </h4>

      {/* Zone assignment */}
      <div>
        <label className="block text-xs font-medium text-[color:var(--color-ink-secondary)] mb-1">
          Zone
        </label>
        <select
          value={table.zone_id ?? ''}
          onChange={(e) => onZoneChange(table.id, e.target.value)}
          className="w-full rounded-lg border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring"
        >
          <option value="">Unassigned</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </div>

      {/* Shape selection */}
      <div>
        <label className="block text-xs font-medium text-[color:var(--color-ink-secondary)] mb-1">
          Shape
        </label>
        <div className="flex gap-1">
          {SHAPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = table.layout_shape === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onShapeChange(table.id, option.value)}
                className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-[color:var(--color-accent-soft)] border-[color:var(--color-accent)] text-[color:var(--color-accent)]'
                    : 'border-[color:var(--color-structure)] hover:bg-[color:var(--color-muted)]'
                }`}
                title={option.label}
              >
                {option.value === 'booth' ? (
                  <div className="w-4 h-4 border-2 border-current rounded-t-lg rounded-b-sm" />
                ) : (
                  <Icon className={`h-4 w-4 ${option.value === 'round' ? '' : ''}`} />
                )}
                <span className="text-[10px]">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rotation */}
      <div>
        <label className="block text-xs font-medium text-[color:var(--color-ink-secondary)] mb-1">
          <span className="flex items-center gap-1">
            <RotateCw className="h-3 w-3" />
            Rotation: {table.rotation_deg}°
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="359"
          value={table.rotation_deg}
          onChange={(e) => onRotationChange(table.id, parseInt(e.target.value, 10))}
          className="w-full h-2 bg-[color:var(--color-structure)] rounded-lg appearance-none cursor-pointer accent-[color:var(--color-accent)]"
        />
        <div className="flex justify-between text-[10px] text-[color:var(--color-ink-secondary)] mt-1">
          <span>0°</span>
          <span>90°</span>
          <span>180°</span>
          <span>270°</span>
          <span>359°</span>
        </div>
      </div>

      {/* Quick rotation buttons */}
      <div className="flex gap-1">
        {[0, 45, 90, 135, 180].map((deg) => (
          <button
            key={deg}
            type="button"
            onClick={() => onRotationChange(table.id, deg)}
            className={`flex-1 px-2 py-1 text-xs font-medium rounded-lg border transition-colors ${
              table.rotation_deg === deg
                ? 'bg-[color:var(--color-accent-soft)] border-[color:var(--color-accent)] text-[color:var(--color-accent)]'
                : 'border-[color:var(--color-structure)] hover:bg-[color:var(--color-muted)]'
            }`}
          >
            {deg}°
          </button>
        ))}
      </div>
    </div>
  );
}
