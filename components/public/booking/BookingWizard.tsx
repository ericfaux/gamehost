'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check } from '@/components/icons';
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
  const stepContainerRef = useRef<HTMLDivElement>(null);
  const isNavigatingRef = useRef(false);

  const updateData = (updates: Partial<BookingData>) => {
    setData((prev: BookingData) => ({ ...prev, ...updates }));
  };

  // Navigate to step with direction tracking
  const navigateToStep = useCallback((newStep: number, dir?: 'forward' | 'backward') => {
    if (newStep === step) return;
    setDirection(dir || (newStep > step ? 'forward' : 'backward'));
    setStep(newStep);
  }, [step]);

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
      {/* Enhanced Progress Header */}
      <div className="px-4 py-4 bg-[color:var(--color-muted)] border-b border-[color:var(--color-structure)]">
        {/* Progress Dots with Connectors */}
        <div className="flex items-center justify-between gap-1" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={5}>
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1 last:flex-none">
              {/* Step Dot */}
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 flex-shrink-0',
                  step > s.num && 'bg-teal-500 text-white',
                  step === s.num && 'bg-teal-500 text-white ring-2 ring-teal-200 ring-offset-1',
                  step < s.num && 'bg-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)]'
                )}
                aria-current={step === s.num ? 'step' : undefined}
              >
                {step > s.num ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <span>{s.num}</span>
                )}
              </div>

              {/* Connector Line */}
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1.5 transition-colors duration-300',
                    step > s.num ? 'bg-teal-500' : 'bg-[color:var(--color-structure)]'
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Label */}
        <div className="flex items-center justify-between text-xs mt-3">
          <span className="text-[color:var(--color-ink-secondary)]">
            Step {step} of 5
          </span>
          <span className="font-medium text-[color:var(--color-ink-primary)]">
            {STEPS[step - 1]?.label}
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
              onEditStep={(targetStep: number) => navigateToStep(targetStep, 'backward')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
