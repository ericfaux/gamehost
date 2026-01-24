'use client';

import { PartyPopper, ArrowRight, Library, Table2, Settings } from '@/components/icons';

interface StepCompleteProps {
  venueName: string;
  onGoToDashboard: () => void;
}

export function StepComplete({ venueName, onGoToDashboard }: StepCompleteProps) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-[color:var(--color-structure)] overflow-hidden">
      <div className="p-6 sm:p-8 text-center">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-100 mb-6">
          <PartyPopper className="w-10 h-10 text-teal-600" aria-hidden="true" />
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-serif font-bold text-[color:var(--color-ink-primary)] mb-2">
          Welcome to GameLedger!
        </h1>
        <p className="text-[color:var(--color-ink-secondary)] max-w-md mx-auto">
          <strong>{venueName}</strong> is all set up. Here are some next steps to get started.
        </p>

        {/* Next Steps */}
        <div className="mt-8 space-y-3 text-left max-w-sm mx-auto">
          <h2 className="text-sm font-semibold text-[color:var(--color-ink-secondary)] uppercase tracking-wide mb-4">
            Recommended next steps
          </h2>

          <div className="flex items-start gap-3 p-3 bg-[color:var(--color-muted)] rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center">
              <Library className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-[color:var(--color-ink-primary)]">Add your games</p>
              <p className="text-sm text-[color:var(--color-ink-secondary)]">
                Import your game library to help guests find games
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[color:var(--color-muted)] rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center">
              <Table2 className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-[color:var(--color-ink-primary)]">Set up your tables</p>
              <p className="text-sm text-[color:var(--color-ink-secondary)]">
                Create your floor plan and table layout
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[color:var(--color-muted)] rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center">
              <Settings className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-[color:var(--color-ink-primary)]">Configure bookings</p>
              <p className="text-sm text-[color:var(--color-ink-secondary)]">
                Set your hours and enable online reservations
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={onGoToDashboard}
            className="w-full max-w-sm py-3 rounded-token font-semibold text-base flex items-center justify-center gap-2 transition-colors touch-manipulation bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98] min-h-[48px] mx-auto"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
