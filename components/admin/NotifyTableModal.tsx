'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, Copy, Check, Send } from '@/components/icons';
import { useToast } from '@/components/providers/ToastProvider';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface NotifyTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableLabel: string;
  guestName: string;
  bookingTime: string;
}

// =============================================================================
// HELPER
// =============================================================================

/**
 * Generates a suggested notification message for table turnover.
 */
function generateNotifyMessage(guestName: string, bookingTime: string): string {
  return `Hi! Just a heads up - we have another group (${guestName}) arriving at ${bookingTime}. No rush, but let us know when you're wrapping up!`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function NotifyTableModal({
  isOpen,
  onClose,
  tableLabel,
  guestName,
  bookingTime,
}: NotifyTableModalProps) {
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { push: pushToast } = useToast();

  // Handle client-side mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMessage(generateNotifyMessage(guestName, bookingTime));
      setCopied(false);
      // Focus the textarea after a short delay
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, guestName, bookingTime]);

  // Handle escape key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll lock when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle click outside to close modal
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  // Copy message to clipboard
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      pushToast({
        title: 'Message copied',
        description: 'The notification message has been copied to your clipboard.',
        tone: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      pushToast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard. Please select and copy manually.',
        tone: 'danger',
      });
    }
  }

  // Mark as notified and close
  function handleMarkNotified() {
    pushToast({
      title: 'Table notified',
      description: `Table ${tableLabel} has been marked as notified.`,
      tone: 'success',
    });
    onClose();
  }

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notify-modal-title"
    >
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-w-md mx-4 rounded-xl',
          'bg-[color:var(--color-elevated)] border border-[color:var(--color-structure)]',
          'shadow-xl',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--color-structure)]">
          <h2
            id="notify-modal-title"
            className="text-lg font-semibold text-[color:var(--color-ink-primary)]"
          >
            Notify Table {tableLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              'hover:bg-[color:var(--color-muted)]',
              'text-[color:var(--color-ink-secondary)]',
            )}
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-[color:var(--color-ink-secondary)]">
            Suggested message for the current party at Table {tableLabel}:
          </p>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={cn(
              'w-full min-h-[120px] px-3 py-2 rounded-lg',
              'border border-[color:var(--color-structure)]',
              'bg-[color:var(--color-surface)]',
              'text-[color:var(--color-ink-primary)] text-sm',
              'focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/50',
              'resize-y',
            )}
            aria-label="Notification message"
          />

          <div className="flex items-center gap-2 text-xs text-[color:var(--color-ink-secondary)]">
            <span className="font-medium">Upcoming booking:</span>
            <span>{guestName} at {bookingTime}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[color:var(--color-structure)]">
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                Copy Message
              </>
            )}
          </Button>
          <Button size="sm" onClick={handleMarkNotified}>
            <Send className="h-4 w-4 mr-1.5" />
            Mark Notified
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
