'use client';

import { useState, useEffect, useRef, useCallback, ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';
import { format, addDays, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import {
  ChevronUp,
  ChevronDown,
  Users,
  Gamepad2,
  MoreHorizontal,
  Check,
  UserCheck,
  X,
  Filter,
  Calendar,
  Download,
  Search,
} from '@/components/icons';
import { cn } from '@/lib/utils';
import type { BookingWithDetails, BookingStatus, VenueTable } from '@/lib/db/types';

// =============================================================================
// Types
// =============================================================================

interface BookingsListProps {
  venueId: string;
  venueTables?: VenueTable[];
  onBookingClick: (booking: BookingWithDetails) => void;
  onAction: (action: string, bookingId: string) => Promise<void>;
}

type SortField = 'date' | 'guest' | 'status' | 'table';
type SortDir = 'asc' | 'desc';
type QuickFilter = 'today' | 'this_week' | 'this_month' | 'all_future' | 'historical';

const ALL_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'arrived',
  'seated',
  'completed',
  'no_show',
  'cancelled_by_guest',
  'cancelled_by_venue',
];

const ACTIVE_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'arrived',
  'seated',
];

// =============================================================================
// Helper Functions
// =============================================================================

function getDateRangeForQuickFilter(filter: QuickFilter): { startDate?: string; endDate?: string; includeHistorical: boolean } {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const yesterdayStr = format(addDays(today, -1), 'yyyy-MM-dd');

  switch (filter) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr, includeHistorical: false };
    case 'this_week':
      return { startDate: todayStr, endDate: format(addDays(today, 7), 'yyyy-MM-dd'), includeHistorical: false };
    case 'this_month':
      return { startDate: todayStr, endDate: format(endOfMonth(today), 'yyyy-MM-dd'), includeHistorical: false };
    case 'all_future':
      return { startDate: todayStr, endDate: undefined, includeHistorical: false };
    case 'historical':
      return { startDate: undefined, endDate: yesterdayStr, includeHistorical: true };
    default:
      return { startDate: todayStr, endDate: format(addDays(today, 7), 'yyyy-MM-dd'), includeHistorical: false };
  }
}

function getQuickFilterLabel(filter: QuickFilter): string {
  switch (filter) {
    case 'today': return 'Today';
    case 'this_week': return 'This Week';
    case 'this_month': return 'This Month';
    case 'all_future': return 'All Future';
    case 'historical': return 'Historical';
    default: return '';
  }
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes}${ampm}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const currentYear = today.getFullYear();
  const dateYear = date.getFullYear();

  if (dateYear === currentYear) {
    return format(date, 'MMM d');
  }
  return format(date, 'MMM d, yyyy');
}

// =============================================================================
// StatusFilterDropdown Component
// =============================================================================

interface StatusFilterDropdownProps {
  value: BookingStatus[];
  onChange: (statuses: BookingStatus[]) => void;
}

function StatusFilterDropdown({ value, onChange }: StatusFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleStatus = (status: BookingStatus) => {
    if (value.includes(status)) {
      onChange(value.filter(s => s !== status));
    } else {
      onChange([...value, status]);
    }
  };

  const selectAll = () => onChange([]);
  const selectActive = () => onChange(ACTIVE_STATUSES);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn('h-8', value.length > 0 && 'text-teal-600')}
      >
        <Filter className="w-4 h-4 mr-1" />
        {value.length === 0 ? 'All Statuses' : `${value.length} selected`}
        <ChevronDown className="w-4 h-4 ml-1" />
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg border border-stone-200 shadow-lg z-20">
          <div className="p-2 border-b border-stone-100">
            <button
              className="w-full text-left px-2 py-1 text-xs text-stone-500 hover:text-stone-700"
              onClick={selectAll}
            >
              Show All
            </button>
            <button
              className="w-full text-left px-2 py-1 text-xs text-stone-500 hover:text-stone-700"
              onClick={selectActive}
            >
              Active Only
            </button>
          </div>
          <div className="p-2 max-h-64 overflow-y-auto">
            {ALL_STATUSES.map(status => (
              <label
                key={status}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-stone-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value.length === 0 || value.includes(status)}
                  onChange={() => toggleStatus(status)}
                  className="w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                />
                <StatusBadge status={status} />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TableFilterDropdown Component
// =============================================================================

interface TableFilterDropdownProps {
  value: string | null;
  onChange: (tableId: string | null) => void;
  tables: VenueTable[];
}

function TableFilterDropdown({ value, onChange, tables }: TableFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTable = tables.find(t => t.id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn('h-8', value && 'text-teal-600')}
      >
        {value ? selectedTable?.label || 'Table' : 'All Tables'}
        <ChevronDown className="w-4 h-4 ml-1" />
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-lg border border-stone-200 shadow-lg z-20">
          <div className="p-1 max-h-64 overflow-y-auto">
            <button
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded hover:bg-stone-50',
                !value && 'bg-stone-100 font-medium'
              )}
              onClick={() => { onChange(null); setIsOpen(false); }}
            >
              All Tables
            </button>
            {tables.map(table => (
              <button
                key={table.id}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm rounded hover:bg-stone-50',
                  value === table.id && 'bg-stone-100 font-medium'
                )}
                onClick={() => { onChange(table.id); setIsOpen(false); }}
              >
                {table.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ActionDropdown Component
// =============================================================================

interface ActionDropdownProps {
  booking: BookingWithDetails;
  onAction: (action: string, bookingId: string) => Promise<void>;
}

function ActionDropdown({ booking, onAction }: ActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (action: string) => {
    setIsLoading(true);
    try {
      await onAction(action, booking.id);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const showArriveOption = booking.status === 'confirmed';
  const showSeatOption = booking.status === 'confirmed' || booking.status === 'arrived';
  const showCancelOption = ['pending', 'confirmed', 'arrived'].includes(booking.status);

  if (!showArriveOption && !showSeatOption && !showCancelOption) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <MoreHorizontal className="w-4 h-4" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg border border-stone-200 shadow-lg z-20">
          <div className="py-1">
            {showArriveOption && (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                onClick={() => handleAction('arrive')}
              >
                <UserCheck className="w-4 h-4" /> Mark Arrived
              </button>
            )}
            {showSeatOption && (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                onClick={() => handleAction('seat')}
              >
                <Check className="w-4 h-4" /> Seat Party
              </button>
            )}
            {showCancelOption && (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={() => handleAction('cancel')}
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Checkbox Component
// =============================================================================

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

function Checkbox({ checked, indeterminate, onCheckedChange, className }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate || false;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onCheckedChange(e.target.checked)}
      className={cn(
        'w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500 cursor-pointer',
        className
      )}
    />
  );
}

// =============================================================================
// QuickFilterBar Component
// =============================================================================

interface QuickFilterBarProps {
  value: QuickFilter;
  onChange: (filter: QuickFilter) => void;
}

function QuickFilterBar({ value, onChange }: QuickFilterBarProps) {
  const futureFilters: QuickFilter[] = ['today', 'this_week', 'this_month', 'all_future'];

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        {futureFilters.map((filter) => (
          <Button
            key={filter}
            variant={value === filter ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(filter)}
            className={cn(
              'h-8',
              value === filter
                ? 'bg-stone-900 text-white hover:bg-stone-800'
                : 'text-stone-600 hover:text-stone-900'
            )}
          >
            {getQuickFilterLabel(filter)}
          </Button>
        ))}
      </div>
      <Button
        variant={value === 'historical' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('historical')}
        className={cn(
          'h-8',
          value === 'historical'
            ? 'bg-stone-900 text-white hover:bg-stone-800'
            : 'text-stone-500 border-stone-200'
        )}
      >
        Historical
      </Button>
    </div>
  );
}

// =============================================================================
// BookingsList Component
// =============================================================================

export function BookingsList({
  venueId,
  venueTables = [],
  onBookingClick,
  onAction,
}: BookingsListProps) {
  // State
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('this_week');
  const [statusFilter, setStatusFilter] = useState<BookingStatus[]>([]);
  const [tableFilter, setTableFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Refs
  const sentinelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build query params
  const buildQueryParams = useCallback((cursor?: string) => {
    const { startDate, endDate, includeHistorical } = getDateRangeForQuickFilter(quickFilter);
    const params = new URLSearchParams();
    params.set('venueId', venueId);

    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (includeHistorical) params.set('includeHistorical', 'true');
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
    if (tableFilter) params.set('tableId', tableFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);

    // Map sort field
    const sortFieldMap: Record<SortField, string> = {
      date: 'booking_date',
      guest: 'guest_name',
      status: 'status',
      table: 'booking_date', // No direct table sort, fallback to date
    };
    params.set('sortField', sortFieldMap[sortField]);
    params.set('sortDir', sortDir);
    params.set('limit', '25');

    if (cursor) params.set('cursor', cursor);

    return params.toString();
  }, [venueId, quickFilter, statusFilter, tableFilter, debouncedSearch, sortField, sortDir]);

  // Fetch bookings (initial or filter change)
  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setSelectedIds(new Set());
    try {
      const response = await fetch(`/api/bookings?${buildQueryParams()}`);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(data.bookings || []);
      setNextCursor(data.nextCursor);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setBookings([]);
      setNextCursor(null);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryParams]);

  // Load more bookings (infinite scroll)
  const loadMoreBookings = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/bookings?${buildQueryParams(nextCursor)}`);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(prev => [...prev, ...(data.bookings || [])]);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error('Failed to load more bookings:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [buildQueryParams, nextCursor, isLoadingMore]);

  // Initial load and filter changes
  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Scroll to top when filters change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [quickFilter, statusFilter, tableFilter, debouncedSearch]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoadingMore) {
          loadMoreBookings();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, isLoadingMore, loadMoreBookings]);

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d: SortDir) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === bookings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bookings.map(b => b.id)));
    }
  };

  // Bulk cancel handler
  const handleBulkCancel = async () => {
    const ids: string[] = Array.from(selectedIds);
    for (const id of ids) {
      await onAction('cancel', id);
    }
    setSelectedIds(new Set<string>());
    loadBookings();
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter([]);
    setTableFilter(null);
    setSearchQuery('');
    setQuickFilter('this_week');
  };

  // Check if filters are active
  const hasActiveFilters = statusFilter.length > 0 || tableFilter !== null || debouncedSearch !== '';

  // Export CSV
  const handleExport = () => {
    const params = buildQueryParams();
    window.open(`/api/bookings/export?${params}`, '_blank');
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    );
  };

  // Empty state message
  const getEmptyMessage = () => {
    if (hasActiveFilters) {
      return 'No bookings match your filters';
    }
    switch (quickFilter) {
      case 'today':
        return 'No bookings for today';
      case 'this_week':
        return 'No bookings this week';
      case 'this_month':
        return 'No bookings this month';
      case 'all_future':
        return 'No upcoming bookings';
      case 'historical':
        return 'No historical bookings';
      default:
        return 'No bookings found';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Quick Filter Bar */}
      <div className="px-4 py-3 border-b bg-white">
        <QuickFilterBar value={quickFilter} onChange={setQuickFilter} />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-stone-50">
        <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />

        {venueTables.length > 0 && (
          <TableFilterDropdown
            value={tableFilter}
            onChange={setTableFilter}
            tables={venueTables}
          />
        )}

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search guest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-stone-500"
          >
            Clear filters
          </Button>
        )}

        {/* Export Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="h-8 ml-auto"
          disabled={bookings.length === 0}
        >
          <Download className="w-4 h-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-teal-50 border-b border-teal-100">
          <span className="text-sm font-medium text-teal-800">
            {selectedIds.size} selected
          </span>
          <Button size="sm" variant="secondary" onClick={handleBulkCancel}>
            Cancel Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear Selection
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto" ref={containerRef}>
        <table className="min-w-full">
          <thead className="bg-stone-50 sticky top-0">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <Checkbox
                  checked={selectedIds.size === bookings.length && bookings.length > 0}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < bookings.length}
                  onCheckedChange={selectAll}
                />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider cursor-pointer hover:text-stone-700"
                onClick={() => toggleSort('date')}
              >
                Date <SortIndicator field="date" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Time
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider cursor-pointer hover:text-stone-700"
                onClick={() => toggleSort('table')}
              >
                Table <SortIndicator field="table" />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider cursor-pointer hover:text-stone-700"
                onClick={() => toggleSort('guest')}
              >
                Guest <SortIndicator field="guest" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Party
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider cursor-pointer hover:text-stone-700"
                onClick={() => toggleSort('status')}
              >
                Status <SortIndicator field="status" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Game
              </th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={9} className="px-4 py-3">
                    <div className="animate-pulse flex items-center gap-4">
                      <div className="w-4 h-4 bg-stone-200 rounded" />
                      <div className="h-4 bg-stone-200 rounded w-16" />
                      <div className="h-4 bg-stone-200 rounded w-14" />
                      <div className="h-4 bg-stone-200 rounded w-16" />
                      <div className="h-4 bg-stone-200 rounded w-32" />
                      <div className="h-4 bg-stone-200 rounded w-8" />
                      <div className="h-4 bg-stone-200 rounded w-20" />
                      <div className="h-4 bg-stone-200 rounded w-24" />
                    </div>
                  </td>
                </tr>
              ))
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                  <p className="font-medium text-stone-900 mb-1">No bookings</p>
                  <p className="text-sm text-stone-500">{getEmptyMessage()}</p>
                  {hasActiveFilters && (
                    <Button
                      variant="link"
                      onClick={clearFilters}
                      className="mt-2 text-teal-600"
                    >
                      Clear all filters
                    </Button>
                  )}
                </td>
              </tr>
            ) : (
              bookings.map(booking => (
                <tr
                  key={booking.id}
                  className="cursor-pointer hover:bg-stone-50 transition-colors"
                  onClick={() => onBookingClick(booking)}
                >
                  <td
                    className="px-4 py-3"
                    onClick={(e: ReactMouseEvent<HTMLTableCellElement>) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedIds.has(booking.id)}
                      onCheckedChange={() => toggleSelect(booking.id)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-700">
                    {formatDate(booking.booking_date)}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-stone-900">
                    {formatTime(booking.start_time)}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-700">
                    {booking.venue_table?.label || '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-stone-900">
                    {booking.guest_name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-stone-600">
                      <Users className="w-3 h-3 text-stone-400" />
                      {booking.party_size}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-3">
                    {booking.game ? (
                      <div className="flex items-center gap-1 text-sm text-sky-600">
                        <Gamepad2 className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{booking.game.title}</span>
                      </div>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e: ReactMouseEvent<HTMLTableCellElement>) => e.stopPropagation()}
                  >
                    <ActionDropdown booking={booking} onAction={onAction} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4 text-stone-500">
            <span className="inline-block w-5 h-5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mr-2" />
            Loading more...
          </div>
        )}

        {/* End of list indicator */}
        {!isLoading && bookings.length > 0 && !nextCursor && (
          <div className="text-center py-4 text-sm text-stone-400">
            No more bookings
          </div>
        )}
      </div>

      {/* Footer with count */}
      {!isLoading && (
        <div className="px-4 py-2 border-t bg-stone-50 text-xs text-stone-500 flex items-center justify-between">
          <span>
            Showing {bookings.length} of {totalCount} booking{totalCount !== 1 ? 's' : ''}
            {hasActiveFilters && ' (filtered)'}
          </span>
        </div>
      )}
    </div>
  );
}
