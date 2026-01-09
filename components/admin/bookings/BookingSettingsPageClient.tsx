'use client';

import { useCallback } from 'react';
import { BookingSettingsForm } from '@/components/admin/settings/BookingSettingsForm';
import { OperatingHoursForm, type OperatingHoursInput, type BookingConflict } from '@/components/admin/settings/OperatingHoursForm';
import {
  updateVenueOperatingHoursAction,
  checkBookingsOutsideHoursAction,
  type OperatingHoursInput as ActionOperatingHoursInput,
} from '@/app/actions/bookings';
import type { VenueBookingSettings, VenueOperatingHours } from '@/lib/db/types';

// =============================================================================
// Types
// =============================================================================

interface BookingSettingsPageClientProps {
  venueId: string;
  settings: VenueBookingSettings;
  operatingHours: VenueOperatingHours[];
}

// =============================================================================
// Component
// =============================================================================

export function BookingSettingsPageClient({
  venueId,
  settings,
  operatingHours,
}: BookingSettingsPageClientProps) {
  // Handler for saving operating hours
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

  // Handler for checking conflicts before saving operating hours
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-serif font-semibold text-stone-900 mb-2">
            Booking Settings
          </h1>
          <p className="text-stone-600">
            Configure how guests can book tables at your venue.
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* General Booking Settings */}
          <section>
            <h2 className="text-lg font-semibold text-stone-900 mb-4">
              General Settings
            </h2>
            <BookingSettingsForm
              venueId={venueId}
              initialSettings={settings}
            />
          </section>

          {/* Operating Hours */}
          <section className="pt-8 border-t border-stone-200">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">
              Operating Hours
            </h2>
            <OperatingHoursForm
              venueId={venueId}
              initialHours={operatingHours}
              onSave={handleSaveOperatingHours}
              onCheckConflicts={handleCheckConflicts}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
