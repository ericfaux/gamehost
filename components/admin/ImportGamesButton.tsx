'use client';

import type React from 'react';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { FileUp, Download, Loader2, Sparkles } from '@/components/icons/lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { importGames } from '@/app/admin/library/actions';

export function ImportGamesButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [showBggDialog, setShowBggDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [gameCount, setGameCount] = useState(0);
  const router = useRouter();

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  function handleDownloadTemplate() {
    // Define the headers with all available fields
    // Fields marked with (BGG) can be auto-populated from BoardGameGeek
    const headers = [
      'Title',           // Required - game name
      'MinPlayers',      // (BGG) Minimum player count
      'MaxPlayers',      // (BGG) Maximum player count
      'MinTime',         // (BGG) Minimum playtime in minutes
      'MaxTime',         // (BGG) Maximum playtime in minutes
      'Complexity',      // (BGG) simple, medium, or complex
      'CopiesInRotation', // Number of copies owned
      'Description',     // (BGG) Short pitch/description
      'ShelfLocation',   // Physical shelf location (e.g., "A1", "Shelf 3")
      'BggRank',         // (BGG) BoardGameGeek ranking
      'BggRating',       // (BGG) BGG average rating (0-10)
      'ImageUrl',        // (BGG) Cover image URL
      'Status',          // in_rotation, out_for_repair, retired, for_sale
      'Condition',       // new, good, worn, problematic
      'Vibes',           // (BGG) Comma-separated or JSON array of categories
      'SetupSteps',      // Quick setup instructions
      'RulesBullets',    // Key rules for guests
      'BggId',           // (BGG) BoardGameGeek ID for exact matching
      'IsStaffPick',     // true or false
      'InstructionalVideoUrl', // (BGG) YouTube tutorial URL
    ];

    // Sample rows demonstrating different scenarios
    const sampleRows = [
      // Example 1: Full entry with all fields - BGG won't need to fill anything
      [
        'Catan',         // Title
        '3',             // MinPlayers
        '4',             // MaxPlayers
        '60',            // MinTime
        '120',           // MaxTime
        'medium',        // Complexity
        '2',             // CopiesInRotation
        'Trade and build settlements on the island of Catan',  // Description
        'Shelf A1',      // ShelfLocation
        '500',           // BggRank
        '7.1',           // BggRating
        '',              // ImageUrl (leave blank, BGG will fill)
        'in_rotation',   // Status
        'good',          // Condition
        'strategy,negotiation', // Vibes
        '',              // SetupSteps
        '',              // RulesBullets
        '13',            // BggId
        'true',          // IsStaffPick
        '',              // InstructionalVideoUrl
      ],
      // Example 2: Minimal entry - BGG will auto-populate most fields
      [
        'Ticket to Ride', // Title (required)
        '',              // MinPlayers (BGG fills)
        '',              // MaxPlayers (BGG fills)
        '',              // MinTime (BGG fills)
        '',              // MaxTime (BGG fills)
        '',              // Complexity (BGG fills)
        '1',             // CopiesInRotation
        '',              // Description (BGG fills)
        'Shelf B2',      // ShelfLocation
        '',              // BggRank (BGG fills)
        '',              // BggRating (BGG fills)
        '',              // ImageUrl (BGG fills)
        '',              // Status (defaults to in_rotation)
        '',              // Condition (defaults to good)
        '',              // Vibes (BGG fills)
        '',              // SetupSteps
        '',              // RulesBullets
        '',              // BggId (BGG finds)
        '',              // IsStaffPick (defaults to false)
        '',              // InstructionalVideoUrl (BGG fills)
      ],
      // Example 3: Another minimal entry
      [
        'Wingspan',      // Title
        '',              // All other fields blank - BGG will fill
        '',
        '',
        '',
        '',
        '1',
        '',
        'Shelf C3',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
    ];

    // Build CSV content
    const csvContent = [headers, ...sampleRows]
      .map((row) =>
        row.map((cell) => {
          // Quote cells that contain commas or quotes
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      )
      .join('\n');

    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'game_import_template.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Parse the file first to get the count, then show the dialog
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPendingFile(file);
        setGameCount(results.data.length);
        setShowBggDialog(true);
      },
      error: (error) => {
        alert(`Failed to parse CSV: ${error.message}`);
      },
    });

    event.target.value = '';
  }

  function processImport(autofillFromBgg: boolean) {
    if (!pendingFile) return;

    Papa.parse(pendingFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        startTransition(async () => {
          const result = await importGames(
            results.data as unknown as Record<string, unknown>[],
            { autofillFromBgg }
          );

          setShowBggDialog(false);
          setPendingFile(null);

          if (result.errors && result.errors.length > 0) {
            const errorSummary = result.errors.slice(0, 3).join('\n');
            const moreErrors = result.errors.length > 3 ? `\n...and ${result.errors.length - 3} more errors` : '';
            alert(`Import completed with some issues:\n\nImported: ${result.imported} games\nUpdated: ${result.updated} games\nErrors: ${result.errors.length}\n\n${errorSummary}${moreErrors}`);
          } else {
            alert(`Successfully imported ${result.imported} new games and updated ${result.updated} existing games!`);
          }

          router.refresh();
        });
      },
      error: (error) => {
        alert(`Failed to parse CSV: ${error.message}`);
        setShowBggDialog(false);
        setPendingFile(null);
      },
    });
  }

  function handleDialogClose() {
    if (!isPending) {
      setShowBggDialog(false);
      setPendingFile(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
        <Download className="h-4 w-4" />
        Download Template
      </Button>

      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <Button variant="secondary" onClick={handleButtonClick} disabled={isPending}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileUp className="h-4 w-4" />
        )}
        Import CSV
      </Button>

      {/* BGG Auto-fill Confirmation Dialog */}
      <Dialog open={showBggDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={handleDialogClose} disabled={isPending} />
          <DialogHeader>
            <DialogTitle>Import {gameCount} Games</DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-[color:var(--color-ink-secondary)]">
              Would you like to automatically fill in missing game details using BoardGameGeek?
            </p>

            <div className="bg-[color:var(--color-muted)] rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-[color:var(--color-ink-primary)]">
                    BGG Auto-fill can populate:
                  </p>
                  <ul className="mt-1 text-[color:var(--color-ink-secondary)] space-y-0.5">
                    <li>Cover images</li>
                    <li>Player counts & playtime</li>
                    <li>Descriptions & categories</li>
                    <li>BGG ratings & rankings</li>
                    <li>Tutorial videos</li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="text-xs text-[color:var(--color-ink-tertiary)]">
              Note: Any data you provided in the CSV will be kept. BGG only fills in missing fields.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => processImport(false)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Skip BGG
            </Button>
            <Button
              variant="primary"
              onClick={() => processImport(true)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Auto-fill from BGG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
