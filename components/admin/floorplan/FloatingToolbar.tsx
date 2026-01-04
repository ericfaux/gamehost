'use client';

/**
 * FloatingToolbar - Figma-style floating tool palette for the floor plan canvas.
 * Positioned at the bottom center of the map container.
 */

import { cn } from '@/lib/utils';
import { Pencil, Eye, Plus, Grid3x3, Maximize2 } from '@/components/icons';

interface FloatingToolbarProps {
  isEditMode: boolean;
  showGrid: boolean;
  onToggleEditMode: () => void;
  onToggleGrid: () => void;
  onAddTable?: () => void;
  onZoomToFit?: () => void;
}

export function FloatingToolbar({
  isEditMode,
  showGrid,
  onToggleEditMode,
  onToggleGrid,
  onAddTable,
  onZoomToFit,
}: FloatingToolbarProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-2 bg-[color:var(--color-surface)] border border-[color:var(--color-structure)] rounded-full shadow-lg px-4 py-2">
        {/* Edit Mode Toggle */}
        <button
          type="button"
          onClick={onToggleEditMode}
          title={isEditMode ? 'Switch to View mode' : 'Switch to Edit mode'}
          className={cn(
            'p-2 rounded-full transition-colors',
            isEditMode
              ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]'
              : 'text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-ink-primary)]'
          )}
        >
          {isEditMode ? (
            <Pencil className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-[color:var(--color-structure)]" />

        {/* Add Table Button (only in edit mode) */}
        {isEditMode && onAddTable && (
          <button
            type="button"
            onClick={onAddTable}
            title="Add table to zone"
            className="p-2 rounded-full text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-ink-primary)] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Grid Toggle (only in edit mode) */}
        {isEditMode && (
          <button
            type="button"
            onClick={onToggleGrid}
            title={showGrid ? 'Hide grid' : 'Show grid'}
            className={cn(
              'p-2 rounded-full transition-colors',
              showGrid
                ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]'
                : 'text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-ink-primary)]'
            )}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
        )}

        {/* Zoom to Fit */}
        {onZoomToFit && (
          <button
            type="button"
            onClick={onZoomToFit}
            title="Zoom to fit"
            className="p-2 rounded-full text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-ink-primary)] transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
