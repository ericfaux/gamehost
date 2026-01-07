'use client';

/**
 * FloorPlanPageClient - The Layout Engine
 *
 * This Client Component acts as the "brain" for the floor plan editing experience.
 * It orchestrates all table layout state and provides a "God Mode" editing experience
 * with drag, drop, resize, and rotate capabilities.
 *
 * Architecture: "Clean Handoff" Pattern
 * - Server Component (page.tsx) fetches data and serializes it
 * - This component hydrates data into mutable "Draft State"
 * - All physics/interactions happen locally (optimistic updates)
 * - "Save Game" persists the layout to the server
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TokenChip, useToast } from '@/components/AppShell';
import { TablesManager } from '@/components/admin/TablesManager';
import { FloorPlanCanvas } from '@/components/admin/floorplan/FloorPlanCanvas';
import { ZoneTabs } from '@/components/admin/floorplan/ZoneTabs';
import { TableInspector } from '@/components/admin/floorplan/TableInspector';
import { TableDrawer } from '@/components/admin/floorplan/TableDrawer';
import { EditModeToolbar } from '@/components/admin/floorplan/EditModeToolbar';
import { UnplacedTablesList } from '@/components/admin/floorplan/UnplacedTablesList';
import { ZoneManagerModal } from '@/components/admin/floorplan/ZoneManagerModal';
import { FloatingToolbar } from '@/components/admin/floorplan/FloatingToolbar';
import { getDefaultLayoutForCapacity } from '@/components/admin/floorplan/TableNode';
import { CreateBookingModal } from '@/components/admin/bookings/CreateBookingModal';
import type { TableSessionInfo } from '@/components/admin/floorplan/TableNode';
import {
  saveTableLayoutsAction,
  saveVenueZonesAction,
  createZoneAction,
  deleteZoneAction,
  uploadZoneBackgroundAction,
  type TableLayoutPayload,
} from '@/app/admin/sessions/floor-plan-actions';
import type { VenueZone, VenueTableWithLayout, VenueTable, TableShape } from '@/lib/db/types';
import { AlertTriangle, List, Map as MapIcon } from '@/components/icons';

// =============================================================================
// TYPES
// =============================================================================

interface FloorPlanPageClientProps {
  venueId: string;
  venueName: string;
  venueSlug: string;
  initialZones: VenueZone[];
  initialTables: VenueTable[];
  initialTablesWithLayout: VenueTableWithLayout[];
  /** Sessions passed as array of [tableId, sessionInfo] entries for serialization */
  initialSessions: [string, TableSessionInfo][];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function FloorPlanPageClient({
  venueId,
  venueName,
  venueSlug,
  initialZones,
  initialTables,
  initialTablesWithLayout,
  initialSessions,
}: FloorPlanPageClientProps) {
  const { push } = useToast();

  // URL-based navigation
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Get view from URL (default to 'map' if not specified)
  const view = (searchParams.get('view') as 'map' | 'list') ?? 'map';

  // View transition state
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const pendingViewRef = useRef<'map' | 'list' | null>(null);

  // Function to update view via URL with smooth transition
  const setView = (newView: 'map' | 'list') => {
    if (newView === view) return;

    // Start fade out
    setIsViewTransitioning(true);
    pendingViewRef.current = newView;

    // After fade out completes, change the view
    setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', pendingViewRef.current!);
      router.replace(`${pathname}?${params.toString()}`);
      pendingViewRef.current = null;
    }, 150); // Match the CSS transition duration
  };

  // Reset transitioning state when view changes
  useEffect(() => {
    if (isViewTransitioning) {
      // Small delay to allow DOM to update before fade in
      const timer = setTimeout(() => {
        setIsViewTransitioning(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [view, isViewTransitioning]);

  // ---------------------------------------------------------------------------
  // STATE: The "Draft State" (mutable local copy for optimistic updates)
  // ---------------------------------------------------------------------------

  // Zone and layout state
  const [zones, setZones] = useState<VenueZone[]>(initialZones);
  const [layoutState, setLayoutState] = useState<VenueTableWithLayout[]>(initialTablesWithLayout);

  // UI state
  const [activeZoneId, setActiveZoneId] = useState<string>(initialZones[0]?.id ?? '');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [drawerTableId, setDrawerTableId] = useState<string | null>(null);
  const [showZoneManager, setShowZoneManager] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingPreselectedTableId, setBookingPreselectedTableId] = useState<string | null>(null);

  // Persistence state
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ---------------------------------------------------------------------------
  // DERIVED STATE
  // ---------------------------------------------------------------------------

  // Reconstruct sessionsMap from serialized array
  const sessionsMap = useMemo(() => {
    return new Map<string, TableSessionInfo>(initialSessions);
  }, [initialSessions]);

  // Get the currently active zone
  const activeZone = useMemo(() => {
    return zones.find((z) => z.id === activeZoneId) ?? null;
  }, [zones, activeZoneId]);

  // Get the currently selected table
  const selectedTable = useMemo(() => {
    return layoutState.find((t) => t.id === selectedTableId) ?? null;
  }, [layoutState, selectedTableId]);

  // Get drawer table for view mode
  const drawerTable = useMemo(() => {
    return layoutState.find((t) => t.id === drawerTableId) ?? null;
  }, [layoutState, drawerTableId]);

  // Tables stats
  const { tablesInUse, tablesAvailable, duplicateCount } = useMemo(() => {
    let inUse = 0;
    let duplicates = 0;
    sessionsMap.forEach((session) => {
      inUse++;
      if (session.hasDuplicates) duplicates++;
    });
    return {
      tablesInUse: inUse,
      tablesAvailable: layoutState.length - inUse,
      duplicateCount: duplicates,
    };
  }, [layoutState, sessionsMap]);

  // ---------------------------------------------------------------------------
  // SYNC: Update local state when server data changes (but not during edits)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!hasChanges) {
      setZones(initialZones);
      setLayoutState(initialTablesWithLayout);
      if (!activeZoneId && initialZones.length > 0) {
        setActiveZoneId(initialZones[0].id);
      }
    }
  }, [initialZones, initialTablesWithLayout, hasChanges, activeZoneId]);

  // ---------------------------------------------------------------------------
  // PHYSICS HANDLERS: The "Tactile" part
  // ---------------------------------------------------------------------------

  /**
   * handleMove - Update table position instantly (drag handler)
   * Normalized coordinates (0-1) relative to canvas size
   */
  const handleMove = useCallback((id: string, x: number, y: number) => {
    setLayoutState((prev) =>
      prev.map((t) => (t.id === id ? { ...t, layout_x: x, layout_y: y } : t))
    );
    setHasChanges(true);
  }, []);

  /**
   * handleResize - Update table dimensions (resize handler)
   * Normalized dimensions (0-1) relative to canvas size
   */
  const handleResize = useCallback((id: string, w: number, h: number) => {
    setLayoutState((prev) =>
      prev.map((t) => (t.id === id ? { ...t, layout_w: w, layout_h: h } : t))
    );
    setHasChanges(true);
  }, []);

  /**
   * handleRotate - Update table rotation (snap rotation)
   * Rotation in degrees (0-359)
   */
  const handleRotate = useCallback((id: string, deg: number) => {
    setLayoutState((prev) =>
      prev.map((t) => (t.id === id ? { ...t, rotation_deg: deg } : t))
    );
    setHasChanges(true);
  }, []);

  /**
   * handleShapeChange - Update table shape
   */
  const handleShapeChange = useCallback((id: string, shape: TableShape) => {
    setLayoutState((prev) =>
      prev.map((t) => (t.id === id ? { ...t, layout_shape: shape } : t))
    );
    setHasChanges(true);
  }, []);

  /**
   * handlePlace - "Teleport" a table from Unplaced list to the current zone
   * Uses getDefaultLayoutForCapacity for sane initial size/shape
   */
  const handlePlace = useCallback(
    (id: string) => {
      if (!activeZoneId) {
        push({ title: 'Select a zone first', tone: 'neutral' });
        return;
      }

      const table = layoutState.find((t) => t.id === id);
      if (!table) return;

      // Get sensible defaults based on table capacity
      const defaults = getDefaultLayoutForCapacity(table.capacity);

      // Place near center with slight random offset to avoid stacking
      const centerX = 0.4 + Math.random() * 0.2;
      const centerY = 0.4 + Math.random() * 0.2;

      setLayoutState((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                zone_id: activeZoneId,
                layout_x: centerX,
                layout_y: centerY,
                layout_w: defaults.w,
                layout_h: defaults.h,
                layout_shape: defaults.shape,
              }
            : t
        )
      );
      setHasChanges(true);
      setSelectedTableId(id); // Select the newly placed table
    },
    [activeZoneId, layoutState, push]
  );

  /**
   * handleBanish - Remove a table from the map (set zone_id to null)
   * Table goes back to the Unplaced inventory
   */
  const handleBanish = useCallback((id: string) => {
    setLayoutState((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, zone_id: null, layout_x: null, layout_y: null }
          : t
      )
    );
    setHasChanges(true);
    setSelectedTableId(null); // Deselect the banished table
  }, []);

  /**
   * handleTableZoneChange - Move table to a different zone via inspector
   */
  const handleTableZoneChange = useCallback(
    (id: string, zoneId: string) => {
      if (!zoneId) {
        // Empty string means "Unassigned" - banish the table
        handleBanish(id);
        return;
      }

      const table = layoutState.find((t) => t.id === id);
      if (!table) return;

      // If table has no layout position, give it default placement
      const needsPlacement = table.layout_x === null || table.layout_y === null;
      const defaults = needsPlacement
        ? getDefaultLayoutForCapacity(table.capacity)
        : null;

      setLayoutState((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                zone_id: zoneId,
                ...(needsPlacement && defaults
                  ? {
                      layout_x: 0.4 + Math.random() * 0.2,
                      layout_y: 0.4 + Math.random() * 0.2,
                      layout_w: defaults.w,
                      layout_h: defaults.h,
                      layout_shape: defaults.shape,
                    }
                  : {}),
              }
            : t
        )
      );
      setHasChanges(true);
    },
    [layoutState, handleBanish]
  );

  // ---------------------------------------------------------------------------
  // ZONE HANDLERS
  // ---------------------------------------------------------------------------

  const handleZoneChange = useCallback((zoneId: string) => {
    setActiveZoneId(zoneId);
    setSelectedTableId(null); // Clear selection when changing zones (prevent "ghost" edits)
  }, []);

  const handleCreateZone = async (name: string) => {
    const sortOrder = zones.length;
    const result = await createZoneAction(venueId, name, sortOrder);
    if (result.ok && result.zone) {
      const newZone: VenueZone = {
        id: result.zone.id,
        venue_id: venueId,
        name: result.zone.name,
        sort_order: sortOrder,
        background_image_url: null,
        canvas_width: 1200,
        canvas_height: 800,
        created_at: new Date().toISOString(),
      };
      setZones((prev) => [...prev, newZone]);
      setActiveZoneId(newZone.id);
      push({ title: 'Zone created', tone: 'success' });
    } else {
      push({ title: 'Failed to create zone', description: result.error, tone: 'danger' });
    }
  };

  const handleUpdateZone = useCallback(
    (
      zoneId: string,
      updates: { name?: string; sort_order?: number; background_image_url?: string | null }
    ) => {
      setZones((prev) =>
        prev.map((z) => (z.id === zoneId ? { ...z, ...updates } : z))
      );
      setHasChanges(true);
    },
    []
  );

  const handleDeleteZone = async (zoneId: string) => {
    const result = await deleteZoneAction(zoneId);
    if (result.ok) {
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
      // Unassign tables from deleted zone
      setLayoutState((prev) =>
        prev.map((t) => (t.zone_id === zoneId ? { ...t, zone_id: null } : t))
      );
      // Switch to another zone if current was deleted
      if (activeZoneId === zoneId) {
        const remaining = zones.filter((z) => z.id !== zoneId);
        setActiveZoneId(remaining[0]?.id ?? '');
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
        push({ title: 'Upload failed', description: result.error, tone: 'danger' });
      }
    };
    reader.readAsDataURL(file);
  };

  // ---------------------------------------------------------------------------
  // TABLE CLICK HANDLER
  // ---------------------------------------------------------------------------

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

  /**
   * handleListTableSelect - Handle table selection in list view
   * This syncs selection between map and list views
   */
  const handleListTableSelect = useCallback((tableId: string | null) => {
    setSelectedTableId(tableId);
  }, []);

  /**
   * handleBookTable - Open booking modal with table pre-selected
   */
  const handleBookTable = useCallback((tableId: string) => {
    setBookingPreselectedTableId(tableId);
    setShowBookingModal(true);
  }, []);

  // ---------------------------------------------------------------------------
  // PERSISTENCE: "Save Game"
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save zones first
      const zonePayloads = zones.map((z) => ({
        id: z.id,
        name: z.name,
        sort_order: z.sort_order,
        background_image_url: z.background_image_url,
      }));
      const zonesResult = await saveVenueZonesAction(venueId, zonePayloads);
      if (!zonesResult.ok) {
        push({
          title: 'Failed to save zones',
          description: zonesResult.error,
          tone: 'danger',
        });
        return;
      }

      // Save table layouts
      const tablePayloads: TableLayoutPayload[] = layoutState.map((t) => ({
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
        push({
          title: 'Failed to save tables',
          description: tablesResult.error,
          tone: 'danger',
        });
        return;
      }

      setHasChanges(false);
      push({ title: 'Layout saved', tone: 'success' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setZones(initialZones);
    setLayoutState(initialTablesWithLayout);
    setHasChanges(false);
    setSelectedTableId(null);
  };

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

  // ---------------------------------------------------------------------------
  // RENDER: The "Game Loop"
  // ---------------------------------------------------------------------------

  // Zero State: No tables exist at all
  if (initialTables.length === 0) {
    return (
      <>
        {/* Tab navigation - still show it so they can switch */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-structure bg-elevated p-1 w-fit">
          <button
            type="button"
            onClick={() => setView('map')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === 'map'
                ? 'bg-surface shadow-card text-ink-primary'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-muted/60'
            }`}
          >
            <MapIcon className="h-4 w-4" />
            Visual Map
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === 'list'
                ? 'bg-surface shadow-card text-ink-primary'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-muted/60'
            }`}
          >
            <List className="h-4 w-4" />
            Table List
          </button>
        </div>

        <div
          className={cn(
            'transition-opacity duration-150',
            isViewTransitioning ? 'opacity-0' : 'opacity-100'
          )}
        >
          {view === 'map' ? (
            <Card className="panel-surface border-2 border-dashed border-structure">
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4 text-center max-w-md mx-auto">
                  <div className="h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Welcome to your Floor Plan!</h3>
                    <p className="text-sm text-ink-secondary">
                      It looks like you haven&apos;t set up any tables yet.
                      Create your first table to start building your floor plan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                  >
                    <List className="h-4 w-4" />
                    Go to Table List
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <TablesManager
              initialTables={initialTables}
              venueId={venueId}
              venueName={venueName}
              venueSlug={venueSlug}
              tablesWithLayout={initialTablesWithLayout}
              zones={initialZones}
              selectedTableId={selectedTableId}
              onSelectTable={handleListTableSelect}
            />
          )}
        </div>
      </>
    );
  }

  // Normal State: Tables exist
  return (
    <>
      {/* Tab navigation */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-structure bg-elevated p-1 w-fit">
        <button
          type="button"
          onClick={() => setView('map')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            view === 'map'
              ? 'bg-surface shadow-card text-ink-primary'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-muted/60'
          }`}
          aria-pressed={view === 'map'}
        >
          <MapIcon className="h-4 w-4" />
          Visual Map
        </button>
        <button
          type="button"
          onClick={() => setView('list')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            view === 'list'
              ? 'bg-surface shadow-card text-ink-primary'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-muted/60'
          }`}
          aria-pressed={view === 'list'}
        >
          <List className="h-4 w-4" />
          Table List
        </button>
      </div>

      {/* Tab content with smooth transition */}
      <div
        className={cn(
          'transition-opacity duration-150',
          isViewTransitioning ? 'opacity-0' : 'opacity-100'
        )}
      >
        {view === 'map' ? (
          <Card className="panel-surface">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-ink-secondary" />
                <CardTitle>Floor Plan</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <TokenChip tone="accent">{tablesAvailable} available</TokenChip>
                <TokenChip tone="muted">{tablesInUse} in use</TokenChip>
                {duplicateCount > 0 && (
                  <TokenChip tone="warn">{duplicateCount} duplicate sessions</TokenChip>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-3">
                <ZoneTabs
                  zones={zones}
                  activeZoneId={activeZoneId}
                  onZoneChange={handleZoneChange}
                  isEditMode={isEditMode}
                  onManageZones={() => setShowZoneManager(true)}
                />
                <div className="flex-1" />
                <EditModeToolbar
                  isEditMode={isEditMode}
                  hasChanges={hasChanges}
                  isSaving={isSaving}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              </div>

              {/* Main content: Canvas + Sidebar */}
              <div className="flex gap-4">
                {/* Canvas container with floating toolbar */}
                <div className="flex-1 relative">
                  {activeZone ? (
                    <>
                      <FloorPlanCanvas
                        zone={activeZone}
                        tables={layoutState}
                        sessions={sessionsMap}
                        isEditMode={isEditMode}
                        selectedTableId={selectedTableId}
                        showGrid={showGrid}
                        onTableClick={handleTableClick}
                        onTableMove={handleMove}
                        onTableResize={handleResize}
                      />
                      {/* Floating toolbar */}
                      <FloatingToolbar
                        isEditMode={isEditMode}
                        showGrid={showGrid}
                        onToggleEditMode={handleToggleEditMode}
                        onToggleGrid={() => setShowGrid(!showGrid)}
                      />
                    </>
                  ) : zones.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-3 bg-muted/30 rounded-xl border border-structure">
                      <p className="text-sm text-ink-secondary">
                        Create a zone to start building your floor plan
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowZoneManager(true)}
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        + Add Zone
                      </button>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted/30 rounded-xl border border-structure">
                      <p className="text-sm text-ink-secondary">
                        Select a zone to view
                      </p>
                    </div>
                  )}
                </div>

                {/* Sidebar - only in edit mode */}
                {isEditMode && (
                  <div className="w-64 space-y-3 flex-shrink-0">
                    {/* TableInspector when table selected, otherwise show unplaced */}
                    <TableInspector
                      table={selectedTable}
                      zones={zones}
                      onRotationChange={handleRotate}
                      onShapeChange={handleShapeChange}
                      onZoneChange={handleTableZoneChange}
                    />
                    <UnplacedTablesList
                      tables={layoutState}
                      sessions={sessionsMap}
                      onPlaceTable={handlePlace}
                      isEditMode={isEditMode}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <TablesManager
            initialTables={initialTables}
            venueId={venueId}
            venueName={venueName}
            venueSlug={venueSlug}
            tablesWithLayout={layoutState}
            zones={zones}
            selectedTableId={selectedTableId}
            onSelectTable={handleListTableSelect}
          />
        )}
      </div>

      {/* Table drawer (view mode) */}
      <TableDrawer
        table={drawerTable}
        session={drawerTableId ? sessionsMap.get(drawerTableId) ?? null : null}
        isOpen={drawerTableId !== null}
        onClose={() => setDrawerTableId(null)}
        onBookTable={handleBookTable}
      />

      {/* Zone manager modal */}
      <ZoneManagerModal
        isOpen={showZoneManager}
        zones={zones}
        tables={layoutState}
        venueId={venueId}
        onClose={() => setShowZoneManager(false)}
        onCreateZone={handleCreateZone}
        onUpdateZone={handleUpdateZone}
        onDeleteZone={handleDeleteZone}
        onUploadBackground={handleUploadBackground}
      />

      {/* Create booking modal */}
      <CreateBookingModal
        open={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setBookingPreselectedTableId(null);
        }}
        venueId={venueId}
        preselectedTable={bookingPreselectedTableId ?? undefined}
        preselectedDate={format(new Date(), 'yyyy-MM-dd')}
      />
    </>
  );
}
