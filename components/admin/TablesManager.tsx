"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast, TokenChip } from "@/components/AppShell";
import { createTable, deleteTable } from "@/app/admin/settings/actions";
import type { VenueTable } from "@/lib/db/types";

interface TablesManagerProps {
  initialTables: VenueTable[];
  venueId: string;
}

export function TablesManager({ initialTables, venueId }: TablesManagerProps) {
  const { push } = useToast();
  const [tables, setTables] = useState<VenueTable[]>(initialTables);
  const [newLabel, setNewLabel] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetDialog = () => {
    setNewLabel("");
    setIsDialogOpen(false);
  };

  const handleAddTable = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!newLabel.trim()) {
      push({
        title: "Error",
        description: "Table label is required",
        tone: "danger",
      });
      return;
    }

    const formData = new FormData();
    formData.set("label", newLabel.trim());

    startTransition(async () => {
      const result = await createTable(formData);

      if (result.success) {
        const optimisticTable: VenueTable = {
          id: crypto.randomUUID(),
          venue_id: venueId,
          label: newLabel.trim(),
          is_active: true,
          created_at: new Date().toISOString(),
        };

        setTables((prev) =>
          [...prev, optimisticTable].sort((a, b) => a.label.localeCompare(b.label)),
        );
        push({
          title: "Table added",
          description: `"${newLabel.trim()}" is ready for use`,
          tone: "success",
        });
        resetDialog();
      } else {
        push({
          title: "Error",
          description: result.error ?? "Failed to add table",
          tone: "danger",
        });
      }
    });
  };

  const handleDeleteTable = (table: VenueTable) => {
    setDeletingId(table.id);

    startTransition(async () => {
      const result = await deleteTable(table.id);

      if (result.success) {
        setTables((prev) => prev.filter((t) => t.id !== table.id));
        push({
          title: "Table archived",
          description: `"${table.label}" has been removed`,
          tone: "neutral",
        });
      } else {
        push({
          title: "Error",
          description: result.error ?? "Failed to delete table",
          tone: "danger",
        });
      }
      setDeletingId(null);
    });
  };

  return (
    <>
      <div className="rounded-2xl border border-structure bg-surface shadow-token">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-structure p-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Settings</p>
            <h2 className="text-xl font-semibold text-ink-primary">Venue Tables</h2>
            <p className="text-sm text-ink-secondary">
              Manage the physical tables and booths available at your venue.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TokenChip tone="muted">{tables.length} active</TokenChip>
            <Button variant="secondary" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add table
            </Button>
          </div>
        </div>

        <div className="p-6">
          {tables.length === 0 ? (
            <div className="rounded-xl border border-dashed border-structure bg-surface/60 p-6 text-center text-sm text-ink-secondary">
              No tables configured yet. Add your first table to start seating sessions.
            </div>
          ) : (
            <div className="space-y-3">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-structure bg-surface/80 p-4"
                >
                  <div>
                    <p className="font-semibold text-ink-primary">{table.label}</p>
                    <p className="text-xs text-ink-secondary">
                      Created {new Date(table.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTable(table)}
                    disabled={isPending || deletingId === table.id}
                    className="text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger)]/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === table.id ? "Archiving..." : "Archive"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-structure bg-surface shadow-token">
            <div className="flex items-start justify-between gap-3 border-b border-structure p-6">
              <div>
                <CardTitle className="text-xl">Add Table</CardTitle>
                <p className="text-sm text-ink-secondary">
                  Name the table or booth so staff can assign sessions.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetDialog}
                className="text-ink-secondary"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="p-6">
              <form className="space-y-4" onSubmit={handleAddTable}>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-rulebook text-ink-secondary">
                    Table label
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Table 1, Booth A"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    disabled={isPending}
                    required
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetDialog}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending || !newLabel.trim()}>
                    Save table
                  </Button>
                </div>
              </form>
            </CardContent>
          </div>
        </div>
      )}
    </>
  );
}
