'use client';

/**
 * FloorPlanPageClient - Parent Client Component for the Floor Plan page.
 * Handles all state management and event handlers that cannot be passed from Server Components.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TablesManager } from '@/components/admin/TablesManager';
import { FloorPlanCanvas } from '@/components/admin/floorplan/FloorPlanCanvas';
import { ZoneTabs } from '@/components/admin/floorplan/ZoneTabs';
import type { TableSessionInfo } from '@/components/admin/floorplan/TableNode';
import type { VenueZone, VenueTableWithLayout, VenueTable } from '@/lib/db/types';
import { AlertTriangle, List, Map as MapIcon } from '@/components/icons';

interface FloorPlanPageClientProps {
  venueId: string;
  venueName: string;
  venueSlug: string;
  initialZones: VenueZone[];
  initialTables: VenueTable[];
  initialTablesWithLayout: VenueTableWithLayout[];
  /** Sessions passed as an array of [tableId, sessionInfo] entries for serialization */
  initialSessions: [string, TableSessionInfo][];
}

export function FloorPlanPageClient({
  venueId,
  venueName,
  venueSlug,
  initialZones,
  initialTables,
  initialTablesWithLayout,
  initialSessions,
}: FloorPlanPageClientProps) {
  // State management
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const [activeZoneId, setActiveZoneId] = useState<string>(initialZones[0]?.id ?? '');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Convert initialSessions array back to a Map
  const sessionsMap = useMemo(() => {
    return new Map<string, TableSessionInfo>(initialSessions);
  }, [initialSessions]);

  // Get the currently active zone
  const activeZone = useMemo(() => {
    return initialZones.find((z) => z.id === activeZoneId) ?? null;
  }, [initialZones, activeZoneId]);

  // Event handlers
  const handleTableClick = (id: string) => {
    setSelectedTableId(id);
  };

  const handleTableMove = (id: string, x: number, y: number) => {
    // Placeholder - console log for now
    console.log('Move table:', id, 'to position:', { x, y });
  };

  const handleTableResize = (id: string, w: number, h: number) => {
    // Placeholder - console log for now
    console.log('Resize table:', id, 'to size:', { w, h });
  };

  const handleZoneChange = (zoneId: string) => {
    setActiveZoneId(zoneId);
    setSelectedTableId(null); // Clear selection when changing zones
  };

  return (
    <>
      {/* Welcome empty state when no tables exist */}
      {initialTables.length === 0 && (
        <Card className="panel-surface border-2 border-dashed border-structure">
          <CardContent className="py-5 sm:py-6">
            <div className="flex flex-col gap-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">Welcome to your Floor Plan!</span>
              </div>
              <p className="text-sm text-ink-secondary">
                It looks like you haven&apos;t set up any tables yet.
              </p>
              <p className="text-sm font-medium">
                Switch to the Table List tab to create your first table.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab navigation */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-structure bg-elevated p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'map'
              ? 'bg-surface shadow-card text-ink-primary'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-muted/60'
          }`}
          aria-pressed={activeTab === 'map'}
        >
          <MapIcon className="h-4 w-4" />
          Visual Map
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'list'
              ? 'bg-surface shadow-card text-ink-primary'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-muted/60'
          }`}
          aria-pressed={activeTab === 'list'}
        >
          <List className="h-4 w-4" />
          Table List
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'map' ? (
        <Card className="panel-surface">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapIcon className="h-5 w-5 text-ink-secondary" />
                Visual map
              </CardTitle>
              {initialZones.length > 1 && (
                <ZoneTabs
                  zones={initialZones}
                  activeZoneId={activeZoneId}
                  onZoneChange={handleZoneChange}
                  isEditMode={true}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {activeZone ? (
              <FloorPlanCanvas
                zone={activeZone}
                tables={initialTablesWithLayout}
                sessions={sessionsMap}
                isEditMode={true}
                selectedTableId={selectedTableId}
                showGrid={true}
                onTableClick={handleTableClick}
                onTableMove={handleTableMove}
                onTableResize={handleTableResize}
              />
            ) : (
              <p className="text-sm text-ink-secondary">
                Add a zone to start placing tables on the map.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="panel-surface">
          <CardContent className="p-0">
            <TablesManager
              initialTables={initialTables}
              venueId={venueId}
              venueName={venueName}
              venueSlug={venueSlug}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
