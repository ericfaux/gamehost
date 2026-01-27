'use client';

import type React from 'react';
import { useRef, useState, useTransition, useCallback } from 'react';
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
import { importGames, enrichGamesBatch } from '@/app/admin/library/actions';

/** Number of games to enrich per server action call */
const ENRICHMENT_BATCH_SIZE = 5;
/** Delay between batches in ms (on top of per-game delay on the server) */
const BATCH_PAUSE_MS = 2000;
/** Delay after hitting a rate limit before retrying the batch */
const RATE_LIMIT_RETRY_MS = 30000;
/** Max retries per batch on rate limit */
const MAX_BATCH_RETRIES = 3;

interface EnrichmentProgress {
  total: number;
  completed: number;
  enriched: number;
  skipped: number;
  errors: string[];
}

export function ImportGamesButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [showBggDialog, setShowBggDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [gameCount, setGameCount] = useState(0);
  const [enrichmentProgress, setEnrichmentProgress] = useState<EnrichmentProgress | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
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

  const runBatchEnrichment = useCallback(async (gameIds: string[]) => {
    setIsEnriching(true);
    const progress: EnrichmentProgress = {
      total: gameIds.length,
      completed: 0,
      enriched: 0,
      skipped: 0,
      errors: [],
    };
    setEnrichmentProgress({ ...progress });

    // Split into batches
    const batches: string[][] = [];
    for (let i = 0; i < gameIds.length; i += ENRICHMENT_BATCH_SIZE) {
      batches.push(gameIds.slice(i, i + ENRICHMENT_BATCH_SIZE));
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      let retries = 0;
      let success = false;

      while (!success && retries <= MAX_BATCH_RETRIES) {
        try {
          const result = await enrichGamesBatch(batch);
          progress.enriched += result.enriched;
          progress.skipped += result.skipped;
          progress.completed += batch.length;
          progress.errors.push(...result.errors);

          if (result.rateLimitHit && retries < MAX_BATCH_RETRIES) {
            // Rate limit hit - wait longer and retry remaining items in this batch
            retries++;
            progress.completed -= result.skipped; // those weren't actually processed
            progress.skipped -= result.skipped;
            setEnrichmentProgress({ ...progress });
            await new Promise(r => setTimeout(r, RATE_LIMIT_RETRY_MS));
            continue;
          }

          success = true;
          setEnrichmentProgress({ ...progress });
        } catch {
          retries++;
          if (retries > MAX_BATCH_RETRIES) {
            progress.skipped += batch.length;
            progress.completed += batch.length;
            progress.errors.push(`Batch failed after ${MAX_BATCH_RETRIES} retries`);
            setEnrichmentProgress({ ...progress });
            success = true; // move on
          } else {
            await new Promise(r => setTimeout(r, RATE_LIMIT_RETRY_MS));
          }
        }
      }

      // Pause between batches
      if (batchIdx < batches.length - 1) {
        await new Promise(r => setTimeout(r, BATCH_PAUSE_MS));
      }
    }

    setIsEnriching(false);
    router.refresh();
    return progress;
  }, [router]);

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

          // Build result message
          const parts: string[] = [];
          parts.push(`Imported: ${result.imported} new games`);
          if (result.updated > 0) {
            parts.push(`Updated: ${result.updated} existing games`);
          }
          if (result.skipped > 0) {
            parts.push(`Skipped: ${result.skipped} games (missing required data)`);
          }

          if (result.errors && result.errors.length > 0) {
            const errorSummary = result.errors.slice(0, 5).join('\n');
            const moreErrors = result.errors.length > 5 ? `\n...and ${result.errors.length - 5} more issues` : '';
            alert(`Import completed with some issues:\n\n${parts.join('\n')}\n\nDetails:\n${errorSummary}${moreErrors}`);
          } else {
            alert(`Import completed successfully!\n\n${parts.join('\n')}`);
          }

          router.refresh();

          // Start batch enrichment if there are games to enrich
          const enrichIds = result.needsEnrichmentIds ?? [];
          if (enrichIds.length > 0) {
            const enrichProgress = await runBatchEnrichment(enrichIds);
            const enrichParts: string[] = [];
            enrichParts.push(`Enriched: ${enrichProgress.enriched} games with BGG data`);
            if (enrichProgress.skipped > 0) {
              enrichParts.push(`Skipped: ${enrichProgress.skipped} games`);
            }
            if (enrichProgress.errors.length > 0) {
              const errorSummary = enrichProgress.errors.slice(0, 5).join('\n');
              alert(`BGG enrichment completed with some issues:\n\n${enrichParts.join('\n')}\n\nDetails:\n${errorSummary}`);
            } else {
              alert(`BGG enrichment completed!\n\n${enrichParts.join('\n')}`);
            }
          }
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
    if (!isPending && !isEnriching) {
      setShowBggDialog(false);
      setPendingFile(null);
      setEnrichmentProgress(null);
    }
  }

  const enrichPercent = enrichmentProgress
    ? Math.round((enrichmentProgress.completed / enrichmentProgress.total) * 100)
    : 0;

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

      <Button variant="secondary" onClick={handleButtonClick} disabled={isPending || isEnriching}>
        {isPending || isEnriching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileUp className="h-4 w-4" />
        )}
        Import CSV
      </Button>

      {/* BGG Auto-fill Confirmation Dialog */}
      <Dialog open={showBggDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={handleDialogClose} disabled={isPending || isEnriching} />
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

            {gameCount > 50 && (
              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-800 rounded-lg p-3">
                <p className="text-sm text-orange-900 dark:text-orange-200 font-medium">
                  Large import detected ({gameCount} games)
                </p>
                <p className="text-xs text-orange-800 dark:text-orange-300 mt-1">
                  Games will be imported immediately, then BGG data will be fetched in the background.
                  This may take approximately{' '}
                  <strong>{Math.ceil(gameCount * 3 / 60)} minutes</strong>.
                  You can keep this page open while it runs.
                </p>
              </div>
            )}

            <p className="text-xs text-[color:var(--color-ink-tertiary)]">
              Note: Any data you provided in the CSV will be kept. BGG only fills in missing fields.
              Games are inserted first with placeholder data, then enriched from BGG in batches.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => processImport(false)}
              disabled={isPending || isEnriching}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Skip BGG
            </Button>
            <Button
              variant="primary"
              onClick={() => processImport(true)}
              disabled={isPending || isEnriching}
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

      {/* BGG Enrichment Progress Dialog */}
      <Dialog open={isEnriching && enrichmentProgress !== null} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fetching BGG Data</DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-[color:var(--color-ink-secondary)]">
              Enriching games with BoardGameGeek data in batches. Please keep this page open.
            </p>

            {enrichmentProgress && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--color-ink-secondary)]">Progress</span>
                    <span className="font-medium text-[color:var(--color-ink-primary)]">
                      {enrichmentProgress.completed} / {enrichmentProgress.total} games ({enrichPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${enrichPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-4 text-xs text-[color:var(--color-ink-secondary)]">
                  <span>Enriched: {enrichmentProgress.enriched}</span>
                  <span>Skipped: {enrichmentProgress.skipped}</span>
                  {enrichmentProgress.errors.length > 0 && (
                    <span>Errors: {enrichmentProgress.errors.length}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-[color:var(--color-ink-tertiary)]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processing batch {Math.min(Math.ceil(enrichmentProgress.completed / ENRICHMENT_BATCH_SIZE) + 1, Math.ceil(enrichmentProgress.total / ENRICHMENT_BATCH_SIZE))} of {Math.ceil(enrichmentProgress.total / ENRICHMENT_BATCH_SIZE)}...
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
