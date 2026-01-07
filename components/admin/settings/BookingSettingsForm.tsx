'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { updateVenueBookingSettingsAction } from '@/app/actions/bookings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VenueBookingSettings } from '@/lib/db/types';

interface BookingSettingsFormProps {
  venueId: string;
  initialSettings: VenueBookingSettings;
}

export function BookingSettingsForm({ venueId, initialSettings }: BookingSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof VenueBookingSettings>(
    field: K,
    value: VenueBookingSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await updateVenueBookingSettingsAction(venueId, {
        default_duration_minutes: settings.default_duration_minutes,
        min_booking_notice_hours: settings.min_booking_notice_hours,
        max_advance_booking_days: settings.max_advance_booking_days,
        buffer_minutes_between_bookings: settings.buffer_minutes_between_bookings,
        slot_interval_minutes: settings.slot_interval_minutes,
        allow_walk_ins: settings.allow_walk_ins,
        require_phone: settings.require_phone,
        require_email: settings.require_email,
        confirmation_message_template: settings.confirmation_message_template,
      });

      if (result.success) {
        setLastSaved(new Date());
      } else {
        setError(result.error ?? 'Failed to save settings');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Common styles
  const labelClass = "text-xs uppercase tracking-rulebook text-ink-secondary block mb-1";
  const selectClass = "w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring";
  const textareaClass = "w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring placeholder:text-[color:var(--color-ink-secondary)] resize-none";
  const helpTextClass = "text-xs text-ink-secondary mt-1";

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Timing Settings */}
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle>Timing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-secondary -mt-2 mb-4">
            Configure default durations and buffer times.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Default Duration</label>
              <select
                className={selectClass}
                value={settings.default_duration_minutes}
                onChange={(e) => updateField('default_duration_minutes', parseInt(e.target.value))}
              >
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
              <p className={helpTextClass}>Pre-selected duration for new bookings.</p>
            </div>

            <div>
              <label className={labelClass}>Buffer Time</label>
              <select
                className={selectClass}
                value={settings.buffer_minutes_between_bookings}
                onChange={(e) => updateField('buffer_minutes_between_bookings', parseInt(e.target.value))}
              >
                <option value={0}>No buffer</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
              <p className={helpTextClass}>Gap between bookings for table turnover.</p>
            </div>
          </div>

          <div>
            <label className={labelClass}>Slot Interval</label>
            <select
              className={selectClass}
              value={settings.slot_interval_minutes}
              onChange={(e) => updateField('slot_interval_minutes', parseInt(e.target.value))}
            >
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every hour</option>
            </select>
            <p className={helpTextClass}>How often booking slots are shown (e.g., 10:00, 10:30, 11:00).</p>
          </div>
        </CardContent>
      </Card>

      {/* Advance Booking */}
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle>Advance Booking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-secondary -mt-2 mb-4">
            Control how far ahead guests can book.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Minimum Notice</label>
              <select
                className={selectClass}
                value={settings.min_booking_notice_hours}
                onChange={(e) => updateField('min_booking_notice_hours', parseInt(e.target.value))}
              >
                <option value={0}>No minimum</option>
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
              </select>
              <p className={helpTextClass}>How far in advance guests must book.</p>
            </div>

            <div>
              <label className={labelClass}>Maximum Advance</label>
              <select
                className={selectClass}
                value={settings.max_advance_booking_days}
                onChange={(e) => updateField('max_advance_booking_days', parseInt(e.target.value))}
              >
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>1 month</option>
                <option value={60}>2 months</option>
                <option value={90}>3 months</option>
              </select>
              <p className={helpTextClass}>How far ahead guests can make reservations.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guest Requirements */}
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle>Guest Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-secondary -mt-2 mb-4">
            What information is required when booking.
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_email}
                onChange={(e) => updateField('require_email', e.target.checked)}
                className="w-4 h-4 rounded border-[color:var(--color-structure)] text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="text-sm font-medium">Require email address</span>
                <p className={helpTextClass}>Guests must provide an email to complete booking.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_phone}
                onChange={(e) => updateField('require_phone', e.target.checked)}
                className="w-4 h-4 rounded border-[color:var(--color-structure)] text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="text-sm font-medium">Require phone number</span>
                <p className={helpTextClass}>Guests must provide a phone number to complete booking.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_walk_ins}
                onChange={(e) => updateField('allow_walk_ins', e.target.checked)}
                className="w-4 h-4 rounded border-[color:var(--color-structure)] text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="text-sm font-medium">Allow walk-ins</span>
                <p className={helpTextClass}>Enable quick walk-in seating from the dashboard.</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Message */}
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle>Confirmation Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-ink-secondary -mt-2 mb-4">
            Custom message shown to guests after booking.
          </p>

          <div>
            <label className={labelClass}>Message Template</label>
            <textarea
              className={textareaClass}
              value={settings.confirmation_message_template ?? ''}
              onChange={(e) => updateField('confirmation_message_template', e.target.value || null)}
              placeholder="Thanks for booking! We can't wait to host your game night. Please arrive 5 minutes early."
              rows={4}
            />
            <p className={helpTextClass}>
              Leave empty to use the default confirmation message.
            </p>
          </div>
        </CardContent>
      </Card>

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
        <Button onClick={handleSave} disabled={isSaving}>
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
