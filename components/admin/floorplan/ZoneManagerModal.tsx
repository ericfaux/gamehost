'use client';

/**
 * ZoneManagerModal - Modal for managing venue zones.
 * Create, rename, reorder, delete zones, set background images, and toggle active status.
 */

import { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ImageIcon,
  Upload,
  Loader2,
  Power,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { VenueZone, VenueTableWithLayout } from '@/lib/db/types';

interface ZoneManagerModalProps {
  isOpen: boolean;
  zones: VenueZone[];
  tables: VenueTableWithLayout[];
  venueId: string;
  onClose: () => void;
  onCreateZone: (name: string) => Promise<void>;
  onUpdateZone: (zoneId: string, updates: { name?: string; sort_order?: number; background_image_url?: string | null }) => void;
  onDeleteZone: (zoneId: string) => Promise<void>;
  onUploadBackground: (zoneId: string, file: File) => Promise<void>;
  onToggleActive?: (zoneId: string, isActive: boolean, force?: boolean) => Promise<{ needsConfirmation?: boolean; futureBookingCount?: number; error?: string }>;
}

export function ZoneManagerModal({
  isOpen,
  zones,
  tables,
  onClose,
  onCreateZone,
  onUpdateZone,
  onDeleteZone,
  onUploadBackground,
  onToggleActive,
}: ZoneManagerModalProps) {
  const [newZoneName, setNewZoneName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingZoneId, setDeletingZoneId] = useState<string | null>(null);
  const [uploadingZoneId, setUploadingZoneId] = useState<string | null>(null);
  const [bgUrlInput, setBgUrlInput] = useState<{ zoneId: string; url: string } | null>(null);
  const [togglingZoneId, setTogglingZoneId] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<{ zoneId: string; bookingCount: number } | null>(null);

  if (!isOpen) return null;

  const handleToggleActive = async (zone: VenueZone, force = false) => {
    if (!onToggleActive || togglingZoneId) return;

    setTogglingZoneId(zone.id);
    try {
      const result = await onToggleActive(zone.id, !zone.is_active, force);

      if (result.needsConfirmation && !force) {
        setConfirmDeactivate({
          zoneId: zone.id,
          bookingCount: result.futureBookingCount ?? 0,
        });
      } else {
        setConfirmDeactivate(null);
      }
    } finally {
      setTogglingZoneId(null);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!onToggleActive || !confirmDeactivate) return;

    setTogglingZoneId(confirmDeactivate.zoneId);
    try {
      await onToggleActive(confirmDeactivate.zoneId, false, true);
      setConfirmDeactivate(null);
    } finally {
      setTogglingZoneId(null);
    }
  };

  const handleCreateZone = async () => {
    if (!newZoneName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await onCreateZone(newZoneName.trim());
      setNewZoneName('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    const tablesInZone = tables.filter((t) => t.zone_id === zoneId);
    if (tablesInZone.length > 0) {
      if (!confirm(`This zone has ${tablesInZone.length} table(s). They will be unassigned. Continue?`)) {
        return;
      }
    }
    setDeletingZoneId(zoneId);
    try {
      await onDeleteZone(zoneId);
    } finally {
      setDeletingZoneId(null);
    }
  };

  const handleMoveZone = (zoneId: string, direction: 'up' | 'down') => {
    const sortedZones = [...zones].sort((a, b) => a.sort_order - b.sort_order);
    const index = sortedZones.findIndex((z) => z.id === zoneId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortedZones.length) return;

    // Swap sort orders
    const currentZone = sortedZones[index];
    const swapZone = sortedZones[newIndex];
    onUpdateZone(currentZone.id, { sort_order: swapZone.sort_order });
    onUpdateZone(swapZone.id, { sort_order: currentZone.sort_order });
  };

  const handleFileUpload = async (zoneId: string, file: File) => {
    setUploadingZoneId(zoneId);
    try {
      await onUploadBackground(zoneId, file);
    } finally {
      setUploadingZoneId(null);
    }
  };

  const handleBgUrlSubmit = (zoneId: string, url: string) => {
    onUpdateZone(zoneId, { background_image_url: url || null });
    setBgUrlInput(null);
  };

  const sortedZones = [...zones].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-[color:var(--color-structure)] bg-[color:var(--color-surface)] shadow-token"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-structure)] p-4">
          <h2 className="text-lg font-semibold text-[color:var(--color-ink-primary)]">
            Manage Zones
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[color:var(--color-muted)] transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[color:var(--color-ink-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedZones.map((zone, index) => {
            const tablesInZone = tables.filter((t) => t.zone_id === zone.id);
            const isDeleting = deletingZoneId === zone.id;
            const isUploading = uploadingZoneId === zone.id;
            const isEditingUrl = bgUrlInput?.zoneId === zone.id;

            return (
              <div
                key={zone.id}
                className="panel-surface p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  {/* Reorder buttons */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => handleMoveZone(zone.id, 'up')}
                      disabled={index === 0}
                      className="p-0.5 rounded hover:bg-[color:var(--color-muted)] disabled:opacity-30"
                      title="Move up"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveZone(zone.id, 'down')}
                      disabled={index === sortedZones.length - 1}
                      className="p-0.5 rounded hover:bg-[color:var(--color-muted)] disabled:opacity-30"
                      title="Move down"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Zone name input */}
                  <Input
                    value={zone.name}
                    onChange={(e) => onUpdateZone(zone.id, { name: e.target.value })}
                    className="flex-1"
                    placeholder="Zone name"
                  />

                  {/* Table count */}
                  <span className="text-xs text-[color:var(--color-ink-secondary)] whitespace-nowrap">
                    {tablesInZone.length} table{tablesInZone.length !== 1 ? 's' : ''}
                  </span>

                  {/* Active toggle */}
                  {onToggleActive && (
                    <button
                      type="button"
                      onClick={() => handleToggleActive(zone)}
                      disabled={togglingZoneId === zone.id}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                        zone.is_active
                          ? 'text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={zone.is_active ? 'Deactivate zone' : 'Activate zone'}
                    >
                      {togglingZoneId === zone.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteZone(zone.id)}
                    disabled={isDeleting}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Delete zone"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Deactivation confirmation */}
                {confirmDeactivate?.zoneId === zone.id && (
                  <div className="p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-xs">
                    <p className="text-rose-800 dark:text-rose-200 mb-2">
                      Tables in this zone have {confirmDeactivate.bookingCount} upcoming booking{confirmDeactivate.bookingCount === 1 ? '' : 's'}.
                      Deactivating will not cancel them.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeactivate(null)}
                        className="flex-1 px-2 py-1 text-xs font-medium rounded border border-[color:var(--color-structure)] hover:bg-[color:var(--color-muted)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDeactivate}
                        disabled={togglingZoneId === zone.id}
                        className="flex-1 px-2 py-1 text-xs font-medium rounded bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50"
                      >
                        {togglingZoneId === zone.id ? 'Deactivating...' : 'Deactivate'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inactive badge */}
                {!zone.is_active && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>Inactive - tables hidden from booking</span>
                  </div>
                )}

                {/* Background image section */}
                <div className="flex items-center gap-2 text-xs">
                  <ImageIcon className="h-3 w-3 text-[color:var(--color-ink-secondary)]" />
                  {zone.background_image_url ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="truncate text-[color:var(--color-ink-secondary)]">
                        {zone.background_image_url}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateZone(zone.id, { background_image_url: null })}
                        className="text-red-500 hover:underline whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>
                  ) : isEditingUrl ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        value={bgUrlInput?.url ?? ''}
                        onChange={(e) => setBgUrlInput({ zoneId: zone.id, url: e.target.value })}
                        placeholder="Paste image URL..."
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBgUrlSubmit(zone.id, bgUrlInput?.url ?? '')}
                        className="h-7 px-2"
                      >
                        Set
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBgUrlInput(null)}
                        className="h-7 px-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBgUrlInput({ zoneId: zone.id, url: '' })}
                        className="text-[color:var(--color-accent)] hover:underline"
                      >
                        Paste URL
                      </button>
                      <span className="text-[color:var(--color-ink-secondary)]">or</span>
                      <label className="text-[color:var(--color-accent)] hover:underline cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(zone.id, file);
                          }}
                          disabled={isUploading}
                        />
                        {isUploading ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Uploading...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Upload className="h-3 w-3" />
                            Upload
                          </span>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {zones.length === 0 && (
            <p className="text-center text-sm text-[color:var(--color-ink-secondary)] py-4">
              No zones yet. Create one to get started.
            </p>
          )}
        </div>

        {/* Footer - Add zone */}
        <div className="border-t border-[color:var(--color-structure)] p-4">
          <div className="flex items-center gap-2">
            <Input
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              placeholder="New zone name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateZone();
              }}
            />
            <Button
              onClick={handleCreateZone}
              disabled={!newZoneName.trim() || isCreating}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Zone
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
