'use client';

/**
 * EditModeToolbar - Toolbar for edit mode controls.
 * Toggle edit mode, show grid, save/cancel changes.
 */

import { Eye, Pencil, Grid3x3, Save, X, Loader2 } from '@/components/icons';
import { Button } from '@/components/ui/button';

interface EditModeToolbarProps {
  isEditMode: boolean;
  showGrid: boolean;
  hasChanges: boolean;
  isSaving: boolean;
  onToggleEditMode: () => void;
  onToggleGrid: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function EditModeToolbar({
  isEditMode,
  showGrid,
  hasChanges,
  isSaving,
  onToggleEditMode,
  onToggleGrid,
  onSave,
  onCancel,
}: EditModeToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {/* View/Edit mode toggle */}
      <div className="flex items-center rounded-lg border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] p-1">
        <button
          type="button"
          onClick={() => !isEditMode || onToggleEditMode()}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            !isEditMode
              ? 'bg-[color:var(--color-surface)] shadow-card text-[color:var(--color-ink-primary)]'
              : 'text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)]'
          }`}
          aria-pressed={!isEditMode}
        >
          <Eye className="h-4 w-4" />
          View
        </button>
        <button
          type="button"
          onClick={() => isEditMode || onToggleEditMode()}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            isEditMode
              ? 'bg-[color:var(--color-surface)] shadow-card text-[color:var(--color-ink-primary)]'
              : 'text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)]'
          }`}
          aria-pressed={isEditMode}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      {/* Grid toggle (only in edit mode) */}
      {isEditMode && (
        <button
          type="button"
          onClick={onToggleGrid}
          className={`p-2 rounded-lg border transition-colors ${
            showGrid
              ? 'bg-[color:var(--color-accent-soft)] border-[color:var(--color-accent)] text-[color:var(--color-accent)]'
              : 'border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)]'
          }`}
          title={showGrid ? 'Hide grid' : 'Show grid'}
        >
          <Grid3x3 className="h-4 w-4" />
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save/Cancel buttons (only in edit mode with changes) */}
      {isEditMode && (
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save layout
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
