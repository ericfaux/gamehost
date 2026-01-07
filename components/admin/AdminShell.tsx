'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Menu, Search, Bell, Sparkle, ChevronDown } from '@/components/icons';
import { useDensity } from '@/components/providers/DensityProvider';
import { UserMenu } from './UserMenu';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface AdminShellProps {
  children: React.ReactNode;
  userVenues?: { id: string; name: string }[];
  user?: {
    email: string;
    name: string | null;
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AdminShell({ children, userVenues = [], user }: AdminShellProps) {
  const { density } = useDensity();
  const [openMobile, setOpenMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [venueId, setVenueId] = useState(userVenues[0]?.id ?? '');

  return (
    <div className="min-h-screen grid lg:grid-cols-[260px_1fr] bg-noise">
      {/* Sidebar - Hidden on mobile unless menu is open */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 lg:static lg:block',
          openMobile ? 'block' : 'hidden'
        )}
      >
        <Sidebar venueId={venueId} />
        {/* Mobile overlay */}
        {openMobile && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm lg:hidden -z-10"
            onClick={() => setOpenMobile(false)}
          />
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-[color:var(--color-structure)] backdrop-blur-sm bg-[color:var(--color-surface)]/80">
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Mobile Menu Button */}
            <Button
              aria-label="Open menu"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpenMobile(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Venue Selector */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)]">
              <Sparkle className="h-4 w-4 text-orange-500" />
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="bg-transparent text-sm font-semibold focus:outline-none"
                aria-label="Select venue"
              >
                {userVenues.length === 0 ? (
                  <option value="" className="text-[color:var(--color-ink-primary)]">
                    No Venue Found
                  </option>
                ) : (
                  userVenues.map((venue) => (
                    <option key={venue.id} value={venue.id} className="text-[color:var(--color-ink-primary)]">
                      {venue.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="h-4 w-4 text-[color:var(--color-ink-secondary)]" />
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search games by title"
                className="w-full pl-10"
                aria-label="Search games"
              />
              <Search className="h-4 w-4 absolute left-3 top-3 text-[color:var(--color-ink-secondary)]" />
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>
              {user ? (
                <UserMenu user={user} />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700 font-semibold">
                  --
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 md:px-6 py-6 bg-rulebook-grid">
          <div className="max-w-6xl mx-auto space-y-4" data-density={density}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
