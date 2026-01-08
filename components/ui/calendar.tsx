'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from '@/components/icons';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center pt-1 relative items-center w-full',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          'absolute left-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
          'inline-flex items-center justify-center rounded-md',
          'hover:bg-stone-100 transition-colors'
        ),
        button_next: cn(
          'absolute right-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
          'inline-flex items-center justify-center rounded-md',
          'hover:bg-stone-100 transition-colors'
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'text-stone-500 rounded-md w-9 font-normal text-[0.8rem]',
        week: 'flex w-full mt-2',
        day: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
          'size-9 rounded-md',
          '[&:has([aria-selected])]:bg-stone-100',
          '[&:has([aria-selected].day-outside)]:bg-stone-100/50',
          '[&:has([aria-selected].day-range-end)]:rounded-r-md',
          'first:[&:has([aria-selected])]:rounded-l-md',
          'last:[&:has([aria-selected])]:rounded-r-md'
        ),
        day_button: cn(
          'size-9 p-0 font-normal',
          'inline-flex items-center justify-center rounded-md',
          'hover:bg-stone-100 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400',
          'aria-selected:opacity-100'
        ),
        range_start: 'day-range-start rounded-l-md',
        range_end: 'day-range-end rounded-r-md',
        selected:
          'bg-stone-900 text-stone-50 hover:bg-stone-900 hover:text-stone-50 focus:bg-stone-900 focus:text-stone-50',
        today: 'bg-stone-100 text-stone-900',
        outside:
          'day-outside text-stone-500 opacity-50 aria-selected:bg-stone-100/50 aria-selected:text-stone-500 aria-selected:opacity-30',
        disabled: 'text-stone-500 opacity-50',
        range_middle:
          'aria-selected:bg-stone-100 aria-selected:text-stone-900',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === 'left') {
            return <ChevronLeft className="size-4" />;
          }
          return <ChevronRight className="size-4" />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
