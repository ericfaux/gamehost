'use client';

/**
 * EditModeToolbar - Shows save/cancel controls when in edit mode with changes.
 * The View/Edit toggle and grid controls have moved to FloatingToolbar.
 */

import { Save, X, Loader2 } from '@/components/icons';
import { Button } from '@/components/ui/button';

interface EditModeToolbarProps {
  isEditMode: boolean;
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function EditModeToolbar({
  isEditMode,
  hasChanges,
  isSaving,
  onSave,
  onCancel,
}: EditModeToolbarProps) {
  // Only show when in edit mode with changes
  if (!isEditMode || !hasChanges) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
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
    </div>
  );
}
