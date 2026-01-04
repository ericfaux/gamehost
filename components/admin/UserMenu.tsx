'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { User, Settings, LogOut, Building } from '@/components/icons';
import { signOut } from '@/app/admin/profile-actions';
import { EditProfileDialog } from './EditProfileDialog';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface UserMenuProps {
  user: {
    email: string;
    name: string | null;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function getInitials(name: string | null, email: string): string {
  if (name && name.trim().length >= 2) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  // Fallback to email initials
  return email.slice(0, 2).toUpperCase();
}

// =============================================================================
// COMPONENT
// =============================================================================

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = getInitials(user.name, user.email);
  const displayName = user.name || user.email.split('@')[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  function handleSignOut() {
    startSignOut(() => {
      signOut();
    });
  }

  function handleProfileClick() {
    setIsOpen(false);
    setIsProfileDialogOpen(true);
  }

  return (
    <>
      <div ref={menuRef} className="relative">
        {/* Avatar Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center font-semibold text-sm",
            "bg-orange-100 text-orange-700 border border-orange-200",
            "cursor-pointer hover:shadow-md transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
          )}
          aria-label="User menu"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {initials}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className={cn(
              "absolute right-0 mt-2 w-64 z-50",
              "panel-surface border border-[color:var(--color-structure)] rounded-xl shadow-card",
              "animate-in fade-in-0 zoom-in-95 duration-150"
            )}
            role="menu"
            aria-orientation="vertical"
          >
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-[color:var(--color-structure)]">
              <p className="font-semibold text-sm text-[color:var(--color-ink-primary)] truncate">
                {displayName}
              </p>
              <p className="text-xs text-[color:var(--color-ink-secondary)] truncate">
                {user.email}
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* My Profile */}
              <button
                onClick={handleProfileClick}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[color:var(--color-ink-primary)]",
                  "hover:bg-[color:var(--color-muted)] transition-colors"
                )}
                role="menuitem"
              >
                <User className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
                My Profile
              </button>

              {/* Venue Settings */}
              <Link
                href="/admin/settings"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[color:var(--color-ink-primary)]",
                  "hover:bg-[color:var(--color-muted)] transition-colors"
                )}
                role="menuitem"
              >
                <Building className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
                Venue Settings
              </Link>
            </div>

            {/* Sign Out */}
            <div className="border-t border-[color:var(--color-structure)] py-1">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm",
                  "text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger)]/10 transition-colors",
                  isSigningOut && "opacity-50 cursor-not-allowed"
                )}
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Edit Dialog */}
      <EditProfileDialog
        isOpen={isProfileDialogOpen}
        onClose={() => setIsProfileDialogOpen(false)}
        user={user}
      />
    </>
  );
}
