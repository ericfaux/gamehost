"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, MapPin, Pencil, Plus, QrCode, Search, Trash2, X } from "@/components/icons/lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast, TokenChip } from "@/components/AppShell";
import { createTable, deleteTable, updateTable } from "@/app/admin/settings/actions";
import { QRCodeModal } from "@/components/admin/QRCodeModal";
import type { VenueTable, VenueTableWithLayout, VenueZone } from "@/lib/db/types";

type SortField = 'label' | 'zone' | 'capacity';
type SortDirection = 'asc' | 'desc';

interface TablesManagerProps {
  initialTables: VenueTable[];
  venueId: string;
  venueName: string;
  venueSlug: string;
  /** Optional: Tables with layout info for zone/position display */
  tablesWithLayout?: VenueTableWithLayout[];
  /** Optional: Zones for looking up zone names */
  zones?: VenueZone[];
  /** Optional: Currently selected table ID (synced with map view) */
  selectedTableId?: string | null;
  /** Optional: Callback when a table is selected */
  onSelectTable?: (tableId: string | null) => void;
  /** Optional: Callback to open zone manager */
  onManageZones?: () => void;
}

export function TablesManager({
  initialTables,
  venueId,
  venueName,
  venueSlug,
  tablesWithLayout,
  zones = [],
  selectedTableId,
  onSelectTable,
  onManageZones,
}: TablesManagerProps) {
  const { push } = useToast();
  const [tables, setTables] = useState<VenueTable[]>(initialTables);
  const [sortField, setSortField] = useState<SortField>('label');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Create a map for quick zone name lookup
  const zoneMap = useMemo(() => {
    return new Map(zones.map(z => [z.id, z.name]));
  }, [zones]);

  // Create a map for quick layout lookup
  const layoutMap = useMemo(() => {
    if (!tablesWithLayout) return new Map<string, VenueTableWithLayout>();
    return new Map(tablesWithLayout.map(t => [t.id, t]));
  }, [tablesWithLayout]);

  // Get layout info for a table
  const getLayoutInfo = (tableId: string) => {
    return layoutMap.get(tableId);
  };

  // Get zone name for a table
  const getZoneName = (tableId: string): string | null => {
    const layout = getLayoutInfo(tableId);
    if (!layout?.zone_id) return null;
    return zoneMap.get(layout.zone_id) ?? null;
  };

  // Filter tables based on search query
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables;
    const q = searchQuery.toLowerCase();
    return tables.filter(table =>
      table.label.toLowerCase().includes(q) ||
      getZoneName(table.id)?.toLowerCase().includes(q) ||
      table.id.includes(q)
    );
  }, [tables, searchQuery]);

  // Sort tables based on current sort settings
  const sortedTables = useMemo(() => {
    return [...filteredTables].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'label':
          comparison = a.label.localeCompare(b.label);
          break;
        case 'zone': {
          const zoneA = getZoneName(a.id) ?? '';
          const zoneB = getZoneName(b.id) ?? '';
          comparison = zoneA.localeCompare(zoneB);
          break;
        }
        case 'capacity':
          comparison = (a.capacity ?? 0) - (b.capacity ?? 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredTables, sortField, sortDirection]);

  // Group tables by zone
  const tablesByZone = useMemo(() => {
    return sortedTables.reduce<Record<string, VenueTable[]>>((acc, table) => {
      const zone = getZoneName(table.id) || 'Unassigned';
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(table);
      return acc;
    }, {});
  }, [sortedTables]);

  // Track expanded zones (all expanded by default)
  const [expandedZones, setExpandedZones] = useState<string[]>([]);

  // Initialize expanded zones when tablesByZone changes
  useEffect(() => {
    setExpandedZones(Object.keys(tablesByZone));
  }, [tablesByZone]);

  // Scroll selected table into view when selection changes
  useEffect(() => {
    if (selectedTableId) {
      // Small delay to ensure the DOM is updated
      const timer = setTimeout(() => {
        document.getElementById(`table-row-${selectedTableId}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedTableId]);

  // Toggle zone expansion
  const toggleZone = (zone: string) => {
    setExpandedZones(prev =>
      prev.includes(zone)
        ? prev.filter(z => z !== zone)
        : [...prev, zone]
    );
  };

  // Toggle sort for a column
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Render sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />;
  };
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
      {/* Inventory Ledger Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {/* Top toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Component Manifest
            </h2>
            <TokenChip tone="muted">{tables.length} registered</TokenChip>
          </div>
          <div className="flex items-center gap-2">
            {onManageZones && (
              <Button variant="secondary" size="sm" onClick={onManageZones}>
                Manage zones
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Add table
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="
              absolute left-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-slate-400
            " />
            <input
              type="text"
              placeholder="Search tables by name, zone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full pl-10 pr-4 py-2
                bg-slate-50 dark:bg-slate-800
                border border-slate-200 dark:border-slate-700
                rounded-lg
                text-sm
                placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500
              "
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Results count */}
          {searchQuery && (
            <p className="mt-2 text-xs text-slate-500">
              {filteredTables.length} of {tables.length} tables
            </p>
          )}
        </div>

        {tables.length === 0 ? (
          /* Empty state for list context */
          <div className="px-6 py-12">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm mx-auto">
              <div className="h-14 w-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg
                  className="h-7 w-7 text-slate-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No components registered
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add your first table to start building your venue inventory.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4" />
                Register first table
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header row with sortable columns */}
            <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <div className="w-14">ID</div>
              <button
                type="button"
                onClick={() => handleSort('label')}
                className="flex-1 flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors text-left"
              >
                Name
                <SortIndicator field="label" />
              </button>
              <button
                type="button"
                onClick={() => handleSort('zone')}
                className="w-24 flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Zone
                <SortIndicator field="zone" />
              </button>
              <div className="w-28 font-mono">Position</div>
              <button
                type="button"
                onClick={() => handleSort('capacity')}
                className="w-16 flex items-center justify-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Seats
                <SortIndicator field="capacity" />
              </button>
              <div className="w-24">Actions</div>
            </div>

            {/* Zone-grouped table rows */}
            <div>
              {Object.entries(tablesByZone).map(([zone, zoneTables]) => (
                <div key={zone} className="mb-4 last:mb-0">
                  {/* Zone Header */}
                  <button
                    type="button"
                    onClick={() => toggleZone(zone)}
                    className="
                      w-full flex items-center justify-between
                      px-4 py-2
                      bg-slate-100 dark:bg-slate-800
                      text-sm font-semibold text-slate-700 dark:text-slate-200
                      hover:bg-slate-200 dark:hover:bg-slate-700
                      transition-colors
                    "
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {zone}
                      <span className="text-slate-400 font-normal">
                        ({zoneTables.length} {zoneTables.length === 1 ? 'table' : 'tables'})
                      </span>
                    </span>
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform",
                      expandedZones.includes(zone) ? "rotate-180" : ""
                    )} />
                  </button>

                  {/* Zone Tables */}
                  {expandedZones.includes(zone) && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {zoneTables.map((table) => {
                        const layout = getLayoutInfo(table.id);
                        const zoneName = getZoneName(table.id);
                        const hasPosition = layout?.layout_x != null && layout?.layout_y != null;

                        return (
                          <div
                            key={table.id}
                            id={`table-row-${table.id}`}
                            className={cn(
                              "flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors group",
                              table.id === selectedTableId
                                ? "bg-orange-50 dark:bg-orange-900/20 border-l-2 border-orange-500"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                            )}
                            onClick={() => onSelectTable?.(table.id)}
                          >
                            {/* ID - monospace */}
                            <div className="w-14 font-mono text-xs text-slate-400 dark:text-slate-500">
                              #{table.id.slice(-4)}
                            </div>

                            {/* Name with status dot */}
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  table.is_active
                                    ? 'bg-green-500'
                                    : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                              />
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                {table.label}
                              </span>
                            </div>

                            {/* Zone badge */}
                            <div className="w-24">
                              <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded truncate max-w-full">
                                {zoneName ?? 'Unassigned'}
                              </span>
                            </div>

                            {/* Coordinates - monospace */}
                            <div className="w-28 font-mono text-xs text-slate-400 dark:text-slate-500">
                              {hasPosition
                                ? `(${Math.round((layout.layout_x ?? 0) * 100)}, ${Math.round((layout.layout_y ?? 0) * 100)})`
                                : '—'}
                            </div>

                            {/* Capacity badge - board game style */}
                            <div className="w-16 flex justify-center">
                              {table.capacity ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-bold rounded-full border-2 border-orange-200 dark:border-orange-800">
                                  {table.capacity}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                              )}
                            </div>

                            {/* Actions - visible on hover */}
                            <div className="w-24 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setQrTable(table)}
                                disabled={isPending}
                                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                                aria-label={`View QR code for ${table.label}`}
                                title="View QR"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTable(table);
                                  setTableLabel(table.label);
                                  setCapacity(table.capacity?.toString() ?? "");
                                  setDescription(table.description ?? "");
                                  setIsDialogOpen(true);
                                }}
                                disabled={isPending}
                                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                                aria-label={`Edit ${table.label}`}
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTable(table)}
                                disabled={isPending || deletingId === table.id}
                                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                                aria-label={`Archive ${table.label}`}
                                title="Archive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
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
