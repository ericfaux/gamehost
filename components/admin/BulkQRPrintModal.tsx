"use client";

import { useState, useMemo, useCallback } from "react";
import { Printer, X, Check, MapPin } from "@/components/icons/lucide-react";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VenueTableWithLayout, VenueZone } from "@/lib/db/types";

interface BulkQRPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: VenueTableWithLayout[];
  zones: VenueZone[];
  venueName: string;
  venueSlug: string;
}

export function BulkQRPrintModal({
  isOpen,
  onClose,
  tables,
  zones,
  venueName,
  venueSlug,
}: BulkQRPrintModalProps) {
  // Filter to only active tables by default
  const activeTables = useMemo(() => {
    return tables.filter((t) => t.is_active);
  }, [tables]);

  // Start with all active tables selected
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(
    () => new Set(activeTables.map((t) => t.id))
  );

  // Reset selection when modal opens
  useMemo(() => {
    if (isOpen) {
      setSelectedTableIds(new Set(activeTables.map((t) => t.id)));
    }
  }, [isOpen, activeTables]);

  // Create zone map for lookup
  const zoneMap = useMemo(() => {
    return new Map(zones.map((z) => [z.id, z.name]));
  }, [zones]);

  // Group tables by zone
  const tablesByZone = useMemo(() => {
    const grouped: Record<string, VenueTableWithLayout[]> = {};

    for (const table of activeTables) {
      const zoneName = table.zone_id ? zoneMap.get(table.zone_id) ?? "Unassigned" : "Unassigned";
      if (!grouped[zoneName]) {
        grouped[zoneName] = [];
      }
      grouped[zoneName].push(table);
    }

    // Sort tables within each zone by label
    for (const zone of Object.keys(grouped)) {
      grouped[zone].sort((a, b) => a.label.localeCompare(b.label));
    }

    return grouped;
  }, [activeTables, zoneMap]);

  // Zone names sorted alphabetically (Unassigned at end)
  const sortedZoneNames = useMemo(() => {
    const zoneNames = Object.keys(tablesByZone);
    return zoneNames.sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
  }, [tablesByZone]);

  // Toggle individual table
  const toggleTable = useCallback((tableId: string) => {
    setSelectedTableIds((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  }, []);

  // Toggle all tables in a zone
  const toggleZone = useCallback((zoneName: string) => {
    const zoneTables = tablesByZone[zoneName] ?? [];
    const zoneTableIds = zoneTables.map((t) => t.id);
    const allSelected = zoneTableIds.every((id) => selectedTableIds.has(id));

    setSelectedTableIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        // Deselect all in zone
        for (const id of zoneTableIds) {
          next.delete(id);
        }
      } else {
        // Select all in zone
        for (const id of zoneTableIds) {
          next.add(id);
        }
      }
      return next;
    });
  }, [tablesByZone, selectedTableIds]);

  // Select/deselect all
  const toggleAll = useCallback(() => {
    const allSelected = activeTables.every((t) => selectedTableIds.has(t.id));
    if (allSelected) {
      setSelectedTableIds(new Set());
    } else {
      setSelectedTableIds(new Set(activeTables.map((t) => t.id)));
    }
  }, [activeTables, selectedTableIds]);

  // Check if all tables are selected
  const allSelected = activeTables.every((t) => selectedTableIds.has(t.id));
  const someSelected = selectedTableIds.size > 0;

  // Get selected tables in order
  const selectedTables = useMemo(() => {
    return activeTables
      .filter((t) => selectedTableIds.has(t.id))
      .sort((a, b) => {
        // Sort by zone first, then by label
        const zoneA = a.zone_id ? zoneMap.get(a.zone_id) ?? "Unassigned" : "Unassigned";
        const zoneB = b.zone_id ? zoneMap.get(b.zone_id) ?? "Unassigned" : "Unassigned";
        if (zoneA !== zoneB) {
          if (zoneA === "Unassigned") return 1;
          if (zoneB === "Unassigned") return -1;
          return zoneA.localeCompare(zoneB);
        }
        return a.label.localeCompare(b.label);
      });
  }, [activeTables, selectedTableIds, zoneMap]);

  // Handle print
  const handlePrint = useCallback(() => {
    if (selectedTables.length === 0) return;

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      alert("Please allow popups for this site to print QR codes.");
      return;
    }

    // Generate QR code page HTML for each table
    const qrPages = selectedTables.map((table) => {
      return `
        <div class="qr-page">
          <div class="qr-container">
            <div class="venue-name">${venueName}</div>
            <div class="table-label">${table.label}</div>
            <div class="qr-code" id="qr-${table.id}"></div>
            <div class="scan-instruction">Scan to start your session</div>
          </div>
        </div>
      `;
    }).join("");

    // Script to generate QR codes using react-qr-code's SVG output pattern
    const qrScript = selectedTables.map((table) => {
      const tableUrl = `${window.location.origin}/v/${venueSlug}/t/${table.id}`;
      // We'll use a simple QR code library or generate inline
      return `
        generateQR("qr-${table.id}", "${tableUrl}");
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Codes - ${venueName}</title>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            @page {
              size: A4;
              margin: 0;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            .qr-page {
              width: 100%;
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              page-break-after: always;
              page-break-inside: avoid;
            }

            .qr-page:last-child {
              page-break-after: auto;
            }

            .qr-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1.5rem;
              text-align: center;
              padding: 2rem;
            }

            .qr-code {
              width: 400px;
              height: 400px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .qr-code canvas {
              width: 100% !important;
              height: 100% !important;
            }

            .venue-name {
              font-size: 1rem;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              font-weight: 500;
            }

            .table-label {
              font-size: 3rem;
              font-weight: 700;
              color: #1a1a1a;
            }

            .scan-instruction {
              font-size: 1.25rem;
              color: #666;
              margin-top: 0.5rem;
            }

            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }

              .qr-page {
                height: 100vh;
              }
            }
          </style>
        </head>
        <body>
          ${qrPages}
          <script>
            function generateQR(elementId, url) {
              const container = document.getElementById(elementId);
              if (container && typeof QRCode !== 'undefined') {
                QRCode.toCanvas(url, {
                  width: 400,
                  margin: 0,
                  color: {
                    dark: '#1a1a1a',
                    light: '#ffffff'
                  },
                  errorCorrectionLevel: 'H'
                }, function(err, canvas) {
                  if (!err && canvas) {
                    container.appendChild(canvas);
                  }
                });
              }
            }

            window.onload = function() {
              ${qrScript}
              // Wait for QR codes to render, then print
              setTimeout(function() {
                window.print();
              }, 500);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [selectedTables, venueName, venueSlug]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-structure bg-surface shadow-token">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-structure p-6 flex-shrink-0">
          <div>
            <CardTitle className="text-xl">Print QR Codes</CardTitle>
            <p className="text-sm text-ink-secondary">
              Select tables to print. Each QR code prints on a full page.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-ink-secondary"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Selection controls */}
        <div className="border-b border-structure px-6 py-3 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-medium text-ink-primary hover:text-accent transition-colors"
          >
            <div
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                allSelected
                  ? "bg-accent border-accent text-white"
                  : someSelected
                    ? "border-accent bg-accent/20"
                    : "border-structure"
              )}
            >
              {(allSelected || someSelected) && <Check className="h-3 w-3" />}
            </div>
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          <span className="text-sm text-ink-secondary">
            {selectedTableIds.size} of {activeTables.length} tables selected
          </span>
        </div>

        {/* Table list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTables.length === 0 ? (
            <div className="text-center py-8 text-ink-secondary">
              <p>No active tables to print.</p>
              <p className="text-sm mt-1">Activate tables in the Table List to print their QR codes.</p>
            </div>
          ) : (
            sortedZoneNames.map((zoneName) => {
              const zoneTables = tablesByZone[zoneName] ?? [];
              const zoneTableIds = zoneTables.map((t) => t.id);
              const allZoneSelected = zoneTableIds.every((id) => selectedTableIds.has(id));
              const someZoneSelected = zoneTableIds.some((id) => selectedTableIds.has(id));

              return (
                <div key={zoneName} className="border border-structure rounded-lg overflow-hidden">
                  {/* Zone header */}
                  <button
                    type="button"
                    onClick={() => toggleZone(zoneName)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
                        allZoneSelected
                          ? "bg-accent border-accent text-white"
                          : someZoneSelected
                            ? "border-accent bg-accent/20"
                            : "border-structure"
                      )}
                    >
                      {(allZoneSelected || someZoneSelected) && <Check className="h-3 w-3" />}
                    </div>
                    <MapPin className="h-4 w-4 text-ink-secondary flex-shrink-0" />
                    <span className="font-medium text-ink-primary">{zoneName}</span>
                    <span className="text-sm text-ink-secondary ml-auto">
                      {zoneTableIds.filter((id) => selectedTableIds.has(id)).length}/{zoneTables.length}
                    </span>
                  </button>

                  {/* Tables in zone */}
                  <div className="divide-y divide-structure">
                    {zoneTables.map((table) => {
                      const isSelected = selectedTableIds.has(table.id);
                      return (
                        <button
                          key={table.id}
                          type="button"
                          onClick={() => toggleTable(table.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
                              isSelected
                                ? "bg-accent border-accent text-white"
                                : "border-structure"
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <span className="text-ink-primary">{table.label}</span>
                          {table.capacity && (
                            <span className="text-xs text-ink-secondary ml-auto">
                              {table.capacity} seats
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-structure p-6 flex-shrink-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={selectedTableIds.size === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print {selectedTableIds.size > 0 ? `${selectedTableIds.size} QR Code${selectedTableIds.size === 1 ? "" : "s"}` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
