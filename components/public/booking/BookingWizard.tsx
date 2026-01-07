'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
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

const STEP_LABELS = [
  'Search',
  'Availability',
  'Details',
  'Game',
  'Confirm',
];

export function BookingWizard({ venueId, venueName, venueSlug, settings }: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingData>(initialData);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  const updateData = (updates: Partial<BookingData>) => {
    setData((prev: BookingData) => ({ ...prev, ...updates }));
  };

  const handleComplete = (booking: Booking) => {
    setCompletedBooking(booking);
    setStep(6);
  };

  // Success state - show confirmation
  if (step === 6 && completedBooking) {
    return <StepSuccess booking={completedBooking} venueName={venueName} />;
  }

  return (
    <div className="bg-white rounded-xl shadow-card border border-[color:var(--color-structure)] overflow-hidden">
      {/* Progress Header */}
      <div className="px-4 py-4 bg-[color:var(--color-muted)] border-b border-[color:var(--color-structure)]">
        {/* Progress Bar */}
        <div className="flex items-center gap-1.5 mb-3">
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={n}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                n < step
                  ? 'bg-teal-500'
                  : n === step
                    ? 'bg-teal-500'
                    : 'bg-[color:var(--color-structure)]'
              )}
            />
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[color:var(--color-ink-secondary)]">
            Step {step} of 5
          </span>
          <span className="font-medium text-[color:var(--color-ink-primary)]">
            {STEP_LABELS[step - 1]}
          </span>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-4 sm:p-6">
        {step === 1 && (
          <StepSearch
            data={data}
            settings={settings}
            onUpdate={updateData}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepAvailability
            venueId={venueId}
            data={data}
            settings={settings}
            onUpdate={updateData}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <StepDetails
            data={data}
            settings={settings}
            onUpdate={updateData}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <StepGame
            venueId={venueId}
            data={data}
            onUpdate={updateData}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && (
          <StepConfirm
            venueId={venueId}
            data={data}
            settings={settings}
            onComplete={handleComplete}
            onBack={() => setStep(4)}
          />
        )}
      </div>
    </div>
  );
}
