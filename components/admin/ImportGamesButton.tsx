'use client';

import { useRef, useTransition } from 'react';
import Papa from 'papaparse';
import { importGames } from '@/app/admin/library/actions';

export function ImportGamesButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        startTransition(async () => {
          await importGames(results.data as any[]);
          alert('Games imported successfully');
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
    <div>
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
        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
        </svg>
        Import CSV
      </button>
    </div>
  );
}
