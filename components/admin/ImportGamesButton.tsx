'use client';

import type React from 'react';
import { useRef, useTransition } from 'react';
import Papa from 'papaparse';
import { importGames } from '@/app/admin/library/actions';

export function ImportGamesButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  function handleDownloadTemplate() {
    // Define the headers and a sample row
    const csvContent = [
      ['Title', 'MinPlayers', 'MaxPlayers', 'MinTime', 'MaxTime', 'Complexity'],
      ['Catan', '3', '4', '60', '120', 'Medium'],
      ['Ticket to Ride', '2', '5', '30', '60', 'Simple'],
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
          window.location.reload();
        });
      },
      error: (error) => {
        alert(`Failed to parse CSV: ${error.message}`);
      },
    });

    event.target.value = '';
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="text-xs text-slate-500 hover:text-blue-600 underline underline-offset-2 transition-colors mr-2"
        >
          Download Template
        </button>

        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={handleButtonClick}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
            </svg>
          )}
          Import CSV
        </button>
      </div>
    </div>
  );
}
