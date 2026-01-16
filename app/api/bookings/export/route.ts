import { NextRequest, NextResponse } from 'next/server';
import { getBookingsForExport } from '@/lib/data/bookings';
import { verifyVenueAccess } from '@/lib/apiAuth';
import type { BookingStatus, BookingWithDetails } from '@/lib/db/types';

/**
 * GET /api/bookings/export
 *
 * Exports bookings as a CSV file with the same filtering as the list view.
 * Returns all matching bookings (no pagination).
 *
 * SECURITY: Requires authentication. User must own the requested venue.
 * This endpoint exports sensitive guest PII and must be protected.
 *
 * Query parameters: Same as /api/bookings
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Required parameter
  const venueId = searchParams.get('venueId');
  if (!venueId) {
    return NextResponse.json(
      { error: 'venueId is required' },
      { status: 400 }
    );
  }

  // Verify authentication and venue ownership
  // Critical: This endpoint exports PII, must be protected
  const auth = await verifyVenueAccess(venueId);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  // Parse optional parameters
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const tableId = searchParams.get('tableId') || undefined;
  const search = searchParams.get('search') || undefined;
  const includeHistorical = searchParams.get('includeHistorical') === 'true';

  // Parse status array
  const statusParam = searchParams.get('status');
  const status: BookingStatus[] | undefined = statusParam
    ? (statusParam.split(',') as BookingStatus[])
    : undefined;

  // Parse sort parameters
  const sortFieldParam = searchParams.get('sortField');
  const validSortFields = ['booking_date', 'start_time', 'guest_name', 'status', 'created_at'];
  const sortField = sortFieldParam && validSortFields.includes(sortFieldParam)
    ? (sortFieldParam as 'booking_date' | 'start_time' | 'guest_name' | 'status' | 'created_at')
    : 'booking_date';

  const sortDirParam = searchParams.get('sortDir');
  const sortDir: 'asc' | 'desc' = sortDirParam === 'asc' ? 'asc' : 'desc';

  try {
    const bookings = await getBookingsForExport({
      venueId,
      startDate,
      endDate,
      status,
      tableId,
      search,
      includeHistorical,
      sortField,
      sortDir,
    });

    // Generate CSV content
    const csv = generateCSV(bookings);

    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0];
    const filename = `bookings-export-${today}.csv`;

    // Return CSV as downloadable file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting bookings:', error);
    return NextResponse.json(
      { error: 'Failed to export bookings' },
      { status: 500 }
    );
  }
}

/**
 * Generates CSV content from bookings data.
 */
function generateCSV(bookings: BookingWithDetails[]): string {
  // CSV headers
  const headers = [
    'Date',
    'Time',
    'End Time',
    'Table',
    'Guest Name',
    'Guest Email',
    'Guest Phone',
    'Party Size',
    'Status',
    'Game',
    'Notes',
    'Source',
    'Created At',
  ];

  // CSV rows
  const rows = bookings.map((booking) => [
    booking.booking_date,
    formatTime(booking.start_time),
    formatTime(booking.end_time),
    booking.venue_table?.label || '',
    escapeCSV(booking.guest_name),
    booking.guest_email || '',
    booking.guest_phone || '',
    booking.party_size.toString(),
    formatStatus(booking.status),
    booking.game?.title || '',
    escapeCSV(booking.notes || ''),
    booking.source,
    formatDateTime(booking.created_at),
  ]);

  // Combine headers and rows
  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ];

  return csvLines.join('\n');
}

/**
 * Escapes a string value for CSV (handles commas, quotes, newlines).
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Formats time string for display (HH:MM:SS -> H:MM AM/PM).
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Formats ISO datetime for display.
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats booking status for display.
 */
function formatStatus(status: BookingStatus): string {
  const statusMap: Record<BookingStatus, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    arrived: 'Arrived',
    seated: 'Seated',
    completed: 'Completed',
    no_show: 'No Show',
    cancelled_by_guest: 'Cancelled (Guest)',
    cancelled_by_venue: 'Cancelled (Venue)',
  };
  return statusMap[status] || status;
}
