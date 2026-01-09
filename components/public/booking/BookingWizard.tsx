'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from '@/components/icons';
import { StepSearch } from './StepSearch';
import { StepAvailability } from './StepAvailability';
import { StepDetails } from './StepDetails';
import { StepGame } from './StepGame';
import { StepConfirm } from './StepConfirm';
import { StepSuccess } from './StepSuccess';
import type { VenueBookingSettings, AvailableSlot, Booking } from '@/lib/db/types';

interface BookingWizardProps {
  venueId: string;
  venueName: string;
  venueSlug: string;
  settings: VenueBookingSettings;
}

export interface BookingData {
  // Step 1: Search
  date: string;
  partySize: number;

  // Step 2: Availability
  selectedSlot: AvailableSlot | null;
  selectedTableId: string;
  startTime: string;
  endTime: string;

  // Step 3: Details
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  notes: string;

  // Step 4: Game
  gameId: string | null;
  gameTitle: string | null;
}

const initialData: BookingData = {
  date: '',
  partySize: 2,
  selectedSlot: null,
  selectedTableId: '',
  startTime: '',
  endTime: '',
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  notes: '',
  gameId: null,
  gameTitle: null,
};

const STEPS = [
  { num: 1, label: 'When', shortLabel: 'Date' },
  { num: 2, label: 'Time', shortLabel: 'Time' },
  { num: 3, label: 'Details', shortLabel: 'Info' },
  { num: 4, label: 'Game', shortLabel: 'Game' },
  { num: 5, label: 'Confirm', shortLabel: 'Done' },
];

export function BookingWizard({ venueId, venueName, venueSlug, settings }: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingData>(initialData);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [targetStep, setTargetStep] = useState<number | null>(null);
  const stepContainerRef = useRef<HTMLDivElement>(null);
  const isNavigatingRef = useRef(false);

  const updateData = (updates: Partial<BookingData>) => {
    setData((prev: BookingData) => ({ ...prev, ...updates }));
  };

  // Navigate to step with direction tracking and brief loading state
  const navigateToStep = useCallback((newStep: number, dir?: 'forward' | 'backward') => {
    if (newStep === step || isTransitioning) return;

    const newDirection = dir || (newStep > step ? 'forward' : 'backward');
    setDirection(newDirection);
    setTargetStep(newStep);
    setIsTransitioning(true);

    // Brief delay to show loading state, then transition
    setTimeout(() => {
      setStep(newStep);
      setIsTransitioning(false);
      setTargetStep(null);
    }, 150);
  }, [step, isTransitioning]);

  const handleComplete = (booking: Booking) => {
    setCompletedBooking(booking);
    setDirection('forward');
    setStep(6);
  };

  // Browser history management
  useEffect(() => {
    // Only push state when navigating forward from step 1
    if (step > 1 && !isNavigatingRef.current) {
      window.history.pushState({ step, bookingStep: true }, '', `?step=${step}`);
    }
    isNavigatingRef.current = false;
  }, [step]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.bookingStep && typeof event.state.step === 'number') {
        isNavigatingRef.current = true;
        navigateToStep(event.state.step, event.state.step < step ? 'backward' : 'forward');
      } else if (step > 1) {
        // User pressed back with no state - go to step 1
        isNavigatingRef.current = true;
        navigateToStep(1, 'backward');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [step, navigateToStep]);

  // Focus management on step change
  useEffect(() => {
    // Small delay to allow DOM to update
    const timeout = setTimeout(() => {
      stepContainerRef.current?.focus();
    }, 50);
    return () => clearTimeout(timeout);
  }, [step]);

  // Success state - show confirmation
  if (step === 6 && completedBooking) {
    return (
      <StepSuccess
        booking={completedBooking}
        venueName={venueName}
        venueSlug={venueSlug}
        settings={settings}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card border border-[color:var(--color-structure)] overflow-hidden">
      {/* Enhanced Progress Header with Step Labels */}
      <div className="px-4 py-4 bg-[color:var(--color-muted)] border-b border-[color:var(--color-structure)]">
        {/* Progress Dots with Connectors and Labels */}
        <div
          className="flex items-start justify-between gap-1"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-label={`Booking progress: Step ${step} of 5, ${STEPS[step - 1]?.label}`}
        >
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-start flex-1 last:flex-none">
              {/* Step Column with Dot and Label */}
              <div className="flex flex-col items-center flex-shrink-0">
                {/* Step Dot */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                    step > s.num && 'bg-teal-500 text-white',
                    step === s.num && 'bg-teal-500 text-white ring-2 ring-teal-200 ring-offset-1',
                    step < s.num && 'bg-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)]'
                  )}
                  aria-current={step === s.num ? 'step' : undefined}
                  aria-label={`Step ${s.num}: ${s.label}${step > s.num ? ' (completed)' : step === s.num ? ' (current)' : ''}`}
                >
                  {step > s.num ? (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <span>{s.num}</span>
                  )}
                </div>

                {/* Step Label - visible on all screen sizes */}
                <span
                  className={cn(
                    'mt-1.5 text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 text-center leading-tight',
                    // Completed steps: brand color
                    step > s.num && 'text-teal-600 font-medium',
                    // Current step: emphasized/bold
                    step === s.num && 'text-[color:var(--color-ink-primary)] font-semibold',
                    // Future steps: dimmed
                    step < s.num && 'text-[color:var(--color-ink-secondary)] opacity-60'
                  )}
                >
                  {/* Short labels on mobile, full labels on larger screens */}
                  <span className="sm:hidden">{s.shortLabel}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </span>
              </div>

              {/* Connector Line */}
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1 sm:mx-1.5 mt-3.5 transition-colors duration-300',
                    step > s.num ? 'bg-teal-500' : 'bg-[color:var(--color-structure)]'
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Counter (mobile-friendly summary) */}
        <div className="flex items-center justify-center text-xs mt-3 sm:hidden">
          <span className="text-[color:var(--color-ink-secondary)]">
            Step {step} of 5
          </span>
        </div>
      </div>

      {/* Step Content with Transitions */}
      <div
        ref={stepContainerRef}
        tabIndex={-1}
        role="region"
        aria-label={`Step ${step}: ${STEPS[step - 1]?.label}`}
        aria-live="polite"
        className="p-4 sm:p-6 outline-none"
      >
        {/* Loading state during step transition */}
        {isTransitioning && targetStep && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 animate-in fade-in duration-100">
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" aria-hidden="true" />
            <p className="text-sm text-[color:var(--color-ink-secondary)]">
              Loading {STEPS[targetStep - 1]?.label}...
            </p>
          </div>
        )}

        {/* Step content */}
        {!isTransitioning && (
          <div
            className={cn(
              'transition-all duration-200 ease-out',
              direction === 'forward'
                ? 'animate-in fade-in slide-in-from-right-4'
                : 'animate-in fade-in slide-in-from-left-4'
            )}
            key={step}
          >
            {step === 1 && (
              <StepSearch
                data={data}
                settings={settings}
                onUpdate={updateData}
                onNext={() => navigateToStep(2, 'forward')}
              />
            )}

            {step === 2 && (
              <StepAvailability
                venueId={venueId}
                data={data}
                settings={settings}
                onUpdate={updateData}
                onNext={() => navigateToStep(3, 'forward')}
                onBack={() => navigateToStep(1, 'backward')}
              />
            )}

            {step === 3 && (
              <StepDetails
                data={data}
                settings={settings}
                onUpdate={updateData}
                onNext={() => navigateToStep(4, 'forward')}
                onBack={() => navigateToStep(2, 'backward')}
              />
            )}

            {step === 4 && (
              <StepGame
                venueId={venueId}
                data={data}
                onUpdate={updateData}
                onNext={() => navigateToStep(5, 'forward')}
                onBack={() => navigateToStep(3, 'backward')}
              />
            )}

            {step === 5 && (
              <StepConfirm
                venueId={venueId}
                data={data}
                settings={settings}
                onComplete={handleComplete}
                onBack={() => navigateToStep(4, 'backward')}
                onEditStep={(targetStepNum: number) => navigateToStep(targetStepNum, 'backward')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
