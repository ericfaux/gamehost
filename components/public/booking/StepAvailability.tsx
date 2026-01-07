'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  TableProperties,
  Users,
} from '@/components/icons';
import { checkAvailableTablesAction } from '@/app/actions/bookings';
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
  slots: AvailableSlot[];
}

// Helper to add minutes to a time string
function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

// Generate time slots for the day based on interval
function generateTimeSlots(intervalMinutes: number): string[] {
  const slots: string[] = [];
  // Start at 10:00 AM, end at 10:00 PM
  const startMinutes = 10 * 60; // 10:00 AM
  const endMinutes = 22 * 60; // 10:00 PM

  for (let minutes = startMinutes; minutes < endMinutes; minutes += intervalMinutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slots.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
  }

  return slots;
}

// Group slots by time period
function groupSlotsByPeriod(slots: AvailableSlot[]): TimeSlotGroup[] {
  const morning: AvailableSlot[] = [];
  const afternoon: AvailableSlot[] = [];
  const evening: AvailableSlot[] = [];

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
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(
    data.startTime || null
  );
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  // Fetch availability when component mounts or date/party size changes
  useEffect(() => {
    async function fetchAvailability() {
      setLoading(true);
      setError(null);

      try {
        // Generate all possible time slots for the day
        const timeSlots = generateTimeSlots(settings.slot_interval_minutes);
        const durationMinutes = settings.default_duration_minutes;
        const slots: AvailableSlot[] = [];

        // Check each time slot
        for (const startTime of timeSlots) {
          const endTime = addMinutesToTime(startTime, durationMinutes);

          const result = await checkAvailableTablesAction({
            venueId,
            date: data.date,
            startTime,
            endTime,
            partySize: data.partySize,
          });

          if (result.success && result.data && result.data.length > 0) {
            // Transform the result to match AvailableSlot type
            const tables: AvailableTable[] = result.data.map(t => ({
              table_id: t.table_id,
              table_label: t.table_label,
              capacity: t.capacity,
              available_from: startTime,
              available_until: endTime,
            }));

            slots.push({
              start_time: startTime,
              end_time: endTime,
              tables,
            });
          }
        }

        setAvailableSlots(slots);

        // If previously selected slot is still available, keep it selected
        if (data.startTime) {
          const stillAvailable = slots.some(
            s => s.start_time === data.startTime
          );
          if (!stillAvailable) {
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
        setError('Failed to load availability. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (data.date && data.partySize) {
      fetchAvailability();
    }
  }, [venueId, data.date, data.partySize, settings.slot_interval_minutes, settings.default_duration_minutes]);

  // Handle slot selection
  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlotTime(slot.start_time);

    // If only one table, auto-select it
    if (slot.tables.length === 1) {
      const table = slot.tables[0];
      onUpdate({
        selectedSlot: slot,
        selectedTableId: table.table_id,
        startTime: slot.start_time,
        endTime: slot.end_time,
      });
      setExpandedSlot(null);
    } else {
      // Show table options
      setExpandedSlot(slot.start_time);
      onUpdate({
        selectedSlot: slot,
        selectedTableId: '',
        startTime: slot.start_time,
        endTime: slot.end_time,
      });
    }
  };

  // Handle table selection
  const handleTableSelect = (slot: AvailableSlot, tableId: string) => {
    onUpdate({
      selectedSlot: slot,
      selectedTableId: tableId,
      startTime: slot.start_time,
      endTime: slot.end_time,
    });
  };

  // Check if can proceed
  const canProceed = data.selectedSlot && data.selectedTableId;

  // Group slots by period
  const groupedSlots = groupSlotsByPeriod(availableSlots);

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

      {/* Loading State */}
      {loading && (
        <div className="py-12 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          <p className="text-sm text-[color:var(--color-ink-secondary)]">
            Checking availability...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="py-8 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-[color:var(--color-danger)]" />
          <p className="text-sm text-[color:var(--color-danger)]">{error}</p>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Go back and try again
          </button>
        </div>
      )}

      {/* No Availability */}
      {!loading && !error && availableSlots.length === 0 && (
        <div className="py-8 flex flex-col items-center gap-3 text-center">
          <Clock className="w-10 h-10 text-[color:var(--color-ink-secondary)]" />
          <div>
            <p className="font-medium text-[color:var(--color-ink-primary)]">
              No availability
            </p>
            <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
              Sorry, we don&apos;t have any tables available for{' '}
              {data.partySize} {data.partySize === 1 ? 'guest' : 'guests'} on
              this date.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="mt-2 px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Try a different date
          </button>
        </div>
      )}

      {/* Time Slots Grid */}
      {!loading && !error && availableSlots.length > 0 && (
        <div className="space-y-6">
          {groupedSlots.map(group => (
            <div key={group.period}>
              <h3 className="text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)] mb-3">
                {group.period}
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {group.slots.map(slot => {
                  const isSelected = selectedSlotTime === slot.start_time;
                  const isExpanded = expandedSlot === slot.start_time;
                  const hasMultipleTables = slot.tables.length > 1;

                  return (
                    <div key={slot.start_time} className="contents">
                      <button
                        type="button"
                        onClick={() => handleSlotSelect(slot)}
                        className={cn(
                          'px-3 py-3 rounded-token text-sm font-medium transition-all touch-manipulation',
                          'border focus-ring',
                          isSelected
                            ? 'bg-teal-500 text-white border-teal-500'
                            : 'bg-[color:var(--color-elevated)] text-[color:var(--color-ink-primary)] border-[color:var(--color-structure)] hover:border-teal-500'
                        )}
                      >
                        {formatTime(slot.start_time)}
                        {hasMultipleTables && !isSelected && (
                          <span className="block text-xs opacity-70 mt-0.5">
                            {slot.tables.length} tables
                          </span>
                        )}
                      </button>

                      {/* Table Selection (when expanded) */}
                      {isExpanded && hasMultipleTables && (
                        <div className="col-span-full mt-2 mb-2 p-3 bg-[color:var(--color-muted)] rounded-token">
                          <p className="text-xs text-[color:var(--color-ink-secondary)] mb-2">
                            Select a table:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {slot.tables.map(table => (
                              <button
                                key={table.table_id}
                                type="button"
                                onClick={() =>
                                  handleTableSelect(slot, table.table_id)
                                }
                                className={cn(
                                  'flex items-center gap-2 px-3 py-2 rounded-token text-sm transition-colors touch-manipulation',
                                  'border focus-ring',
                                  data.selectedTableId === table.table_id
                                    ? 'bg-teal-500 text-white border-teal-500'
                                    : 'bg-white text-[color:var(--color-ink-primary)] border-[color:var(--color-structure)] hover:border-teal-500'
                                )}
                              >
                                <TableProperties className="w-4 h-4" />
                                <span>{table.table_label}</span>
                                {table.capacity && (
                                  <span className="flex items-center gap-1 text-xs opacity-70">
                                    <Users className="w-3 h-3" />
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
        <div className="p-4 bg-teal-50 rounded-token border border-teal-200">
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
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-token font-medium text-base flex items-center justify-center gap-2 transition-colors touch-manipulation border border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)]"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className={cn(
            'flex-[2] py-3 rounded-token font-semibold text-base flex items-center justify-center gap-2 transition-colors touch-manipulation',
            canProceed
              ? 'bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]'
              : 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)] cursor-not-allowed'
          )}
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
