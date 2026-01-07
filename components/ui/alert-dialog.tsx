'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange: _onOpenChange, children }: AlertDialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop - no click to close for alert dialogs */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0" />
      {/* Content wrapper */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function AlertDialogContent({
  className,
  children,
  ...props
}: AlertDialogContentProps) {
  return (
    <div
      className={cn(
        'relative w-full max-w-md bg-[color:var(--color-surface)] rounded-xl shadow-xl border border-[color:var(--color-structure)] animate-in fade-in-0 zoom-in-95 p-6',
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}

type AlertDialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function AlertDialogHeader({ className, ...props }: AlertDialogHeaderProps) {
  return (
    <div
      className={cn('space-y-2', className)}
      {...props}
    />
  );
}

type AlertDialogTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  return (
    <h2
      className={cn(
        'text-lg font-semibold text-[color:var(--color-ink-primary)]',
        className
      )}
      {...props}
    />
  );
}

type AlertDialogDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return (
    <p
      className={cn('text-sm text-[color:var(--color-ink-secondary)]', className)}
      {...props}
    />
  );
}

type AlertDialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

export function AlertDialogFooter({ className, ...props }: AlertDialogFooterProps) {
  return (
    <div
      className={cn(
        'mt-6 flex items-center justify-end gap-3',
        className
      )}
      {...props}
    />
  );
}
