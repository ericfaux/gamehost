"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, QrCode, Trash2, X } from "@/components/icons/lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast, TokenChip } from "@/components/AppShell";
import { createTable, deleteTable, updateTable } from "@/app/admin/settings/actions";
import { QRCodeModal } from "@/components/admin/QRCodeModal";
import type { VenueTable } from "@/lib/db/types";

interface TablesManagerProps {
  initialTables: VenueTable[];
  venueId: string;
  venueName: string;
  venueSlug: string;
}

export function TablesManager({ initialTables, venueId, venueName, venueSlug }: TablesManagerProps) {
  const { push } = useToast();
  const [tables, setTables] = useState<VenueTable[]>(initialTables);
  const [tableLabel, setTableLabel] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [description, setDescription] = useState("");
  const [editingTable, setEditingTable] = useState<VenueTable | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [qrTable, setQrTable] = useState<VenueTable | null>(null);

  const resetDialog = () => {
    setTableLabel("");
    setCapacity("4");
    setDescription("");
    setEditingTable(null);
    setIsDialogOpen(false);
  };

  const openCreateDialog = () => {
    setTableLabel("");
    setCapacity("4");
    setDescription("");
    setEditingTable(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedLabel = tableLabel.trim();
    const trimmedDescription = description.trim();
    const parsedCapacity =
      capacity.trim() === ""
        ? null
        : Number.isFinite(Number(capacity))
          ? Number(capacity)
          : NaN;

    if (!trimmedLabel) {
      push({
        title: "Error",
        description: "Table label is required",
        tone: "danger",
      });
      return;
    }

    if (Number.isNaN(parsedCapacity)) {
      push({
        title: "Error",
        description: "Capacity must be a valid number",
        tone: "danger",
      });
      return;
    }

    if (parsedCapacity !== null && (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0)) {
      push({
        title: "Error",
        description: "Capacity must be a positive whole number",
        tone: "danger",
      });
      return;
    }

    const formData = new FormData();
    formData.set("label", trimmedLabel);
    formData.set("description", trimmedDescription);
    formData.set("capacity", capacity.trim());

    if (editingTable) {
      formData.set("id", editingTable.id);
    }

    startTransition(async () => {
      const result = editingTable ? await updateTable(formData) : await createTable(formData);

      if (result.success) {
        const updatedTable: VenueTable = {
          id: editingTable?.id ?? crypto.randomUUID(),
          venue_id: venueId,
          label: trimmedLabel,
          description: trimmedDescription || null,
          capacity: parsedCapacity,
          is_active: true,
          created_at: editingTable?.created_at ?? new Date().toISOString(),
        };

        setTables((prev) => {
          if (editingTable) {
            return prev
              .map((table) => (table.id === editingTable.id ? { ...table, ...updatedTable } : table))
              .sort((a, b) => a.label.localeCompare(b.label));
          }

          return [...prev, updatedTable].sort((a, b) => a.label.localeCompare(b.label));
        });

        push({
          title: editingTable ? "Table updated" : "Table added",
          description: editingTable
            ? `"${trimmedLabel}" has been updated`
            : `"${trimmedLabel}" is ready for use`,
          tone: editingTable ? "neutral" : "success",
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
            <Button variant="secondary" onClick={openCreateDialog}>
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
                  <div className="space-y-1">
                    <p className="font-semibold text-ink-primary">{table.label}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
                      <span>{table.capacity ? `${table.capacity} seats` : "Capacity not set"}</span>
                      <span className="text-ink-subtle">•</span>
                      <span>Created {new Date(table.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-ink-secondary">
                      {table.description ? table.description : "No description provided"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQrTable(table)}
                      disabled={isPending}
                      className="text-ink-secondary hover:text-ink-primary"
                      aria-label={`View QR code for ${table.label}`}
                      title="View QR"
                    >
                      <QrCode className="h-4 w-4" />
                      QR
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTable(table);
                        setTableLabel(table.label);
                        setCapacity(table.capacity?.toString() ?? "");
                        setDescription(table.description ?? "");
                        setIsDialogOpen(true);
                      }}
                      disabled={isPending}
                      className="text-ink-secondary hover:text-ink-primary"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
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
                <CardTitle className="text-xl">
                  {editingTable ? "Edit Table" : "Add Table"}
                </CardTitle>
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
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-rulebook text-ink-secondary">
                    Table label
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Table 1, Booth A"
                    value={tableLabel}
                    onChange={(e) => setTableLabel(e.target.value)}
                    disabled={isPending}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-rulebook text-ink-secondary">
                    Capacity
                  </label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g., 4"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-rulebook text-ink-secondary">
                    Description
                  </label>
                  <Input
                    type="text"
                    placeholder="Optional notes about the table"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isPending}
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
                  <Button type="submit" disabled={isPending || !tableLabel.trim()}>
                    {editingTable ? "Save changes" : "Save table"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrTable !== null}
        onClose={() => setQrTable(null)}
        tableId={qrTable?.id ?? ""}
        tableLabel={qrTable?.label ?? ""}
        venueName={venueName}
        venueSlug={venueSlug}
      />
    </>
  );
}
