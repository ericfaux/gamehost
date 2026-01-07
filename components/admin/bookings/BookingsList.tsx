'use client';

import { useState, useEffect, useRef, useCallback, ChangeEvent, MouseEvent as ReactMouseEvent } from 'react';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import {
  ChevronLeft,
  ChevronRight,
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
} from '@/components/icons';
import { cn } from '@/lib/utils';
import type { BookingWithDetails, BookingStatus } from '@/lib/db/types';

// =============================================================================
// Types
// =============================================================================

interface BookingsListProps {
  venueId: string;
  date: Date;
  onDateChange: (date: Date) => void;
  onBookingClick: (booking: BookingWithDetails) => void;
  onAction: (action: string, bookingId: string) => Promise<void>;
}

type SortField = 'time' | 'guest' | 'status';
type SortDir = 'asc' | 'desc';

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
        className={cn(value.length > 0 && 'text-teal-600')}
      >
        <Filter className="w-4 h-4 mr-1" />
        {value.length === 0 ? 'All Statuses' : `${value.length} selected`}
        <ChevronDown className="w-4 h-4 ml-1" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-stone-200 shadow-lg z-20">
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
// BookingsList Component
// =============================================================================

export function BookingsList({
  venueId,
  date,
  onDateChange,
  onBookingClick,
  onAction,
}: BookingsListProps) {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilter, setStatusFilter] = useState<BookingStatus[]>([]);

  // Fetch bookings
  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(
        `/api/bookings?venueId=${venueId}&date=${dateStr}`
      );
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, date]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Clear selection when date changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [date]);

  // Format time helper
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes}${ampm}`;
  };

  // Filter and sort bookings
  const sortedBookings = [...bookings]
    .filter(b => statusFilter.length === 0 || statusFilter.includes(b.status))
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'time':
          cmp = a.start_time.localeCompare(b.start_time);
          break;
        case 'guest':
          cmp = a.guest_name.localeCompare(b.guest_name);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d: SortDir) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
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
    if (selectedIds.size === sortedBookings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedBookings.map(b => b.id)));
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

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Date Nav Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onDateChange(addDays(date, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            {format(date, 'EEEE, MMMM d')}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => onDateChange(addDays(date, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Status Filter */}
        <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />
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
      <div className="flex-1 overflow-auto">
        <table className="min-w-full">
          <thead className="bg-stone-50 sticky top-0">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <Checkbox
                  checked={selectedIds.size === sortedBookings.length && sortedBookings.length > 0}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < sortedBookings.length}
                  onCheckedChange={selectAll}
                />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider cursor-pointer hover:text-stone-700"
                onClick={() => toggleSort('time')}
              >
                Time <SortIndicator field="time" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Table
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
              <tr>
                <td colSpan={8} className="text-center py-12 text-stone-500">
                  <span className="inline-block w-5 h-5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mr-2" />
                  Loading...
                </td>
              </tr>
            ) : sortedBookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                  <p className="font-medium text-stone-900 mb-1">No bookings</p>
                  <p className="text-sm text-stone-500">
                    No reservations for {format(date, 'MMMM d, yyyy')}
                  </p>
                </td>
              </tr>
            ) : (
              sortedBookings.map(booking => (
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
      </div>

      {/* Footer with count */}
      {!isLoading && sortedBookings.length > 0 && (
        <div className="px-4 py-2 border-t bg-stone-50 text-xs text-stone-500">
          {sortedBookings.length} booking{sortedBookings.length !== 1 ? 's' : ''}
          {statusFilter.length > 0 && ' (filtered)'}
        </div>
      )}
    </div>
  );
}
