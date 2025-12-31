"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VenueTableWithLayout, VenueZone } from "@/lib/db/types";

interface ZoneManagerModalProps {
  isOpen: boolean;
  zones: VenueZone[];
  tables: VenueTableWithLayout[];
  venueId: string;
  onClose: () => void;
  onCreateZone: (name: string) => Promise<void> | void;
  onUpdateZone: (zoneId: string, updates: { name?: string; sort_order?: number; background_image_url?: string | null }) => void;
  onDeleteZone: (zoneId: string) => Promise<void> | void;
  onUploadBackground: (zoneId: string, file: File) => Promise<void> | void;
}

export function ZoneManagerModal({
  isOpen,
  zones,
  onClose,
  onCreateZone,
  onUpdateZone,
  onDeleteZone,
}: ZoneManagerModalProps) {
  const [name, setName] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Manage zones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New zone name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              onClick={async () => {
                if (!name.trim()) return;
                await onCreateZone(name.trim());
                setName("");
              }}
            >
              Add
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="flex items-center justify-between rounded-lg border border-[color:var(--color-structure)] bg-white px-3 py-2"
              >
                <div>{zone.name}</div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onUpdateZone(zone.id, { name: `${zone.name}` })}
                  >
                    Rename
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDeleteZone(zone.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {zones.length === 0 && (
              <div className="text-[color:var(--color-ink-secondary)]">No zones yet.</div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
