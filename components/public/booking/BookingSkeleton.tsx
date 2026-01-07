'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-stone-200',
        className
      )}
    />
  );
}

/**
 * Skeleton for the booking wizard loading state
 */
export function BookingWizardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-card border border-[color:var(--color-structure)] overflow-hidden">
      {/* Progress skeleton */}
      <div className="px-4 py-4 bg-[color:var(--color-muted)] border-b border-[color:var(--color-structure)]">
        <div className="flex items-center gap-1.5 mb-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />
          ))}
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <div className="flex items-center gap-4 justify-center">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </div>
        </div>

        {/* Button */}
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for time slots grid
 */
export function SlotsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Period group */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Another period group */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <Skeleton className="flex-1 h-12 rounded-lg" />
        <Skeleton className="flex-[2] h-12 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for game selection list
 */
export function GamesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Search */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Games list */}
      <div className="space-y-4">
        <Skeleton className="h-3 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--color-structure)]"
            >
              <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <Skeleton className="flex-1 h-12 rounded-lg" />
        <Skeleton className="flex-[2] h-12 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for the manage booking page
 */
export function ManageBookingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Status banner skeleton */}
      <Skeleton className="h-16 rounded-lg" />

      {/* Reservation details card skeleton */}
      <div className="bg-white rounded-xl border border-[color:var(--color-structure)] overflow-hidden">
        <div className="p-4 border-b border-[color:var(--color-structure)]">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="p-4 space-y-4">
          {/* Date/Time */}
          <div className="flex items-start gap-3">
            <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          {/* Party size */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
            <Skeleton className="h-4 w-24" />
          </div>
          {/* Table */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>

      {/* Guest info card skeleton */}
      <div className="bg-white rounded-xl border border-[color:var(--color-structure)] overflow-hidden">
        <div className="p-4 border-b border-[color:var(--color-structure)]">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for confirmation step
 */
export function ConfirmationSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Summary card */}
      <div className="rounded-lg border border-[color:var(--color-structure)] divide-y divide-[color:var(--color-structure)]">
        {/* Date/Time section */}
        <div className="p-4 flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Party/Table section */}
        <div className="p-4 flex gap-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>

        {/* Guest details */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <Skeleton className="flex-1 h-12 rounded-lg" />
        <Skeleton className="flex-[2] h-12 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Inline skeleton for smaller loading states
 */
export function InlineSkeleton({ width = 'w-20', height = 'h-4' }: { width?: string; height?: string }) {
  return <Skeleton className={cn(width, height)} />;
}
