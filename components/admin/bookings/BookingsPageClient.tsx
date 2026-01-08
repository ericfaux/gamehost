'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Timeline } from './Timeline';
import { BookingDetailDrawer } from './BookingDetailDrawer';
import { CreateBookingModal } from './CreateBookingModal';
import { BookingsList } from './BookingsList';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, List, LayoutGrid, Clock, Users, Check, UserCheck, Copy, ExternalLink } from '@/components/icons';
import { seatParty, markArrived, cancelBooking } from '@/app/actions/bookings';
import { cn } from '@/lib/utils';
import type { VenueBookingSettings, TimelineBlock, BookingWithDetails, BookingStatus } from '@/lib/db/types';
import type { TimelineViewMode } from '@/lib/data/timeline';

// =============================================================================
// Types
// =============================================================================

interface BookingsPageClientProps {
  venueId: string;
  venueName: string;
  venueSlug: string;
  settings: VenueBookingSettings;
}

interface ArrivalsEntry {
  id: string;
  guest_name: string;
  party_size: number;
  start_time: string;
  status: BookingStatus;
  table_label: string;
  arrived_at?: string | null;
}

// =============================================================================
// ArrivalsBoard Component
// =============================================================================

interface ArrivalsBoardProps {
  venueId: string;
  onSeatParty: (bookingId: string) => Promise<void>;
}

function ArrivalsBoard({ venueId, onSeatParty }: ArrivalsBoardProps) {
  const [arrivals, setArrivals] = useState<ArrivalsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seatingId, setSeatingId] = useState<string | null>(null);

  // Fetch upcoming arrivals
  useEffect(() => {
    let cancelled = false;

    async function fetchArrivals() {
      try {
        const response = await fetch(`/api/venues/${venueId}/arrivals`);
        if (!response.ok) throw new Error('Failed to fetch arrivals');
        const data = await response.json();
        if (!cancelled) {
          setArrivals(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch arrivals:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchArrivals();
    // Refresh every 30 seconds
    const interval = setInterval(fetchArrivals, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [venueId]);

  const handleSeat = async (bookingId: string) => {
    setSeatingId(bookingId);
    try {
      await onSeatParty(bookingId);
      // Remove from local list
      setArrivals((prev) => prev.filter((a) => a.id !== bookingId));
    } finally {
      setSeatingId(null);
    }
  };

  const formatTime = (time: string) => {
    // Handle HH:MM:SS or HH:MM format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes}${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <h3 className="font-serif font-semibold text-stone-900 mb-4">Arrivals</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-stone-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const upcomingArrivals = arrivals.filter(
    (a) => a.status === 'confirmed' || a.status === 'arrived'
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif font-semibold text-stone-900">Arrivals</h3>
        <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
          {upcomingArrivals.length} upcoming
        </span>
      </div>

      {upcomingArrivals.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-10 h-10 mx-auto text-stone-300 mb-2" />
          <p className="text-sm text-stone-500">No upcoming arrivals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingArrivals.map((arrival) => (
            <div
              key={arrival.id}
              className={cn(
                'bg-white rounded-lg border p-3 transition-colors',
                arrival.status === 'arrived'
                  ? 'border-teal-200 bg-teal-50/50'
                  : 'border-stone-200'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-stone-900 text-sm">
                    {arrival.guest_name}
                  </p>
                  <p className="text-xs text-stone-500">
                    {arrival.table_label} &middot; {arrival.party_size} guests
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-stone-700">
                    {formatTime(arrival.start_time)}
                  </p>
                  {arrival.status === 'arrived' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">
                      <Check className="w-3 h-3" />
                      Arrived
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant={arrival.status === 'arrived' ? 'primary' : 'secondary'}
                className="w-full"
                onClick={() => handleSeat(arrival.id)}
                disabled={seatingId === arrival.id}
              >
                {seatingId === arrival.id ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Seating...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    Seat Party
                  </span>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BookingsDisabledState Component
// =============================================================================

function BookingsDisabledState({ venueId }: { venueId: string }) {
  return (
    <div className="max-w-md mx-auto text-center py-12">
      <Calendar className="w-12 h-12 mx-auto text-stone-300 mb-4" />
      <h2 className="text-lg font-semibold mb-2">Bookings Not Enabled</h2>
      <p className="text-stone-500 mb-6">
        Enable the booking system to start accepting reservations.
      </p>
      <Link href="/admin/settings">
        <Button>Enable Bookings</Button>
      </Link>
    </div>
  );
}

// =============================================================================
// Main BookingsPageClient Component
// =============================================================================

export function BookingsPageClient({
  venueId,
  venueName,
  venueSlug,
  settings,
}: BookingsPageClientProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [timelineViewMode, setTimelineViewMode] = useState<TimelineViewMode>('day');
  const [refreshKey, setRefreshKey] = useState(0);

  // Public booking link state
  const [origin, setOrigin] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [htmlCopied, setHtmlCopied] = useState(false);

  // Compute origin on client to avoid SSR/hydration mismatch
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const relativePath = `/v/${venueSlug}/book`;
  const fullUrl = origin ? `${origin}${relativePath}` : relativePath;
  // Copy to clipboard with fallback
  const copyToClipboard = useCallback(async (text: string, type: 'link' | 'html') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      if (type === 'link') {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } else {
        setHtmlCopied(true);
        setTimeout(() => setHtmlCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleBlockClick = useCallback((block: TimelineBlock) => {
    if (block.booking_id) {
      setSelectedBookingId(block.booking_id);
    }
  }, []);

  const handleBlockAction = useCallback(
    async (action: string, bookingId: string) => {
      switch (action) {
        case 'seat':
          await seatParty(bookingId);
          break;
        case 'arrive':
          await markArrived(bookingId);
          break;
        case 'cancel':
          await cancelBooking({ bookingId, cancelledBy: 'venue' });
          break;
      }
      refresh();
      setSelectedBookingId(null);
    },
    [refresh]
  );

  const handleSeatParty = useCallback(
    async (bookingId: string) => {
      await seatParty(bookingId);
      refresh();
    },
    [refresh]
  );

  const handleBookingClick = useCallback((booking: BookingWithDetails) => {
    setSelectedBookingId(booking.id);
  }, []);

  // Note: If settings exist, bookings are enabled
  // The BookingsDisabledState can be shown if a `bookings_enabled` field is added later

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-stone-50">
        <div>
          <h1 className="text-xl font-serif font-semibold text-stone-900">
            Bookings
          </h1>
          <p className="text-sm text-stone-500">{venueName}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-stone-200 p-0.5">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'timeline'
                  ? 'bg-stone-100 text-stone-900'
                  : 'text-stone-500 hover:text-stone-700'
              )}
              title="Timeline view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'list'
                  ? 'bg-stone-100 text-stone-900'
                  : 'text-stone-500 hover:text-stone-700'
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Public Booking Link Panel */}
      <div className="px-6 py-4 border-b bg-stone-50">
        <div className="max-w-4xl">
          <h2 className="text-sm font-semibold text-stone-900 mb-1">
            Public booking link
          </h2>
          <p className="text-xs text-stone-600 mb-3">
            Add this link to your website, Google Business Profile, and social channels to direct guests to online reservations.
          </p>

          {/* URL + Actions */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              readOnly
              value={fullUrl}
              className="flex-1 px-3 py-2 text-sm font-mono bg-white border border-stone-200 rounded-lg text-stone-700 select-all focus:outline-none focus:ring-2 focus:ring-stone-300"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copyToClipboard(fullUrl, 'link')}
                className="min-w-[100px]"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy link
                  </>
                )}
              </Button>
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-[color:var(--color-elevated)] text-[color:var(--color-ink-primary)] border border-[color:var(--color-structure)] shadow-card hover:-translate-y-0.5 rounded-token transition-transform duration-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </a>
            </div>
          </div>

          {/* Screen reader announcement for copy status */}
          <div role="status" aria-live="polite" className="sr-only">
            {linkCopied && 'Link copied to clipboard'}
            {htmlCopied && 'HTML snippet copied to clipboard'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline / List View */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'timeline' ? (
            <Timeline
              key={refreshKey}
              venueId={venueId}
              initialDate={selectedDate}
              onDateChange={setSelectedDate}
              onBlockClick={handleBlockClick}
              viewMode={timelineViewMode}
              onViewModeChange={setTimelineViewMode}
            />
          ) : (
            <BookingsList
              venueId={venueId}
              date={selectedDate}
              onDateChange={setSelectedDate}
              onBookingClick={handleBookingClick}
              onAction={handleBlockAction}
            />
          )}
        </div>

        {/* Arrivals Sidebar (on larger screens) */}
        <div className="hidden xl:block w-80 border-l bg-stone-50 overflow-y-auto">
          <ArrivalsBoard
            key={`arrivals-${refreshKey}`}
            venueId={venueId}
            onSeatParty={handleSeatParty}
          />
        </div>
      </div>

      {/* Modals & Drawers */}
      <BookingDetailDrawer
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
        onAction={handleBlockAction}
      />

      <CreateBookingModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        venueId={venueId}
        preselectedDate={format(selectedDate, 'yyyy-MM-dd')}
        onSuccess={refresh}
      />
    </div>
  );
}
