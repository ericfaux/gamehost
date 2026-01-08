import { NextRequest, NextResponse } from 'next/server';
import { getBookingsWithFilters, type BookingListFilters } from '@/lib/data/bookings';
import type { BookingStatus } from '@/lib/db/types';

/**
 * GET /api/bookings
 *
 * Fetches bookings with filtering, sorting, and cursor-based pagination.
 * Used by the BookingsList component for the list view.
 *
 * Query parameters:
 * - venueId (required): Venue UUID
 * - startDate: Start of date range (YYYY-MM-DD)
 * - endDate: End of date range (YYYY-MM-DD)
 * - status: Comma-separated list of statuses to filter
 * - tableId: Filter by specific table
 * - search: Guest name search (partial, case-insensitive)
 * - includeHistorical: Include past bookings (default: false)
 * - sortField: booking_date | start_time | guest_name | status | created_at
 * - sortDir: asc | desc (default: desc)
 * - cursor: Booking ID for pagination
 * - limit: Number of results (default: 25, max: 100)
 *
 * Response:
 * {
 *   bookings: BookingWithDetails[],
 *   nextCursor: string | null,
 *   totalCount: number
 * }
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

  // Parse optional parameters
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const tableId = searchParams.get('tableId') || undefined;
  const search = searchParams.get('search') || undefined;
  const cursor = searchParams.get('cursor') || undefined;

  // Parse boolean
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
    ? (sortFieldParam as BookingListFilters['sortField'])
    : 'booking_date';

  const sortDirParam = searchParams.get('sortDir');
  const sortDir: 'asc' | 'desc' = sortDirParam === 'asc' ? 'asc' : 'desc';

  // Parse limit with max cap
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(1, parseInt(limitParam || '25', 10) || 25), 100);

  try {
    const filters: BookingListFilters = {
      venueId,
      startDate,
      endDate,
      status,
      tableId,
      search,
      includeHistorical,
      sortField,
      sortDir,
      cursor,
      limit,
    };

    const result = await getBookingsWithFilters(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
