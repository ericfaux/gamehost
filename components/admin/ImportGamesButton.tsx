'use client';

import type React from 'react';
import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { FileUp, Download, Loader2 } from '@/components/icons/lucide-react';
import { Button } from '@/components/ui/button';
import { importGames } from '@/app/admin/library/actions';

export function ImportGamesButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  function handleDownloadTemplate() {
    // Define the headers and a sample row
    const csvContent = [
      ['Title', 'MinPlayers', 'MaxPlayers', 'MinTime', 'MaxTime', 'Complexity', 'copies_in_rotation'],
      ['Catan', '3', '4', '60', '120', 'Medium', '1'],
      ['Ticket to Ride', '2', '5', '30', '60', 'Simple', '2'],
    ]
      .map((e) => e.join(','))
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

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        startTransition(async () => {
          // Cast to unknown first to satisfy strict linting, then to expected shape
          await importGames(results.data as unknown as Record<string, unknown>[]);
          alert(`Successfully imported ${results.data.length} games!`);
          router.refresh();
        });
      },
      error: (error) => {
        alert(`Failed to parse CSV: ${error.message}`);
      },
    });

    event.target.value = '';
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
    </div>
  );
}
