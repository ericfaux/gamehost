'use client';

import { Calendar, Users, Clock } from '@/components/icons';
import type { VenueBookingSettings } from '@/lib/db/types';

interface BookingWizardProps {
  venueId: string;
  venueName: string;
  venueSlug: string;
  settings: VenueBookingSettings;
}

/**
 * Multi-step booking wizard for public reservation flow.
 * Currently a placeholder - full implementation coming soon.
 */
export function BookingWizard({ venueName, settings }: BookingWizardProps) {
  return (
    <div className="space-y-6">
      {/* Wizard Steps Preview */}
      <div className="bg-white rounded-lg border border-stone-200 p-6">
        <h2 className="text-lg font-serif font-semibold text-stone-900 mb-4">
          Reserve Your Table
        </h2>

        <div className="space-y-4">
          {/* Step indicators */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-teal-600">
              <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium">Date & Time</span>
            </div>
            <div className="h-px flex-1 bg-stone-200" />
            <div className="flex items-center gap-2 text-stone-400">
              <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span>Party Size</span>
            </div>
            <div className="h-px flex-1 bg-stone-200" />
            <div className="flex items-center gap-2 text-stone-400">
              <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span>Details</span>
            </div>
          </div>

          {/* Placeholder content */}
          <div className="mt-6 p-8 bg-stone-50 rounded-lg border border-dashed border-stone-300 text-center">
            <p className="text-stone-500">
              Booking wizard coming soon for {venueName}
            </p>
            <p className="text-sm text-stone-400 mt-2">
              Default booking duration: {settings.default_duration_minutes} minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
