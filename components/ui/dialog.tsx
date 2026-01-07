'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from '@/components/icons';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
      />
      {/* Content wrapper */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function DialogContent({
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <div
      className={cn(
        'relative w-full max-w-lg bg-[color:var(--color-surface)] rounded-xl shadow-xl border border-[color:var(--color-structure)] animate-in fade-in-0 zoom-in-95',
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-b border-[color:var(--color-structure)]',
        className
      )}
      {...props}
    />
  );
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
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

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-[color:var(--color-structure)] flex items-center justify-end gap-3',
        className
      )}
      {...props}
    />
  );
}

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function DialogClose({ className, ...props }: DialogCloseProps) {
  return (
    <button
      className={cn(
        'absolute right-4 top-4 p-1 rounded-md text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-ink-primary)] hover:bg-[color:var(--color-muted)] transition-colors',
        className
      )}
      {...props}
    >
      <X className="w-4 h-4" />
      <span className="sr-only">Close</span>
    </button>
  );
}
