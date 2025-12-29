"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast, TokenChip } from "@/components/AppShell";
import { createTable, deleteTable } from "@/app/admin/settings/actions";
import type { VenueTable } from "@/lib/db/types";

interface TablesManagerProps {
  tables: VenueTable[];
  venueId: string;
}

export function TablesManager({ tables: initialTables, venueId }: TablesManagerProps) {
  const { push } = useToast();
  const [tables, setTables] = useState<VenueTable[]>(initialTables);
  const [newLabel, setNewLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddTable = async (e: React.FormEvent<HTMLFormElement>) => {
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
        // Optimistically add to UI (will be replaced on revalidation)
        const optimisticTable: VenueTable = {
          id: crypto.randomUUID(),
          venue_id: venueId,
          label: newLabel.trim(),
          is_active: true,
          created_at: new Date().toISOString(),
        };
        setTables((prev) => [...prev, optimisticTable].sort((a, b) => a.label.localeCompare(b.label)));
        setNewLabel("");
        push({
          title: "Table added",
          description: `"${newLabel.trim()}" is ready for use`,
          tone: "success",
        });
      } else {
        push({
          title: "Error",
          description: result.error ?? "Failed to add table",
          tone: "danger",
        });
      }
    });
  };

  const handleDeleteTable = async (table: VenueTable) => {
    setDeletingId(table.id);
    
    startTransition(async () => {
      const result = await deleteTable(table.id);
      
      if (result.success) {
        // Optimistically remove from UI
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
    <Card className="panel-surface">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Venue Tables</CardTitle>
        <TokenChip tone="muted">{tables.length} active</TokenChip>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAddTable} className="flex gap-2">
          <Input
            type="text"
            placeholder="Table label (e.g., Table 1, Booth A)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            disabled={isPending}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" disabled={isPending || !newLabel.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>

        <div className="divide-y divide-[color:var(--color-structure)]">
          {tables.map((table) => (
            <div
              key={table.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold text-[color:var(--color-ink-primary)]">
                  {table.label}
                </p>
                <p className="text-xs text-[color:var(--color-ink-secondary)]">
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
          {tables.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-secondary">
              No tables configured yet. Add your first table above.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
