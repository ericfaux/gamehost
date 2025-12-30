/**
 * Game Recommendation Wizard Route - /v/[venueSlug]/t/[tableId]/wizard
 *
 * Collects preferences from guests (player count, time, complexity, vibes)
 * and displays recommended games based on their selections.
 */

import { getVenueAndTableBySlugAndTableId } from '@/lib/data';
import Link from 'next/link';
import { WizardForm } from './WizardForm';
import { GuestHeader } from '@/components/table-app';

interface PageProps {
  params: Promise<{
    venueSlug: string;
    tableId: string;
  }>;
}

export default async function WizardPage({ params }: PageProps) {
  const { venueSlug, tableId } = await params;

  // Fetch venue and table
  const result = await getVenueAndTableBySlugAndTableId(venueSlug, tableId);

  // If venue or table not found, show error
  if (!result || !result.table.is_active) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 rulebook-grid">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-[#f5e8e8] border border-[color:var(--color-danger)]/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[color:var(--color-danger)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[color:var(--color-ink-primary)]">
            This table link is not valid
          </h1>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-[color:var(--color-ink-primary)] bg-[color:var(--color-muted)] hover:bg-[color:var(--color-structure)] border border-[color:var(--color-structure)] rounded-xl transition-colors focus-ring"
          >
            Go to Home
          </Link>
        </div>
      </main>
    );
  }

  const { venue, table } = result;

  return (
    <main className="min-h-screen rulebook-grid">
      {/* Header */}
      <GuestHeader
        title="Find a Game"
        subtitle={`${venue.name} · ${table.label}`}
        backHref={`/v/${venueSlug}/t/${tableId}`}
        backLabel="Back to table"
      />

      {/* Wizard Form (Client Component) */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <WizardForm venueId={venue.id} venueSlug={venueSlug} tableId={tableId} />
      </div>
    </main>
  );
}
