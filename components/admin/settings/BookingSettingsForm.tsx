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
        bookings_enabled: settings.bookings_enabled,
        buffer_minutes: settings.buffer_minutes,
        default_duration_minutes: settings.default_duration_minutes,
        min_advance_hours: settings.min_advance_hours,
        max_advance_days: settings.max_advance_days,
        no_show_grace_minutes: settings.no_show_grace_minutes,
        deposit_required: settings.deposit_required,
        deposit_amount_cents: settings.deposit_amount_cents,
        send_confirmation_email: settings.send_confirmation_email,
        send_reminder_sms: settings.send_reminder_sms,
        reminder_hours_before: settings.reminder_hours_before,
        booking_page_message: settings.booking_page_message,
        // Venue address fields
        venue_address_street: settings.venue_address_street,
        venue_address_city: settings.venue_address_city,
        venue_address_state: settings.venue_address_state,
        venue_address_postal_code: settings.venue_address_postal_code,
        venue_address_country: settings.venue_address_country,
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
  const inputClass = "w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring placeholder:text-[color:var(--color-ink-secondary)]";
  const textareaClass = "w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring placeholder:text-[color:var(--color-ink-secondary)] resize-none";
  const helpTextClass = "text-xs text-ink-secondary mt-1";

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Bookings Enabled */}
      <Card className="panel-surface">
        <CardContent className="py-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium">Accept Online Bookings</span>
              <p className={helpTextClass}>When disabled, the public booking page will show a message that bookings are unavailable.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.bookings_enabled}
              onChange={(e) => updateField('bookings_enabled', e.target.checked)}
              className="w-5 h-5 rounded border-[color:var(--color-structure)] text-teal-600 focus:ring-teal-500"
            />
          </label>
        </CardContent>
      </Card>

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
                value={settings.buffer_minutes}
                onChange={(e) => updateField('buffer_minutes', parseInt(e.target.value))}
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
            <label className={labelClass}>No-Show Grace Period</label>
            <select
              className={selectClass}
              value={settings.no_show_grace_minutes}
              onChange={(e) => updateField('no_show_grace_minutes', parseInt(e.target.value))}
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
            <p className={helpTextClass}>How long to wait before marking a booking as no-show.</p>
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
                value={settings.min_advance_hours}
                onChange={(e) => updateField('min_advance_hours', parseInt(e.target.value))}
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
                value={settings.max_advance_days}
                onChange={(e) => updateField('max_advance_days', parseInt(e.target.value))}
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

      {/* Notifications */}
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-secondary -mt-2 mb-4">
            Configure how guests receive booking notifications.
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.send_confirmation_email}
                onChange={(e) => updateField('send_confirmation_email', e.target.checked)}
                className="w-4 h-4 rounded border-[color:var(--color-structure)] text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="text-sm font-medium">Send confirmation email</span>
                <p className={helpTextClass}>Automatically email guests when their booking is confirmed.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.send_reminder_sms}
                onChange={(e) => updateField('send_reminder_sms', e.target.checked)}
                className="w-4 h-4 rounded border-[color:var(--color-structure)] text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="text-sm font-medium">Send SMS reminders</span>
                <p className={helpTextClass}>Text guests before their booking.</p>
              </div>
            </label>

            <div>
              <label className={labelClass}>Reminder Time</label>
              <select
                className={selectClass}
                value={settings.reminder_hours_before}
                onChange={(e) => updateField('reminder_hours_before', parseInt(e.target.value))}
              >
                <option value={1}>1 hour before</option>
                <option value={2}>2 hours before</option>
                <option value={4}>4 hours before</option>
                <option value={24}>24 hours before</option>
              </select>
              <p className={helpTextClass}>When to send booking reminders.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposits */}
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle>Deposits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-secondary -mt-2 mb-4">
            Require deposits for bookings.
          </p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.deposit_required}
              onChange={(e) => updateField('deposit_required', e.target.checked)}
              className="w-4 h-4 rounded border-[color:var(--color-structure)] text-teal-600 focus:ring-teal-500"
            />
            <div>
              <span className="text-sm font-medium">Require deposit</span>
              <p className={helpTextClass}>Guests must pay a deposit to confirm booking.</p>
            </div>
          </label>

          {settings.deposit_required && (
            <div>
              <label className={labelClass}>Deposit Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary">$</span>
                <input
                  type="number"
                  className={`${selectClass} pl-7`}
                  value={settings.deposit_amount_cents / 100}
                  onChange={(e) => updateField('deposit_amount_cents', Math.round(parseFloat(e.target.value) * 100) || 0)}
                  min={0}
                  step={0.01}
                />
              </div>
              <p className={helpTextClass}>Amount to charge as a deposit.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Page Message */}
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle>Booking Page Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-ink-secondary -mt-2 mb-4">
            Custom message shown to guests on the booking page.
          </p>

          <div>
            <label className={labelClass}>Message</label>
            <textarea
              className={textareaClass}
              value={settings.booking_page_message ?? ''}
              onChange={(e) => updateField('booking_page_message', e.target.value || null)}
              placeholder="Thanks for booking! We can't wait to host your game night. Please arrive 5 minutes early."
              rows={4}
            />
            <p className={helpTextClass}>
              Leave empty to use no custom message.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Venue Location */}
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle>Venue Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-secondary -mt-2 mb-4">
            Your venue address is displayed on booking confirmations with a &quot;Get Directions&quot; link.
          </p>

          <div>
            <label className={labelClass}>Street Address</label>
            <input
              type="text"
              className={inputClass}
              value={settings.venue_address_street ?? ''}
              onChange={(e) => updateField('venue_address_street', e.target.value || null)}
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input
                type="text"
                className={inputClass}
                value={settings.venue_address_city ?? ''}
                onChange={(e) => updateField('venue_address_city', e.target.value || null)}
                placeholder="Philadelphia"
              />
            </div>

            <div>
              <label className={labelClass}>State / Province</label>
              <input
                type="text"
                className={inputClass}
                value={settings.venue_address_state ?? ''}
                onChange={(e) => updateField('venue_address_state', e.target.value || null)}
                placeholder="PA"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Postal Code</label>
              <input
                type="text"
                className={inputClass}
                value={settings.venue_address_postal_code ?? ''}
                onChange={(e) => updateField('venue_address_postal_code', e.target.value || null)}
                placeholder="19103"
              />
            </div>

            <div>
              <label className={labelClass}>Country</label>
              <input
                type="text"
                className={inputClass}
                value={settings.venue_address_country ?? ''}
                onChange={(e) => updateField('venue_address_country', e.target.value || null)}
                placeholder="US"
              />
              <p className={helpTextClass}>Optional. Defaults to US if left empty.</p>
            </div>
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
