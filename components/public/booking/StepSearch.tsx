'use client';

import { useState, useMemo, useId } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Users, ChevronRight, Minus, Plus } from '@/components/icons';
import { formatDateString } from '@/components/admin/bookings/utils/calendarUtils';
import type { BookingData } from './BookingWizard';
import type { VenueBookingSettings } from '@/lib/db/types';

interface StepSearchProps {
  data: BookingData;
  settings: VenueBookingSettings;
  onUpdate: (updates: Partial<BookingData>) => void;
  onNext: () => void;
}

const PARTY_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];
const QUICK_SELECT_SIZES = [2, 3, 4, 5, 6];

export function StepSearch({ data, settings, onUpdate, onNext }: StepSearchProps) {
  const [errors, setErrors] = useState<{ date?: string; partySize?: string }>({});
  const dateInputId = useId();
  const partySizeId = useId();
  const dateErrorId = useId();
  const partySizeErrorId = useId();

  // Calculate date constraints using local dates (not UTC)
  const dateConstraints = useMemo(() => {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + Math.ceil(settings.min_advance_hours / 24));

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + settings.max_advance_days);

    return {
      min: formatDateString(minDate),
      max: formatDateString(maxDate),
    };
  }, [settings.min_advance_hours, settings.max_advance_days]);

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  // Handle party size increment/decrement
  const adjustPartySize = (delta: number) => {
    const currentIndex = PARTY_SIZE_OPTIONS.indexOf(data.partySize);
    let newIndex = currentIndex + delta;

    if (newIndex < 0) newIndex = 0;
    if (newIndex >= PARTY_SIZE_OPTIONS.length) newIndex = PARTY_SIZE_OPTIONS.length - 1;

    onUpdate({ partySize: PARTY_SIZE_OPTIONS[newIndex] });
    setErrors(prev => ({ ...prev, partySize: undefined }));
  };

  // Validate and proceed
  const handleNext = () => {
    const newErrors: { date?: string; partySize?: string } = {};

    if (!data.date) {
      newErrors.date = 'Please select a date';
    } else {
      const selectedDate = new Date(data.date + 'T00:00:00');
      const minDate = new Date(dateConstraints.min + 'T00:00:00');
      const maxDate = new Date(dateConstraints.max + 'T00:00:00');

      if (selectedDate < minDate) {
        newErrors.date = `Bookings require at least ${settings.min_advance_hours} hours notice`;
      } else if (selectedDate > maxDate) {
        newErrors.date = `Bookings can only be made up to ${settings.max_advance_days} days in advance`;
      }
    }

    if (!data.partySize || data.partySize < 1) {
      newErrors.partySize = 'Please select party size';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  const isAtMinSize = data.partySize <= PARTY_SIZE_OPTIONS[0];
  const isAtMaxSize = data.partySize >= PARTY_SIZE_OPTIONS[PARTY_SIZE_OPTIONS.length - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-serif font-semibold text-[color:var(--color-ink-primary)]">
          When are you visiting?
        </h2>
        <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
          Select your preferred date and party size
        </p>
      </div>

      {/* Date Selection */}
      <div className="space-y-2">
        <label
          htmlFor={dateInputId}
          className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)] block"
        >
          Date
        </label>
        <div className="relative">
          <Calendar
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={dateInputId}
            type="date"
            value={data.date}
            onChange={e => {
              onUpdate({ date: e.target.value });
              setErrors(prev => ({ ...prev, date: undefined }));
            }}
            min={dateConstraints.min}
            max={dateConstraints.max}
            aria-required="true"
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? dateErrorId : undefined}
            className={cn(
              'w-full rounded-token border bg-[color:var(--color-elevated)] pl-11 pr-4 py-3 text-base shadow-card focus-ring',
              'min-h-[48px]', // Ensure good touch target
              errors.date
                ? 'border-[color:var(--color-danger)]'
                : 'border-[color:var(--color-structure)]'
            )}
          />
        </div>
        {data.date && !errors.date && (
          <p className="text-sm text-[color:var(--color-ink-secondary)]" aria-live="polite">
            {formatDateDisplay(data.date)}
          </p>
        )}
        {errors.date && (
          <p
            id={dateErrorId}
            role="alert"
            className="text-sm text-[color:var(--color-danger)]"
          >
            {errors.date}
          </p>
        )}
      </div>

      {/* Party Size Selection */}
      <div className="space-y-2">
        <label
          id={partySizeId}
          className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)] block"
        >
          Party Size
        </label>

        {/* Stepper Control for Mobile */}
        <div
          className="flex items-center gap-4"
          role="group"
          aria-labelledby={partySizeId}
        >
          <button
            type="button"
            onClick={() => adjustPartySize(-1)}
            disabled={isAtMinSize}
            aria-label={`Decrease party size${isAtMinSize ? ' (minimum reached)' : ''}`}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center border transition-colors',
              'active:scale-95 touch-manipulation min-h-[48px] min-w-[48px]',
              isAtMinSize
                ? 'border-[color:var(--color-structure)] text-[color:var(--color-structure)] cursor-not-allowed'
                : 'border-[color:var(--color-structure-strong)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)]'
            )}
          >
            <Minus className="w-5 h-5" aria-hidden="true" />
          </button>

          <div className="flex-1 text-center" aria-live="polite">
            <div className="flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
              <span
                className="text-2xl font-semibold text-[color:var(--color-ink-primary)]"
                aria-label={`${data.partySize} guests selected`}
              >
                {data.partySize}
              </span>
            </div>
            <p className="text-sm text-[color:var(--color-ink-secondary)]">
              {data.partySize === 1 ? 'guest' : 'guests'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => adjustPartySize(1)}
            disabled={isAtMaxSize}
            aria-label={`Increase party size${isAtMaxSize ? ' (maximum reached)' : ''}`}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center border transition-colors',
              'active:scale-95 touch-manipulation min-h-[48px] min-w-[48px]',
              isAtMaxSize
                ? 'border-[color:var(--color-structure)] text-[color:var(--color-structure)] cursor-not-allowed'
                : 'border-[color:var(--color-structure-strong)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)]'
            )}
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Quick Select Pills */}
        <div
          className="flex flex-wrap gap-2 pt-2"
          role="listbox"
          aria-label="Quick select party size"
        >
          {QUICK_SELECT_SIZES.map(size => (
            <button
              key={size}
              type="button"
              role="option"
              aria-selected={data.partySize === size}
              onClick={() => {
                onUpdate({ partySize: size });
                setErrors(prev => ({ ...prev, partySize: undefined }));
              }}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors touch-manipulation',
                'min-h-[40px] min-w-[40px]', // Touch target
                data.partySize === size
                  ? 'bg-teal-500 text-white'
                  : 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-structure)]'
              )}
            >
              {size}
            </button>
          ))}
        </div>

        {errors.partySize && (
          <p
            id={partySizeErrorId}
            role="alert"
            className="text-sm text-[color:var(--color-danger)]"
          >
            {errors.partySize}
          </p>
        )}
      </div>

      {/* Next Button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={!data.date}
        aria-disabled={!data.date}
        className={cn(
          'w-full py-4 rounded-token font-semibold text-base flex items-center justify-center gap-2 transition-colors touch-manipulation',
          'min-h-[52px]', // Large touch target for primary action
          data.date
            ? 'bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]'
            : 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)] cursor-not-allowed'
        )}
      >
        Find Available Times
        <ChevronRight className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  );
}
