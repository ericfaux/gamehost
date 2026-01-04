'use client';

/**
 * FloorPlanCanvas - The main floor plan canvas with background image and grid.
 * Renders tables within a zone and handles edit mode interactions.
 */

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { TableNode, type TableSessionInfo } from './TableNode';
import { LayoutGrid, Plus } from '@/components/icons';
import type { VenueZone, VenueTableWithLayout } from '@/lib/db/types';

interface FloorPlanCanvasProps {
  zone: VenueZone;
  tables: VenueTableWithLayout[];
  sessions: Map<string, TableSessionInfo>;
  isEditMode: boolean;
  selectedTableId: string | null;
  showGrid: boolean;
  onTableClick: (tableId: string) => void;
  onTableMove?: (tableId: string, x: number, y: number) => void;
  onTableResize?: (tableId: string, w: number, h: number) => void;
  onAddFirstTable?: () => void;
}

const CANVAS_ASPECT = 3 / 2; // 1200x800 default

export function FloorPlanCanvas({
  zone,
  tables,
  sessions,
  isEditMode,
  selectedTableId,
  showGrid,
  onTableClick,
  onTableMove,
  onTableResize,
  onAddFirstTable,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 600, height: 400 });

  // Drag state
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resize state
  const [resizingTable, setResizingTable] = useState<string | null>(null);
  const [resizeCorner, setResizeCorner] = useState<'se' | 'sw' | 'ne' | 'nw'>('se');

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      // Maintain aspect ratio
      const width = rect.width;
      const height = width / CANVAS_ASPECT;
      setContainerSize({ width, height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Filter tables that are placed in this zone
  const zoneTables = useMemo(() => {
    return tables.filter(
      (t) => t.zone_id === zone.id && t.layout_x !== null && t.layout_y !== null
    );
  }, [tables, zone.id]);

  // Drag handlers for edit mode
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, tableId: string) => {
      if (!isEditMode) return;

      e.preventDefault();
      e.stopPropagation();

      const table = tables.find((t) => t.id === tableId);
      if (!table) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Check if clicking on resize handle
      const target = e.target as HTMLElement;
      if (target.dataset.resize) {
        setResizingTable(tableId);
        setResizeCorner(target.dataset.resize as 'se' | 'sw' | 'ne' | 'nw');
        return;
      }

      const tableX = (table.layout_x ?? 0) * containerSize.width;
      const tableY = (table.layout_y ?? 0) * containerSize.height;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setDraggingTable(tableId);
      setDragOffset({
        x: mouseX - tableX,
        y: mouseY - tableY,
      });
      onTableClick(tableId);
    },
    [isEditMode, tables, containerSize, onTableClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditMode) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (draggingTable && onTableMove) {
        const table = tables.find((t) => t.id === draggingTable);
        if (!table) return;

        const tableW = (table.layout_w ?? 0.12) * containerSize.width;
        const tableH = (table.layout_h ?? 0.10) * containerSize.height;

        // Calculate new position, clamping to bounds
        let newX = (mouseX - dragOffset.x) / containerSize.width;
        let newY = (mouseY - dragOffset.y) / containerSize.height;

        // Clamp to keep table within canvas
        const maxX = 1 - (tableW / containerSize.width);
        const maxY = 1 - (tableH / containerSize.height);
        newX = Math.max(0, Math.min(maxX, newX));
        newY = Math.max(0, Math.min(maxY, newY));

        onTableMove(draggingTable, newX, newY);
      }

      if (resizingTable && onTableResize) {
        const table = tables.find((t) => t.id === resizingTable);
        if (!table) return;

        const tableX = (table.layout_x ?? 0) * containerSize.width;
        const tableY = (table.layout_y ?? 0) * containerSize.height;

        // Calculate new size based on mouse position and corner
        let newW = table.layout_w ?? 0.12;
        let newH = table.layout_h ?? 0.10;

        if (resizeCorner === 'se') {
          newW = (mouseX - tableX) / containerSize.width;
          newH = (mouseY - tableY) / containerSize.height;
        } else if (resizeCorner === 'sw') {
          newW = (tableX + (table.layout_w ?? 0.12) * containerSize.width - mouseX) / containerSize.width;
          newH = (mouseY - tableY) / containerSize.height;
        } else if (resizeCorner === 'ne') {
          newW = (mouseX - tableX) / containerSize.width;
          newH = (tableY + (table.layout_h ?? 0.10) * containerSize.height - mouseY) / containerSize.height;
        } else if (resizeCorner === 'nw') {
          newW = (tableX + (table.layout_w ?? 0.12) * containerSize.width - mouseX) / containerSize.width;
          newH = (tableY + (table.layout_h ?? 0.10) * containerSize.height - mouseY) / containerSize.height;
        }

        // Clamp size to min/max
        newW = Math.max(0.06, Math.min(0.40, newW));
        newH = Math.max(0.05, Math.min(0.35, newH));

        onTableResize(resizingTable, newW, newH);
      }
    },
    [isEditMode, draggingTable, resizingTable, tables, containerSize, dragOffset, resizeCorner, onTableMove, onTableResize]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingTable(null);
    setResizingTable(null);
  }, []);

  // Handle mouse leaving the canvas
  const handleMouseLeave = useCallback(() => {
    if (draggingTable || resizingTable) {
      handleMouseUp();
    }
  }, [draggingTable, resizingTable, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-slate-50 dark:bg-slate-900 bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(circle,#334155_1px,transparent_1px)] bg-[size:24px_24px] rounded-xl overflow-hidden border border-[color:var(--color-border)] shadow-inner"
      style={{ height: `${containerSize.height}px` }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background image */}
      {zone.background_image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none"
          style={{ backgroundImage: `url(${zone.background_image_url})` }}
        />
      )}

      {/* Grid overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--color-structure) 1px, transparent 1px),
              linear-gradient(to bottom, var(--color-structure) 1px, transparent 1px)
            `,
            backgroundSize: `${containerSize.width / 12}px ${containerSize.height / 8}px`,
            opacity: 0.3,
          }}
        />
      )}

      {/* Tables */}
      {zoneTables.map((table) => {
        const session = sessions.get(table.id) ?? null;
        const isSelected = selectedTableId === table.id;

        return (
          <div
            key={table.id}
            onMouseDown={(e) => handleMouseDown(e, table.id)}
          >
            <TableNode
              table={table}
              session={session}
              isSelected={isSelected}
              isEditMode={isEditMode}
              onClick={() => onTableClick(table.id)}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
            />

            {/* Resize handles in edit mode */}
            {isEditMode && isSelected && (
              <>
                <ResizeHandle
                  table={table}
                  corner="se"
                  containerWidth={containerSize.width}
                  containerHeight={containerSize.height}
                />
                <ResizeHandle
                  table={table}
                  corner="sw"
                  containerWidth={containerSize.width}
                  containerHeight={containerSize.height}
                />
                <ResizeHandle
                  table={table}
                  corner="ne"
                  containerWidth={containerSize.width}
                  containerHeight={containerSize.height}
                />
                <ResizeHandle
                  table={table}
                  corner="nw"
                  containerWidth={containerSize.width}
                  containerHeight={containerSize.height}
                />
              </>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {zoneTables.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
          {/* Ghost token illustration */}
          <div className="
            w-24 h-24 mb-4
            border-2 border-dashed border-slate-300 dark:border-slate-600
            rounded-lg
            flex items-center justify-center
            text-slate-400 dark:text-slate-500
          ">
            <LayoutGrid className="w-10 h-10" />
          </div>

          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
            No tables placed yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-xs">
            {isEditMode
              ? 'Drag tables from the sidebar or click below to get started'
              : 'Start building your floor plan by adding your first table'}
          </p>

          {onAddFirstTable && (
            <button
              onClick={onAddFirstTable}
              className="
                inline-flex items-center gap-2
                px-4 py-2
                bg-orange-500 hover:bg-orange-600
                text-white font-medium
                rounded-lg shadow-sm
                transition-colors
              "
            >
              <Plus className="w-4 h-4" />
              Add First Table
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Resize handle component
function ResizeHandle({
  table,
  corner,
  containerWidth,
  containerHeight,
}: {
  table: VenueTableWithLayout;
  corner: 'se' | 'sw' | 'ne' | 'nw';
  containerWidth: number;
  containerHeight: number;
}) {
  const x = (table.layout_x ?? 0) * containerWidth;
  const y = (table.layout_y ?? 0) * containerHeight;
  const w = (table.layout_w ?? 0.12) * containerWidth;
  const h = (table.layout_h ?? 0.10) * containerHeight;

  const position = {
    se: { left: x + w - 4, top: y + h - 4, cursor: 'nwse-resize' },
    sw: { left: x - 4, top: y + h - 4, cursor: 'nesw-resize' },
    ne: { left: x + w - 4, top: y - 4, cursor: 'nesw-resize' },
    nw: { left: x - 4, top: y - 4, cursor: 'nwse-resize' },
  };

  const pos = position[corner];

  return (
    <div
      data-resize={corner}
      className="absolute w-3 h-3 bg-[color:var(--color-accent)] rounded-full border-2 border-white shadow-md z-10"
      style={{
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        cursor: pos.cursor,
        transform: `rotate(${table.rotation_deg}deg)`,
      }}
    />
  );
}
