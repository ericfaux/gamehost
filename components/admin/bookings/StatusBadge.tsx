import { cn } from '@/lib/utils';
import type { BookingStatus } from '@/lib/db/types';

interface StatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  arrived: {
    label: 'Arrived',
    className: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  seated: {
    label: 'Seated',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  no_show: {
    label: 'No Show',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  cancelled_by_guest: {
    label: 'Cancelled',
    className: 'bg-stone-100 text-stone-500 border-stone-200',
  },
  cancelled_by_venue: {
    label: 'Cancelled',
    className: 'bg-stone-100 text-stone-500 border-stone-200',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
