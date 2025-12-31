'use client';

/**
 * FloorPlanCard - Main container component for the floor plan UI.
 * Integrates zones, canvas, tables, and edit mode functionality.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Map } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TokenChip, useToast } from '@/components/AppShell';
import { FloorPlanCanvas } from './FloorPlanCanvas';
import { TableDrawer } from './TableDrawer';
import { ZoneTabs } from './ZoneTabs';
import { UnplacedTablesList } from './UnplacedTablesList';
import { TableInspector } from './TableInspector';
import { EditModeToolbar } from './EditModeToolbar';
import { ZoneManagerModal } from './ZoneManagerModal';
import { getDefaultLayoutForCapacity, type TableSessionInfo } from './TableNode';
import {
  saveVenueZonesAction,
  saveTableLayoutsAction,
  createZoneAction,
  deleteZoneAction,
  uploadZoneBackgroundAction,
} from '@/app/admin/sessions/floor-plan-actions';
import type { VenueZone, VenueTableWithLayout, TableShape, Session } from '@/lib/db/types';

// Type for session with joined details
interface SessionWithDetails extends Session {
  games: { title: string } | null;
  venue_tables: { label: string } | null;
}

interface FloorPlanCardProps {
  venueId: string;
  zones: VenueZone[];
  tables: VenueTableWithLayout[];
  sessions: SessionWithDetails[];
  onEndSession: (sessionId: string) => Promise<void>;
  onAssignGame: (sessionId: string) => void;
}

// Deduplicate sessions per table, picking winner
function deduplicateSessions(
  sessions: SessionWithDetails[]
): { sessionsMap: Map<string, TableSessionInfo>; duplicateTableIds: Set<string> } {
  const grouped = new Map<string, SessionWithDetails[]>();
  const duplicateTableIds = new Set<string>();

  sessions.forEach((session) => {
    const existing = grouped.get(session.table_id) ?? [];
    grouped.set(session.table_id, [...existing, session]);
  });

  const sessionsMap = new Map<string, TableSessionInfo>();

  grouped.forEach((sessionList, tableId) => {
    if (sessionList.length > 1) {
      duplicateTableIds.add(tableId);
    }

    // Pick winner: prefer game_id not null, then newest started_at
    const sorted = [...sessionList].sort((a, b) => {
      const aHasGame = a.game_id !== null;
      const bHasGame = b.game_id !== null;
      if (aHasGame !== bHasGame) return aHasGame ? -1 : 1;
      const aTime = new Date(a.started_at ?? a.created_at).getTime();
      const bTime = new Date(b.started_at ?? b.created_at).getTime();
      return bTime - aTime;
    });

    const winner = sorted[0];
    if (winner) {
      sessionsMap.set(tableId, {
        sessionId: winner.id,
        status: winner.game_id ? 'playing' : 'browsing',
        gameTitle: winner.games?.title ?? undefined,
        startedAt: winner.started_at,
        hasDuplicates: sessionList.length > 1,
      });
    }
  });

  return { sessionsMap, duplicateTableIds };
}

export function FloorPlanCard({
  venueId,
  zones: initialZones,
  tables: initialTables,
  sessions,
  onEndSession,
  onAssignGame,
}: FloorPlanCardProps) {
  const { push } = useToast();

  // Local state for zones and tables (for edit mode)
  const [zones, setZones] = useState<VenueZone[]>(initialZones);
  const [tables, setTables] = useState<VenueTableWithLayout[]>(initialTables);

  // UI state
  const [activeZoneId, setActiveZoneId] = useState<string | null>(
    initialZones[0]?.id ?? null
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [drawerTableId, setDrawerTableId] = useState<string | null>(null);
  const [showZoneManager, setShowZoneManager] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with initial data when it changes
  useEffect(() => {
    if (!hasChanges) {
      setZones(initialZones);
      setTables(initialTables);
      if (!activeZoneId && initialZones.length > 0) {
        setActiveZoneId(initialZones[0].id);
      }
    }
  }, [initialZones, initialTables, hasChanges, activeZoneId]);

  // Compute session info per table
  const { sessionsMap, duplicateTableIds } = useMemo(
    () => deduplicateSessions(sessions),
    [sessions]
  );

  // Get active zone
  const activeZone = useMemo(
    () => zones.find((z) => z.id === activeZoneId) ?? null,
    [zones, activeZoneId]
  );

  // Get selected table
  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) ?? null,
    [tables, selectedTableId]
  );

  // Get drawer table
  const drawerTable = useMemo(
    () => tables.find((t) => t.id === drawerTableId) ?? null,
    [tables, drawerTableId]
  );

  // Count tables in use / available
  const { tablesInUse, tablesAvailable } = useMemo(() => {
    const inUse = tables.filter((t) => sessionsMap.has(t.id)).length;
    return { tablesInUse: inUse, tablesAvailable: tables.length - inUse };
  }, [tables, sessionsMap]);

  // Handle table click
  const handleTableClick = useCallback(
    (tableId: string) => {
      if (isEditMode) {
        setSelectedTableId(tableId);
      } else {
        setDrawerTableId(tableId);
      }
    },
    [isEditMode]
  );

  // Handle table move (drag)
  const handleTableMove = useCallback(
    (tableId: string, x: number, y: number) => {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId ? { ...t, layout_x: x, layout_y: y } : t
        )
      );
      setHasChanges(true);
    },
    []
  );

  // Handle table resize
  const handleTableResize = useCallback(
    (tableId: string, w: number, h: number) => {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId ? { ...t, layout_w: w, layout_h: h } : t
        )
      );
      setHasChanges(true);
    },
    []
  );

  // Handle rotation change
  const handleRotationChange = useCallback(
    (tableId: string, rotation: number) => {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId ? { ...t, rotation_deg: rotation } : t
        )
      );
      setHasChanges(true);
    },
    []
  );

  // Handle shape change
  const handleShapeChange = useCallback(
    (tableId: string, shape: TableShape) => {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId ? { ...t, layout_shape: shape } : t
        )
      );
      setHasChanges(true);
    },
    []
  );

  // Handle zone change for table
  const handleTableZoneChange = useCallback(
    (tableId: string, zoneId: string) => {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId ? { ...t, zone_id: zoneId || null } : t
        )
      );
      setHasChanges(true);
    },
    []
  );

  // Handle place unplaced table
  const handlePlaceTable = useCallback(
    (tableId: string) => {
      if (!activeZoneId) return;

      const table = tables.find((t) => t.id === tableId);
      if (!table) return;

      const defaults = getDefaultLayoutForCapacity(table.capacity);

      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? {
                ...t,
                zone_id: activeZoneId,
                layout_x: 0.1 + Math.random() * 0.3,
                layout_y: 0.1 + Math.random() * 0.3,
                layout_w: defaults.w,
                layout_h: defaults.h,
                layout_shape: defaults.shape,
              }
            : t
        )
      );
      setHasChanges(true);
      setSelectedTableId(tableId);
    },
    [activeZoneId, tables]
  );

  // Zone management handlers
  const handleCreateZone = async (name: string) => {
    const sortOrder = zones.length;
    const result = await createZoneAction(venueId, name, sortOrder);
    if (result.ok && result.zone) {
      setZones((prev) => [
        ...prev,
        {
          id: result.zone!.id,
          venue_id: venueId,
          name: result.zone!.name,
          sort_order: sortOrder,
          background_image_url: null,
          canvas_width: 1200,
          canvas_height: 800,
          created_at: new Date().toISOString(),
        },
      ]);
      setActiveZoneId(result.zone!.id);
      push({ title: 'Zone created', tone: 'success' });
    } else {
      push({ title: 'Failed to create zone', description: result.error, tone: 'danger' });
    }
  };

  const handleUpdateZone = (
    zoneId: string,
    updates: { name?: string; sort_order?: number; background_image_url?: string | null }
  ) => {
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, ...updates } : z))
    );
    setHasChanges(true);
  };

  const handleDeleteZone = async (zoneId: string) => {
    const result = await deleteZoneAction(zoneId);
    if (result.ok) {
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
      setTables((prev) =>
        prev.map((t) => (t.zone_id === zoneId ? { ...t, zone_id: null } : t))
      );
      if (activeZoneId === zoneId) {
        const remaining = zones.filter((z) => z.id !== zoneId);
        setActiveZoneId(remaining[0]?.id ?? null);
      }
      push({ title: 'Zone deleted', tone: 'neutral' });
    } else {
      push({ title: 'Failed to delete zone', description: result.error, tone: 'danger' });
    }
  };

  const handleUploadBackground = async (zoneId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const result = await uploadZoneBackgroundAction(zoneId, base64, file.name);
      if (result.ok && result.url) {
        setZones((prev) =>
          prev.map((z) =>
            z.id === zoneId ? { ...z, background_image_url: result.url! } : z
          )
        );
        push({ title: 'Background uploaded', tone: 'success' });
      } else {
        push({ title: 'Failed to upload', description: result.error, tone: 'danger' });
      }
    };
    reader.readAsDataURL(file);
  };

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save zones
      const zonePayloads = zones.map((z) => ({
        id: z.id,
        name: z.name,
        sort_order: z.sort_order,
        background_image_url: z.background_image_url,
      }));
      const zonesResult = await saveVenueZonesAction(venueId, zonePayloads);
      if (!zonesResult.ok) {
        push({ title: 'Failed to save zones', description: zonesResult.error, tone: 'danger' });
        return;
      }

      // Save table layouts
      const tablePayloads = tables.map((t) => ({
        id: t.id,
        zone_id: t.zone_id,
        layout_x: t.layout_x,
        layout_y: t.layout_y,
        layout_w: t.layout_w,
        layout_h: t.layout_h,
        rotation_deg: t.rotation_deg,
        layout_shape: t.layout_shape,
      }));
      const tablesResult = await saveTableLayoutsAction(venueId, tablePayloads);
      if (!tablesResult.ok) {
        push({ title: 'Failed to save tables', description: tablesResult.error, tone: 'danger' });
        return;
      }

      setHasChanges(false);
      push({ title: 'Layout saved', tone: 'success' });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel changes
  const handleCancel = () => {
    setZones(initialZones);
    setTables(initialTables);
    setHasChanges(false);
    setSelectedTableId(null);
  };

  // Toggle edit mode
  const handleToggleEditMode = () => {
    if (isEditMode && hasChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
      handleCancel();
    }
    setIsEditMode(!isEditMode);
    setSelectedTableId(null);
    setDrawerTableId(null);
  };

  return (
    <>
      <Card className="panel-surface">
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-[color:var(--color-ink-secondary)]" />
            <CardTitle>Floor Plan</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <TokenChip tone="accent">{tablesAvailable} available</TokenChip>
            <TokenChip tone="muted">{tablesInUse} in use</TokenChip>
            {duplicateTableIds.size > 0 && (
              <TokenChip tone="warn">{duplicateTableIds.size} duplicate sessions</TokenChip>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <ZoneTabs
              zones={zones}
              activeZoneId={activeZoneId}
              onZoneChange={setActiveZoneId}
              isEditMode={isEditMode}
              onManageZones={() => setShowZoneManager(true)}
            />
            <div className="flex-1" />
            <EditModeToolbar
              isEditMode={isEditMode}
              showGrid={showGrid}
              hasChanges={hasChanges}
              isSaving={isSaving}
              onToggleEditMode={handleToggleEditMode}
              onToggleGrid={() => setShowGrid(!showGrid)}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>

          {/* Main content */}
          <div className="flex gap-4">
            {/* Canvas */}
            <div className="flex-1">
              {activeZone ? (
                <FloorPlanCanvas
                  zone={activeZone}
                  tables={tables}
                  sessions={sessionsMap}
                  isEditMode={isEditMode}
                  selectedTableId={selectedTableId}
                  showGrid={showGrid}
                  onTableClick={handleTableClick}
                  onTableMove={handleTableMove}
                  onTableResize={handleTableResize}
                />
              ) : (
                <div className="h-64 flex items-center justify-center bg-[color:var(--color-muted)]/30 rounded-xl border border-[color:var(--color-structure)]">
                  <p className="text-sm text-[color:var(--color-ink-secondary)]">
                    {zones.length === 0
                      ? 'Create a zone to start building your floor plan'
                      : 'Select a zone to view'}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar in edit mode */}
            {isEditMode && (
              <div className="w-64 space-y-3 flex-shrink-0">
                <TableInspector
                  table={selectedTable}
                  zones={zones}
                  onRotationChange={handleRotationChange}
                  onShapeChange={handleShapeChange}
                  onZoneChange={handleTableZoneChange}
                />
                <UnplacedTablesList
                  tables={tables}
                  sessions={sessionsMap}
                  onPlaceTable={handlePlaceTable}
                  isEditMode={isEditMode}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table drawer (view mode) */}
      <TableDrawer
        table={drawerTable}
        session={drawerTableId ? sessionsMap.get(drawerTableId) ?? null : null}
        isOpen={drawerTableId !== null}
        onClose={() => setDrawerTableId(null)}
        onEndSession={onEndSession}
        onAssignGame={() => {
          const session = sessionsMap.get(drawerTableId ?? '');
          if (session) {
            onAssignGame(session.sessionId);
          }
        }}
      />

      {/* Zone manager modal */}
      <ZoneManagerModal
        isOpen={showZoneManager}
        zones={zones}
        tables={tables}
        venueId={venueId}
        onClose={() => setShowZoneManager(false)}
        onCreateZone={handleCreateZone}
        onUpdateZone={handleUpdateZone}
        onDeleteZone={handleDeleteZone}
        onUploadBackground={handleUploadBackground}
      />
    </>
  );
}
