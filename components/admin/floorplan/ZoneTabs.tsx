'use client';

/**
 * ZoneTabs - Tab navigation for switching between venue zones.
 */

import { Layers } from '@/components/icons';
import type { VenueZone } from '@/lib/db/types';

interface ZoneTabsProps {
  zones: VenueZone[];
  activeZoneId: string | null;
  onZoneChange: (zoneId: string) => void;
  isEditMode: boolean;
  onManageZones?: () => void;
}

export function ZoneTabs({
  zones,
  activeZoneId,
  onZoneChange,
  isEditMode,
  onManageZones,
}: ZoneTabsProps) {
  if (zones.length === 0) {
    return (
      <div className="flex items-center gap-2 p-2 bg-[color:var(--color-muted)]/50 rounded-xl">
        <Layers className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
        <span className="text-sm text-[color:var(--color-ink-secondary)]">
          No zones configured
        </span>
        {isEditMode && onManageZones && (
          <button
            type="button"
            onClick={onManageZones}
            className="text-sm font-medium text-[color:var(--color-accent)] underline"
          >
            Add zones
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] p-1">
        {zones.map((zone) => {
          const isActive = zone.id === activeZoneId;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onZoneChange(zone.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-[color:var(--color-surface)] shadow-card text-[color:var(--color-ink-primary)]'
                  : 'text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)]'
              }`}
              aria-pressed={isActive}
            >
              {zone.name}
            </button>
          );
        })}
      </div>

      {isEditMode && onManageZones && (
        <button
          type="button"
          onClick={onManageZones}
          className="p-2 rounded-lg border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] hover:bg-[color:var(--color-muted)] transition-colors"
          title="Manage zones"
        >
          <Layers className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
        </button>
      )}
    </div>
  );
}
