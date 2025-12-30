'use client';

/**
 * VenueCommentsDrawer - Slide-out drawer showing venue experience comments.
 */

import { useState, useEffect, useTransition } from 'react';
import { X, MessageSquare, Loader2, ThumbsDown } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/AppShell';
import { getVenueCommentsAction } from '@/app/admin/sessions/actions';
import type { VenueExperienceComment } from '@/lib/data';

interface VenueCommentsDrawerProps {
  venueId: string;
  isOpen: boolean;
  onClose: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } else if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMins > 0) {
    return `${diffMins}m ago`;
  }
  return 'Just now';
}

export function VenueCommentsDrawer({
  venueId,
  isOpen,
  onClose,
}: VenueCommentsDrawerProps) {
  const { push } = useToast();
  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState<VenueExperienceComment[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch comments when drawer opens
  useEffect(() => {
    if (isOpen && !hasLoaded) {
      startTransition(async () => {
        const result = await getVenueCommentsAction({ venueId, limit: 15 });
        if (result.ok) {
          setComments(result.comments);
        } else {
          push({
            title: 'Error',
            description: result.error ?? 'Failed to load comments',
            tone: 'danger',
          });
        }
        setHasLoaded(true);
      });
    }
  }, [isOpen, hasLoaded, venueId, push]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setComments([]);
      setHasLoaded(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-[color:var(--color-surface)] shadow-2xl border-l border-[color:var(--color-structure)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-[color:var(--color-ink-secondary)] mb-1">
              Venue experience
            </p>
            <h2 className="text-xl font-bold text-[color:var(--color-ink-primary)]">
              Guest comments
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-xl hover:bg-[color:var(--color-muted)] transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5 text-[color:var(--color-ink-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--color-ink-secondary)]" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto bg-[color:var(--color-muted)] rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-[color:var(--color-ink-secondary)]" />
              </div>
              <p className="text-[color:var(--color-ink-secondary)]">
                No venue comments yet
              </p>
              <p className="text-xs text-[color:var(--color-ink-secondary)] mt-1">
                Comments from guests who reported issues will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="panel-surface p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {comment.rating <= 2 && (
                      <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className="text-xs text-[color:var(--color-ink-secondary)]">
                      {formatRelativeTime(comment.submittedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[color:var(--color-ink-primary)]">
                    &ldquo;{comment.comment}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
          <Button
            variant="secondary"
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </>
  );
}
