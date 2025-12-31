"use client";

import { Button } from "@/components/ui/button";

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
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={onToggleEditMode} variant={isEditMode ? "default" : "secondary"}>
        {isEditMode ? "Exit edit mode" : "Edit layout"}
      </Button>
      <Button size="sm" variant="outline" onClick={onToggleGrid}>
        {showGrid ? "Hide grid" : "Show grid"}
      </Button>
      <Button size="sm" disabled={!hasChanges || isSaving} onClick={onSave}>
        {isSaving ? "Saving..." : "Save"}
      </Button>
      <Button size="sm" variant="ghost" disabled={!hasChanges} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
