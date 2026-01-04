'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2 } from '@/components/icons';
import { updateProfile } from '@/app/admin/profile-actions';
import { useToast } from '@/components/providers/ToastProvider';

// =============================================================================
// TYPES
// =============================================================================

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    email: string;
    name: string | null;
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function EditProfileDialog({ isOpen, onClose, user }: EditProfileDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(user.name ?? '');
  const formRef = useRef<HTMLFormElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { push: pushToast } = useToast();

  // Handle escape key to close dialog
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName(user.name ?? '');
      setError(null);
    }
  }, [isOpen, user.name]);

  // Handle click outside to close dialog
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.success) {
        pushToast({
          title: 'Profile updated',
          description: 'Your profile has been saved successfully.',
          tone: 'success',
        });
        onClose();
      } else {
        setError(result.error || 'An unexpected error occurred');
      }
    });
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="panel-surface w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--color-structure)]">
          <h2 id="profile-dialog-title" className="text-lg font-semibold text-[color:var(--color-ink-primary)]">
            Edit Profile
          </h2>
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="icon"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-[color:var(--color-ink-secondary)]" />
          </Button>
        </div>

        {/* Form */}
        <form ref={formRef} action={handleSubmit} className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[color:var(--color-danger)]/10 border border-[color:var(--color-danger)]/20 rounded-lg text-[color:var(--color-danger)] text-sm">
              {error}
            </div>
          )}

          {/* Name Field */}
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-[color:var(--color-ink-primary)] mb-1">
              Display Name
            </label>
            <Input
              id="profile-name"
              name="name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              autoFocus
            />
            <p className="text-xs text-[color:var(--color-ink-secondary)] mt-1">
              Minimum 2 characters
            </p>
          </div>

          {/* Email Field (Read-only) */}
          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-[color:var(--color-ink-primary)] mb-1">
              Email
            </label>
            <Input
              id="profile-email"
              type="email"
              value={user.email}
              disabled
              className="bg-[color:var(--color-muted)] cursor-not-allowed"
            />
            <p className="text-xs text-[color:var(--color-ink-secondary)] mt-1">
              Email cannot be changed
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" onClick={onClose} disabled={isPending} variant="ghost" size="sm">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || name.trim().length < 2} size="sm">
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
