"use client";

import { Button } from "@/components/ui/button";
import type { VenueZone } from "@/lib/db/types";

interface ZoneTabsProps {
  zones: VenueZone[];
  activeZoneId: string | null;
  onZoneChange: (zoneId: string | null) => void;
  isEditMode: boolean;
  onManageZones: () => void;
}

export function ZoneTabs({
  zones,
  activeZoneId,
  onZoneChange,
  isEditMode,
  onManageZones,
}: ZoneTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {zones.map((zone) => (
        <Button
          key={zone.id}
          variant={activeZoneId === zone.id ? "default" : "secondary"}
          size="sm"
          onClick={() => onZoneChange(zone.id)}
        >
          {zone.name}
        </Button>
      ))}
      {isEditMode && (
        <Button size="sm" variant="outline" onClick={onManageZones}>
          Manage zones
        </Button>
      )}
    </div>
  );
}
