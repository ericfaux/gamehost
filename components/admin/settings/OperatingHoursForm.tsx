'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from '@/components/icons';
import type { VenueOperatingHours } from '@/lib/db/types';

// =============================================================================
// Types
// =============================================================================

interface OperatingHoursFormProps {
  venueId: string;
  initialHours: VenueOperatingHours[];
  onSave: (hours: OperatingHoursInput[]) => Promise<SaveResult>;
  onCheckConflicts?: (hours: OperatingHoursInput[]) => Promise<BookingConflict[]>;
}

export interface OperatingHoursInput {
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

interface SaveResult {
  success: boolean;
  error?: string;
}

export interface BookingConflict {
  id: string;
  guest_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  table_label: string;
  conflict_reason: string;
}

// =============================================================================
// Constants
// =============================================================================

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

// Generate time options in 30-minute increments
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  const value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const label = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  return { value, label };
});

// Default hours for initialization
const DEFAULT_HOURS: OperatingHoursInput[] = [
  { day_of_week: 0, is_closed: false, open_time: '11:00:00', close_time: '21:00:00' }, // Sunday
  { day_of_week: 1, is_closed: false, open_time: '10:00:00', close_time: '22:00:00' }, // Monday
  { day_of_week: 2, is_closed: false, open_time: '10:00:00', close_time: '22:00:00' }, // Tuesday
  { day_of_week: 3, is_closed: false, open_time: '10:00:00', close_time: '22:00:00' }, // Wednesday
  { day_of_week: 4, is_closed: false, open_time: '10:00:00', close_time: '22:00:00' }, // Thursday
  { day_of_week: 5, is_closed: false, open_time: '10:00:00', close_time: '23:00:00' }, // Friday
  { day_of_week: 6, is_closed: false, open_time: '11:00:00', close_time: '23:00:00' }, // Saturday
];

// =============================================================================
// Helpers
// =============================================================================

function normalizeHours(hours: VenueOperatingHours[]): OperatingHoursInput[] {
  // Create a map from existing hours
  const hoursMap = new Map(hours.map(h => [h.day_of_week, h]));

  // Ensure all 7 days are present
  return DAYS_OF_WEEK.map(day => {
    const existing = hoursMap.get(day.value);
    if (existing) {
      return {
        day_of_week: existing.day_of_week,
        is_closed: existing.is_closed,
        open_time: existing.open_time,
        close_time: existing.close_time,
      };
    }
    // Use default for missing days
    return DEFAULT_HOURS[day.value];
  });
}

// =============================================================================
// Component
// =============================================================================

export function OperatingHoursForm({
  venueId: _venueId,
  initialHours,
  onSave,
  onCheckConflicts,
}: OperatingHoursFormProps) {
  const [hours, setHours] = useState<OperatingHoursInput[]>(() =>
    normalizeHours(initialHours)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);

  // Common styles (matching BookingSettingsForm)
  const labelClass = "text-xs uppercase tracking-rulebook text-ink-secondary block mb-1";
  const selectClass = "w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring";
  const helpTextClass = "text-xs text-ink-secondary mt-1";

  const updateDay = (dayIndex: number, field: keyof OperatingHoursInput, value: unknown) => {
    setHours(prev => prev.map((h, i) =>
      i === dayIndex ? { ...h, [field]: value } : h
    ));
    setError(null);
  };

  const handleSave = async (skipConflictCheck = false) => {
    setError(null);

    // Check for conflicts first (unless skipping)
    if (!skipConflictCheck && onCheckConflicts) {
      setIsSaving(true);
      try {
        const foundConflicts = await onCheckConflicts(hours);
        if (foundConflicts.length > 0) {
          setConflicts(foundConflicts);
          setShowConflictWarning(true);
          setIsSaving(false);
          return;
        }
      } catch (err) {
        console.error('Error checking conflicts:', err);
        // Continue with save even if conflict check fails
      }
    }

    setIsSaving(true);
    setShowConflictWarning(false);

    try {
      const result = await onSave(hours);
      if (result.success) {
        setLastSaved(new Date());
        setConflicts([]);
      } else {
        setError(result.error ?? 'Failed to save operating hours');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error saving operating hours:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatConflictDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'EEE, MMM d');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle>Operating Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-secondary -mt-2 mb-4">
            Set when your venue is open for bookings. Guests can only book during these hours.
          </p>

          {/* Hours Grid */}
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day, index) => {
              const dayHours = hours[index];
              return (
                <div
                  key={day.value}
                  className="grid grid-cols-[100px_1fr] md:grid-cols-[120px_100px_1fr_1fr] gap-3 items-center py-3 border-b border-[color:var(--color-structure)] last:border-b-0"
                >
                  {/* Day Name */}
                  <div className="font-medium text-sm text-[color:var(--color-ink-primary)]">
                    {day.label}
                  </div>

                  {/* Open/Closed Toggle */}
                  <div className="flex items-center gap-2 md:justify-center">
                    <button
                      type="button"
                      onClick={() => updateDay(index, 'is_closed', !dayHours.is_closed)}
                      className={`
                        px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                        ${dayHours.is_closed
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                        }
                      `}
                    >
                      {dayHours.is_closed ? 'Closed' : 'Open'}
                    </button>
                  </div>

                  {/* Time Selectors (hidden when closed) */}
                  {!dayHours.is_closed ? (
                    <>
                      <div>
                        <label className={`${labelClass} md:hidden`}>Opens</label>
                        <select
                          className={selectClass}
                          value={dayHours.open_time ?? '10:00:00'}
                          onChange={(e) => updateDay(index, 'open_time', e.target.value)}
                        >
                          {TIME_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`${labelClass} md:hidden`}>Closes</label>
                        <select
                          className={selectClass}
                          value={dayHours.close_time ?? '22:00:00'}
                          onChange={(e) => updateDay(index, 'close_time', e.target.value)}
                        >
                          {TIME_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 text-sm text-ink-secondary italic">
                      No bookings accepted
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className={helpTextClass}>
            Times are shown in your local timezone. Guests will see times in their own timezone when booking.
          </p>
        </CardContent>
      </Card>

      {/* Conflict Warning Modal */}
      {showConflictWarning && conflicts.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-2">
                  Booking Conflict Warning
                </h4>
                <p className="text-sm text-amber-800 mb-3">
                  The new operating hours conflict with {conflicts.length} existing booking{conflicts.length === 1 ? '' : 's'}:
                </p>
                <ul className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {conflicts.slice(0, 5).map((conflict) => (
                    <li key={conflict.id} className="text-sm text-amber-800 bg-amber-100 rounded px-3 py-2">
                      <span className="font-medium">{formatConflictDate(conflict.booking_date)}</span>
                      {' at '}
                      <span className="font-mono">{formatTime(conflict.start_time)}</span>
                      {' - '}
                      {conflict.table_label} ({conflict.guest_name})
                      <br />
                      <span className="text-xs text-amber-700">{conflict.conflict_reason}</span>
                    </li>
                  ))}
                  {conflicts.length > 5 && (
                    <li className="text-sm text-amber-700 italic">
                      ...and {conflicts.length - 5} more
                    </li>
                  )}
                </ul>
                <p className="text-xs text-amber-700 mb-4">
                  These bookings will NOT be automatically cancelled. You may need to contact these guests.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowConflictWarning(false);
                      setConflicts([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Anyway'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-[color:var(--color-structure)]">
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-sm text-red-600">{error}</span>
          )}
          {lastSaved && !error && (
            <span className="text-sm text-ink-secondary">
              Last saved {format(lastSaved, 'h:mm a')}
            </span>
          )}
        </div>
        <Button onClick={() => handleSave()} disabled={isSaving}>
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}
