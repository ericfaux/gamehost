'use client';

import { Sparkles, ChevronRight } from '@/components/icons';

interface StepWelcomeProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div className="space-y-6">
      {/* Header with icon */}
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mb-4">
          <Sparkles className="w-8 h-8 text-teal-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-[color:var(--color-ink-primary)]">
          Welcome to GameLedger
        </h1>
        <p className="text-[color:var(--color-ink-secondary)] mt-2 max-w-md mx-auto">
          Let&apos;s get your venue set up. This will only take a few minutes.
        </p>
      </div>

      {/* What we'll cover */}
      <div className="bg-[color:var(--color-muted)] rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[color:var(--color-ink-primary)] uppercase tracking-wide">
          What we&apos;ll set up
        </h2>
        <ul className="space-y-2">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-semibold flex items-center justify-center">
              1
            </span>
            <div>
              <p className="font-medium text-[color:var(--color-ink-primary)]">Your Profile</p>
              <p className="text-sm text-[color:var(--color-ink-secondary)]">Basic contact info</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-semibold flex items-center justify-center">
              2
            </span>
            <div>
              <p className="font-medium text-[color:var(--color-ink-primary)]">Your Venue</p>
              <p className="text-sm text-[color:var(--color-ink-secondary)]">Name and description</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-semibold flex items-center justify-center">
              3
            </span>
            <div>
              <p className="font-medium text-[color:var(--color-ink-primary)]">Location & Links</p>
              <p className="text-sm text-[color:var(--color-ink-secondary)]">Optional - add anytime</p>
            </div>
          </li>
        </ul>
      </div>

      {/* CTA Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onNext}
          className="w-full py-3 rounded-token font-semibold text-base flex items-center justify-center gap-2 transition-colors touch-manipulation bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98] min-h-[48px]"
        >
          Get Started
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
