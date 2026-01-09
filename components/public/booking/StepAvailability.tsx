'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  TableProperties,
  Users,
  RefreshCw,
  Flame,
} from '@/components/icons';
import {
  getTimeSlotsWithAvailabilityAction,
  type TimeSlotWithAvailability,
} from '@/app/actions/bookings';
import { SlotsSkeleton } from './BookingSkeleton';
import { NetworkError } from './BookingErrorBoundary';
import type { BookingData } from './BookingWizard';
import type { VenueBookingSettings, AvailableSlot, AvailableTable } from '@/lib/db/types';

interface StepAvailabilityProps {
  venueId: string;
  data: BookingData;
  settings: VenueBookingSettings;
  onUpdate: (updates: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface TimeSlotGroup {
  period: 'Morning' | 'Afternoon' | 'Evening';
  slots: TimeSlotWithAvailability[];
}

// Group slots by time period (includes all slots - available, limited, and unavailable)
function groupSlotsByPeriod(slots: TimeSlotWithAvailability[]): TimeSlotGroup[] {
  const morning: TimeSlotWithAvailability[] = [];
  const afternoon: TimeSlotWithAvailability[] = [];
  const evening: TimeSlotWithAvailability[] = [];

  slots.forEach(slot => {
    const hour = parseInt(slot.start_time.split(':')[0], 10);
    if (hour < 12) {
      morning.push(slot);
    } else if (hour < 17) {
      afternoon.push(slot);
    } else {
      evening.push(slot);
    }
  });

  const groups: TimeSlotGroup[] = [];
  if (morning.length > 0) groups.push({ period: 'Morning', slots: morning });
  if (afternoon.length > 0) groups.push({ period: 'Afternoon', slots: afternoon });
  if (evening.length > 0) groups.push({ period: 'Evening', slots: evening });

  return groups;
}

// Get availability badge text
function getAvailabilityBadgeText(slot: TimeSlotWithAvailability): string | null {
  if (slot.status === 'limited') {
    if (slot.available_tables === 1) {
      return 'Only 1 left!';
    }
    return `${slot.available_tables} spots left`;
  }
  if (slot.status === 'unavailable') {
    return 'Fully booked';
  }
  return null;
}

// Format time for display (12-hour format)
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// Format date for display
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function StepAvailability({
  venueId,
  data,
  settings,
  onUpdate,
  onNext,
  onBack,
}: StepAvailabilityProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [allSlots, setAllSlots] = useState<TimeSlotWithAvailability[]>([]);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(
    data.startTime || null
  );
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  // Fetch availability with retry support
  const fetchAvailability = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all slots with their availability status in a single call
      const result = await getTimeSlotsWithAvailabilityAction({
        venueId,
        date: data.date,
        partySize: data.partySize,
        durationMinutes: settings.default_duration_minutes,
        limitedThreshold: 2, // Show "limited" when 2 or fewer tables remain
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to load availability');
      }

      const slots = result.data ?? [];
      setAllSlots(slots);

      // If previously selected slot is no longer available, clear selection
      if (data.startTime) {
        const selectedSlot = slots.find(s => s.start_time === data.startTime);
        if (!selectedSlot || selectedSlot.status === 'unavailable') {
          onUpdate({
            selectedSlot: null,
            selectedTableId: '',
            startTime: '',
            endTime: '',
          });
          setSelectedSlotTime(null);
        }
      }
    } catch (err) {
      console.error('Error fetching availability:', err);

      // Retry logic with exponential backoff
      if (retryCount < 2) {
        setIsRetrying(true);
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
        await new Promise(resolve => setTimeout(resolve, delay));
        setIsRetrying(false);
        return fetchAvailability(retryCount + 1);
      }

      setError('Unable to load available times. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [venueId, data.date, data.partySize, settings.default_duration_minutes, onUpdate]);

  // Fetch availability when component mounts or date/party size changes
  useEffect(() => {
    if (data.date && data.partySize) {
      fetchAvailability();
    }
  }, [data.date, data.partySize, fetchAvailability]);

  // Handle slot selection (only for available/limited slots)
  const handleSlotSelect = (slot: TimeSlotWithAvailability) => {
    // Don't allow selection of unavailable slots
    if (slot.status === 'unavailable') {
      return;
    }

    setSelectedSlotTime(slot.start_time);

    // Convert to AvailableSlot format for compatibility with BookingData
    const availableSlot: AvailableSlot = {
      start_time: slot.start_time,
      end_time: slot.end_time,
      tables: slot.tables.map(t => ({
        table_id: t.table_id,
        table_label: t.table_label,
        capacity: t.capacity,
        available_from: slot.start_time,
        available_until: slot.end_time,
      })),
    };

    // If only one table, auto-select it
    if (slot.tables.length === 1) {
      const table = slot.tables[0];
      onUpdate({
        selectedSlot: availableSlot,
        selectedTableId: table.table_id,
        startTime: slot.start_time,
        endTime: slot.end_time,
      });
      setExpandedSlot(null);
    } else {
      // Show table options
      setExpandedSlot(slot.start_time);
      onUpdate({
        selectedSlot: availableSlot,
        selectedTableId: '',
        startTime: slot.start_time,
        endTime: slot.end_time,
      });
    }
  };

  // Handle table selection
  const handleTableSelect = (slot: TimeSlotWithAvailability, tableId: string) => {
    // Convert to AvailableSlot format for compatibility with BookingData
    const availableSlot: AvailableSlot = {
      start_time: slot.start_time,
      end_time: slot.end_time,
      tables: slot.tables.map(t => ({
        table_id: t.table_id,
        table_label: t.table_label,
        capacity: t.capacity,
        available_from: slot.start_time,
        available_until: slot.end_time,
      })),
    };

    onUpdate({
      selectedSlot: availableSlot,
      selectedTableId: tableId,
      startTime: slot.start_time,
      endTime: slot.end_time,
    });
  };

  // Check if can proceed
  const canProceed = data.selectedSlot && data.selectedTableId;

  // Group all slots by period (including unavailable)
  const groupedSlots = groupSlotsByPeriod(allSlots);

  // Check if any slots are available at all
  const hasAnyAvailability = allSlots.some(s => s.status !== 'unavailable');

  // Loading State with Skeleton
  if (loading) {
    return <SlotsSkeleton />;
  }

  // Network Error State
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-serif font-semibold text-[color:var(--color-ink-primary)]">
            Select a Time
          </h2>
          <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
            {formatDateDisplay(data.date)} · {data.partySize}{' '}
            {data.partySize === 1 ? 'guest' : 'guests'}
          </p>
        </div>

        <NetworkError onRetry={() => fetchAvailability()} isRetrying={isRetrying} />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-3 rounded-token font-medium text-base flex items-center justify-center gap-2 transition-colors touch-manipulation border border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)] min-h-[48px]"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-serif font-semibold text-[color:var(--color-ink-primary)]">
          Select a Time
        </h2>
        <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
          {formatDateDisplay(data.date)} · {data.partySize}{' '}
          {data.partySize === 1 ? 'guest' : 'guests'}
        </p>
      </div>

      {/* No Availability - shown when ALL slots are unavailable */}
      {!hasAnyAvailability && allSlots.length > 0 && (
        <div className="py-8 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-[color:var(--color-muted)] flex items-center justify-center">
            <Clock className="w-7 h-7 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium text-[color:var(--color-ink-primary)]">
              Fully booked
            </p>
            <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
              Sorry, all time slots are booked for{' '}
              {data.partySize} {data.partySize === 1 ? 'guest' : 'guests'} on
              this date.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="mt-2 px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-700 min-h-[44px]"
          >
            Try a different date
          </button>
        </div>
      )}

      {/* Time Slots Grid - shows all slots including unavailable */}
      {allSlots.length > 0 && hasAnyAvailability && (
        <div className="space-y-6" role="region" aria-label="Time slots">
          {groupedSlots.map(group => (
            <div key={group.period}>
              <h3 className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)] mb-3">
                {group.period}
              </h3>
              <div
                className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                role="listbox"
                aria-label={`${group.period} time slots`}
              >
                {group.slots.map(slot => {
                  const isSelected = selectedSlotTime === slot.start_time;
                  const isExpanded = expandedSlot === slot.start_time;
                  const hasMultipleTables = slot.tables.length > 1;
                  const isUnavailable = slot.status === 'unavailable';
                  const isLimited = slot.status === 'limited';
                  const badgeText = getAvailabilityBadgeText(slot);

                  return (
                    <div key={slot.start_time} className="contents">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        aria-expanded={hasMultipleTables ? isExpanded : undefined}
                        aria-disabled={isUnavailable}
                        disabled={isUnavailable}
                        onClick={() => handleSlotSelect(slot)}
                        className={cn(
                          'px-3 py-2.5 rounded-token text-sm font-medium transition-all touch-manipulation',
                          'border focus-ring min-h-[48px]',
                          // Selected state
                          isSelected && 'bg-teal-500 text-white border-teal-500 active:scale-95',
                          // Unavailable state
                          isUnavailable && 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60',
                          // Limited availability state
                          isLimited && !isSelected && 'bg-[color:var(--color-elevated)] text-[color:var(--color-ink-primary)] border-orange-300 hover:border-orange-400',
                          // Available (normal) state
                          !isSelected && !isUnavailable && !isLimited && 'bg-[color:var(--color-elevated)] text-[color:var(--color-ink-primary)] border-[color:var(--color-structure)] hover:border-teal-500 active:scale-95'
                        )}
                      >
                        {/* Time display */}
                        <span className={cn(isUnavailable && 'line-through')}>
                          {formatTime(slot.start_time)}
                        </span>

                        {/* Availability badge for limited slots */}
                        {isLimited && !isSelected && badgeText && (
                          <span className="flex items-center justify-center gap-1 text-[10px] text-orange-600 font-medium mt-0.5">
                            <Flame className="w-3 h-3" aria-hidden="true" />
                            {badgeText}
                          </span>
                        )}

                        {/* Unavailable indicator */}
                        {isUnavailable && (
                          <span className="block text-[10px] text-gray-400 mt-0.5">
                            {badgeText}
                          </span>
                        )}

                        {/* Multiple tables indicator (for available/limited slots) */}
                        {hasMultipleTables && !isSelected && !isUnavailable && !isLimited && (
                          <span className="block text-xs opacity-70 mt-0.5">
                            {slot.tables.length} tables
                          </span>
                        )}
                      </button>

                      {/* Table Selection (when expanded) */}
                      {isExpanded && hasMultipleTables && !isUnavailable && (
                        <div
                          className="col-span-full mt-2 mb-2 p-3 bg-[color:var(--color-muted)] rounded-token"
                          role="listbox"
                          aria-label="Select a table"
                        >
                          <p className="text-xs text-[color:var(--color-ink-secondary)] mb-2">
                            Select a table:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {slot.tables.map(table => (
                              <button
                                key={table.table_id}
                                type="button"
                                role="option"
                                aria-selected={data.selectedTableId === table.table_id}
                                onClick={() =>
                                  handleTableSelect(slot, table.table_id)
                                }
                                className={cn(
                                  'flex items-center gap-2 px-3 py-2 rounded-token text-sm transition-colors touch-manipulation',
                                  'border focus-ring min-h-[44px]',
                                  'active:scale-95',
                                  data.selectedTableId === table.table_id
                                    ? 'bg-teal-500 text-white border-teal-500'
                                    : 'bg-white text-[color:var(--color-ink-primary)] border-[color:var(--color-structure)] hover:border-teal-500'
                                )}
                              >
                                <TableProperties className="w-4 h-4" aria-hidden="true" />
                                <span>{table.table_label}</span>
                                {table.capacity && (
                                  <span className="flex items-center gap-1 text-xs opacity-70">
                                    <Users className="w-3 h-3" aria-hidden="true" />
                                    {table.capacity}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Summary */}
      {data.selectedSlot && data.selectedTableId && (
        <div
          className="p-4 bg-teal-50 rounded-token border border-teal-200"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-teal-900">
            Selected: {formatTime(data.startTime)} -{' '}
            {formatTime(data.endTime)}
          </p>
          <p className="text-sm text-teal-700 mt-1">
            Table:{' '}
            {data.selectedSlot.tables.find(
              t => t.table_id === data.selectedTableId
            )?.table_label || 'Selected'}
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      {allSlots.length > 0 && hasAnyAvailability && (
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-3 rounded-token font-medium text-base flex items-center justify-center gap-2 transition-colors touch-manipulation border border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)] min-h-[48px]"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canProceed}
            aria-disabled={!canProceed}
            className={cn(
              'flex-[2] py-3 rounded-token font-semibold text-base flex items-center justify-center gap-2 transition-colors touch-manipulation min-h-[48px]',
              canProceed
                ? 'bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]'
                : 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)] cursor-not-allowed'
            )}
          >
            Continue
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
