'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Callout } from '@/components/AppShell';
import {
  Building,
  CalendarClock,
  Clock,
  Bell,
  CreditCard,
  MessageSquare,
  Shield,
  Palette,
} from '@/components/icons';
import { OperatingHoursForm, type OperatingHoursInput, type BookingConflict } from './OperatingHoursForm';
import {
  updateVenueOperatingHoursAction,
  checkBookingsOutsideHoursAction,
  updateVenueBookingSettingsAction,
  type OperatingHoursInput as ActionOperatingHoursInput,
} from '@/app/actions/bookings';
import type { VenueBookingSettings, VenueOperatingHours } from '@/lib/db/types';

// =============================================================================
// Types
// =============================================================================

interface UnifiedSettingsClientProps {
  venueId: string;
  venueName: string;
  venueSlug: string;
  settings: VenueBookingSettings;
  operatingHours: VenueOperatingHours[];
}

type SettingsSection =
  | 'venue'
  | 'bookings'
  | 'schedule'
  | 'notifications'
  | 'payments'
  | 'guest-experience'
  | 'account';

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// =============================================================================
// Navigation Configuration
// =============================================================================

const navItems: NavItem[] = [
  {
    id: 'venue',
    label: 'Venue',
    icon: Building,
    description: 'Profile and display settings',
  },
  {
    id: 'bookings',
    label: 'Booking Rules',
    icon: CalendarClock,
    description: 'Timing and advance booking',
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: Clock,
    description: 'Operating hours',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Email and SMS settings',
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: CreditCard,
    description: 'Deposits and charges',
  },
  {
    id: 'guest-experience',
    label: 'Guest Experience',
    icon: MessageSquare,
    description: 'Booking page customization',
  },
  {
    id: 'account',
    label: 'Account',
    icon: Shield,
    description: 'Danger zone',
  },
];

// =============================================================================
// Shared Styles
// =============================================================================

const labelClass = "text-xs uppercase tracking-rulebook text-ink-secondary block mb-1";
const selectClass = "w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring";
const inputClass = "w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring placeholder:text-[color:var(--color-ink-secondary)]";
const textareaClass = "w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring placeholder:text-[color:var(--color-ink-secondary)] resize-none";
const helpTextClass = "text-xs text-ink-secondary mt-1";

// =============================================================================
// Main Component
// =============================================================================

export function UnifiedSettingsClient({
  venueId,
  venueName,
  venueSlug,
  settings: initialSettings,
  operatingHours,
}: UnifiedSettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSection = (searchParams.get('section') as SettingsSection) || 'venue';

  // State for booking settings
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Navigate to section
  const navigateToSection = (section: SettingsSection) => {
    router.push(`/admin/settings?section=${section}`);
  };

  // Update settings field
  const updateField = <K extends keyof VenueBookingSettings>(
    field: K,
    value: VenueBookingSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Save settings
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

  // Operating hours handlers
  const handleSaveOperatingHours = useCallback(
    async (hours: OperatingHoursInput[]) => {
      const result = await updateVenueOperatingHoursAction(
        venueId,
        hours as ActionOperatingHoursInput[]
      );
      return {
        success: result.success,
        error: result.error,
      };
    },
    [venueId]
  );

  const handleCheckConflicts = useCallback(
    async (hours: OperatingHoursInput[]): Promise<BookingConflict[]> => {
      const result = await checkBookingsOutsideHoursAction(
        venueId,
        hours as ActionOperatingHoursInput[]
      );
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    },
    [venueId]
  );

  // Save button component (reused across sections)
  const SaveButton = () => (
    <div className="flex items-center justify-between pt-4 border-t border-[color:var(--color-structure)]">
      <div className="flex items-center gap-3">
        {error && <span className="text-sm text-red-600">{error}</span>}
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
  );

  // Render section content
  const renderSectionContent = () => {
    switch (currentSection) {
      case 'venue':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-1">Venue</h2>
              <p className="text-sm text-stone-500">
                Your venue profile and display settings.
              </p>
            </div>

            {/* Venue Profile */}
            <Card className="panel-surface">
              <CardHeader>
                <CardTitle>Venue Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className={labelClass}>Name</label>
                  <Input defaultValue={venueName} disabled />
                </div>
                <div>
                  <label className={labelClass}>Slug</label>
                  <Input defaultValue={venueSlug} disabled />
                </div>
                <p className="text-xs text-[color:var(--color-ink-secondary)]">
                  Contact support to update your venue profile.
                </p>
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

            {/* Theme Density */}
            <Card className="panel-surface">
              <CardHeader className="flex flex-row items-center gap-2">
                <Palette className="h-4 w-4" />
                <CardTitle>Theme Density</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-ink-secondary">Toggle spacing for quick shift changes.</p>
                <Callout title="Rulebook tip">Use compact mode during peak hours to keep more rows onscreen.</Callout>
                <p className="text-xs text-[color:var(--color-ink-secondary)]">
                  Toggle density using the sidebar control.
                </p>
              </CardContent>
            </Card>

            <SaveButton />
          </div>
        );

      case 'bookings':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-1">Booking Rules</h2>
              <p className="text-sm text-stone-500">
                Configure timing and availability rules for bookings.
              </p>
            </div>

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

            <SaveButton />
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-1">Schedule</h2>
              <p className="text-sm text-stone-500">
                Set when your venue is open for bookings.
              </p>
            </div>

            <OperatingHoursForm
              venueId={venueId}
              initialHours={operatingHours}
              onSave={handleSaveOperatingHours}
              onCheckConflicts={handleCheckConflicts}
            />
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-1">Notifications</h2>
              <p className="text-sm text-stone-500">
                Configure how guests receive booking notifications.
              </p>
            </div>

            <Card className="panel-surface">
              <CardHeader>
                <CardTitle>Guest Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

            <SaveButton />
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-1">Payments</h2>
              <p className="text-sm text-stone-500">
                Configure deposit requirements for bookings.
              </p>
            </div>

            <Card className="panel-surface">
              <CardHeader>
                <CardTitle>Deposits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

            <SaveButton />
          </div>
        );

      case 'guest-experience':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-1">Guest Experience</h2>
              <p className="text-sm text-stone-500">
                Customize the booking page for your guests.
              </p>
            </div>

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

            <SaveButton />
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-1">Account</h2>
              <p className="text-sm text-stone-500">
                Manage your venue account settings.
              </p>
            </div>

            <Card className="panel-surface">
              <CardHeader className="flex flex-row items-center gap-2">
                <Shield className="h-4 w-4" />
                <CardTitle>Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-ink-secondary">Confirm before destructive actions.</p>
                <Button variant="destructive" disabled>Archive venue</Button>
                <p className="text-xs text-[color:var(--color-ink-secondary)]">
                  Contact support to archive your venue.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Navigation Sidebar */}
      <nav className="w-52 flex-shrink-0 border-r border-[color:var(--color-structure)] bg-stone-50/50 p-3 overflow-y-auto">
        <div className="mb-4">
          <h1 className="text-lg font-serif font-semibold text-stone-900">Settings</h1>
          <p className="text-xs text-stone-500">Manage your venue configuration</p>
        </div>

        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => navigateToSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150',
                  isActive
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-orange-600' : '')} />
                <span className={cn('text-sm', isActive ? 'font-semibold' : 'font-medium')}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-2xl px-6 py-6">
          {renderSectionContent()}
        </div>
      </main>
    </div>
  );
}
