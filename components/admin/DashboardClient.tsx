'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RotateCcw, Gamepad2, LayoutGrid, QrCode } from '@/components/icons';
import {
  PulseTile,
  AlertQueue,
  ControlDeck,
  ActivityFeed,
  BottleneckWidget,
} from '@/components/admin/dashboard';
import {
  AssignGameToSessionModal,
  type BrowsingSession,
} from '@/components/admin/AssignGameToSessionModal';
import type { OpsHudData, Alert } from '@/lib/data/dashboard';
import type { Game } from '@/lib/db/types';

export interface DashboardClientProps {
  data: OpsHudData;
  availableGames: Game[];
  browsingSessions: BrowsingSession[];
  isNewVenue?: boolean;
}

/**
 * Onboarding card for new venues with no data
 */
function OnboardingCard({
  icon,
  title,
  description,
  href,
  primary = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-start gap-4 p-5 rounded-xl border transition-all duration-150',
        'shadow-card hover:shadow-token hover:scale-[1.01] active:scale-[0.99]',
        'focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/50 focus:ring-offset-2',
        primary
          ? 'bg-[color:var(--color-accent)] border-[color:var(--color-accent)] text-white'
          : 'bg-[color:var(--color-elevated)] border-[color:var(--color-structure)] hover:border-[color:var(--color-structure-strong)]',
      )}
    >
      <span
        className={cn(
          'flex-shrink-0 p-2 rounded-lg',
          primary
            ? 'bg-white/20'
            : 'bg-[color:var(--color-accent-soft)]',
        )}
      >
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <span className={cn('font-semibold', primary ? 'text-white' : 'text-[color:var(--color-ink-primary)]')}>
          {title}
        </span>
        <span className={cn('text-sm', primary ? 'text-white/80' : 'text-[color:var(--color-ink-secondary)]')}>
          {description}
        </span>
      </div>
    </Link>
  );
}

/**
 * Onboarding empty state for new venues
 */
function NewVenueOnboarding() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="max-w-xl w-full text-center mb-8">
        <span className="text-5xl mb-4 block" role="img" aria-label="Sparkles">✨</span>
        <h2 className="text-2xl font-bold text-[color:var(--color-ink-primary)] mb-2">
          Welcome to your dashboard!
        </h2>
        <p className="text-[color:var(--color-ink-secondary)]">
          Let&apos;s get your venue set up. Complete these steps to start tracking sessions and feedback.
        </p>
      </div>
      <div className="max-w-lg w-full flex flex-col gap-4">
        <OnboardingCard
          icon={<Gamepad2 className="w-5 h-5 text-white" />}
          title="Add your first game"
          description="Build your library with games guests can play"
          href="/admin/library?action=add"
          primary
        />
        <OnboardingCard
          icon={<LayoutGrid className="w-5 h-5 text-[color:var(--color-accent)]" />}
          title="Set up tables"
          description="Configure your venue's table layout"
          href="/admin/settings"
        />
        <OnboardingCard
          icon={<QrCode className="w-5 h-5 text-[color:var(--color-accent)]" />}
          title="Print QR codes"
          description="Generate codes for guests to check in"
          href="/admin/settings"
        />
      </div>
    </div>
  );
}

function formatLastUpdated(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * DashboardClient - Client-side wrapper for dashboard interactivity.
 *
 * Handles:
 * - Refresh button with loading state
 * - Alert actions (navigation and modals)
 * - Control deck actions
 * - Assign game to session modal
 * - New venue onboarding state
 */
export function DashboardClient({
  data,
  availableGames,
  browsingSessions,
  isNewVenue = false,
}: DashboardClientProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  // Assign game modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<BrowsingSession | null>(null);

  const handleRefresh = useCallback(() => {
    startRefresh(() => {
      router.refresh();
    });
  }, [router]);

  /**
   * Handle alert actions based on alert type and action config.
   */
  const handleAlertAction = useCallback((alert: Alert, action: 'primary' | 'secondary') => {
    const actionConfig = action === 'primary' ? alert.primaryAction : alert.secondaryAction;
    if (!actionConfig) return;

    // Handle link actions directly
    if (actionConfig.type === 'link') {
      router.push(actionConfig.target);
      return;
    }

    // Handle modal actions based on alert type
    if (actionConfig.type === 'modal') {
      const params = actionConfig.params as Record<string, string> | undefined;

      switch (alert.type) {
        case 'table_browsing_stale': {
          // Open assign game modal for this specific session
          const sessionId = params?.sessionId;
          if (sessionId) {
            const session = browsingSessions.find((s) => s.id === sessionId);
            if (session) {
              setSelectedSession(session);
              setAssignModalOpen(true);
              return;
            }
          }
          // Fallback to sessions page if session not found
          router.push('/admin/sessions');
          break;
        }

        case 'game_bottlenecked': {
          // Navigate to library with game highlighted
          const gameId = params?.gameId;
          if (gameId) {
            router.push(`/admin/library?highlight=${gameId}`);
          } else {
            router.push('/admin/library?filter=bottlenecked');
          }
          break;
        }

        case 'game_problematic': {
          // Navigate to library with problematic filter and game highlighted
          const gameId = params?.gameId;
          if (gameId) {
            router.push(`/admin/library?filter=problematic&highlight=${gameId}`);
          } else {
            router.push('/admin/library?filter=problematic');
          }
          break;
        }

        case 'game_out_for_repair': {
          // Navigate to library with game highlighted
          const gameId = params?.gameId;
          if (gameId) {
            router.push(`/admin/library?filter=out_for_repair&highlight=${gameId}`);
          } else {
            router.push('/admin/library?filter=out_for_repair');
          }
          break;
        }

        default:
          // Fallback for unknown modal targets
          console.warn('Unknown alert type for modal:', alert.type);
          router.push('/admin/library');
      }
    }
  }, [router, browsingSessions]);

  const handleAssignGame = useCallback(() => {
    // Navigate to sessions page for assigning games
    router.push('/admin/sessions');
  }, [router]);

  const handleLogIssue = useCallback(() => {
    // Navigate to library for marking games for repair
    router.push('/admin/library?filter=problematic');
  }, [router]);

  const handleCloseAssignModal = useCallback(() => {
    setAssignModalOpen(false);
    setSelectedSession(null);
  }, []);

  const handleAssignSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  // Determine pulse tile tones based on values
  const waitingTone = data.pulse.waitingTables > 0
    ? (data.pulse.waitingTables >= 3 ? 'danger' : 'warn')
    : 'default';

  const issuesTone = data.pulse.openIssues > 0
    ? (data.pulse.openIssues >= 3 ? 'danger' : 'warn')
    : 'default';

  const venuePulseTone = data.pulse.venuePulse.avg !== null
    ? (data.pulse.venuePulse.avg >= 4 ? 'success' : data.pulse.venuePulse.avg >= 3 ? 'default' : 'warn')
    : 'default';

  const venuePulseValue = data.pulse.venuePulse.avg !== null
    ? data.pulse.venuePulse.avg.toFixed(1)
    : '—';

  const hasBrowsingSessions = data.pulse.waitingTables > 0;

  // Show onboarding for new venues
  if (isNewVenue) {
    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[color:var(--color-ink-primary)]">
            Dashboard
          </h1>
        </div>
        <NewVenueOnboarding />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[color:var(--color-ink-primary)]">
          Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[color:var(--color-ink-secondary)]">
            Updated: {formatLastUpdated(data.meta.generatedAt)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? 'Refreshing dashboard...' : 'Refresh dashboard'}
          >
            <RotateCcw
              className={cn(
                'w-4 h-4 transition-transform',
                isRefreshing && 'animate-spin'
              )}
              aria-hidden="true"
            />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Screen reader announcement for refresh */}
      <div className="sr-only" role="status" aria-live="polite">
        {isRefreshing ? 'Refreshing dashboard data...' : ''}
      </div>

      {/* Pulse Strip */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        role="region"
        aria-label="Dashboard metrics"
      >
        <PulseTile
          value={data.pulse.activeTables}
          label="Active Tables"
          tone="accent"
          badge={data.pulse.activeTables > 0 ? 'Live' : undefined}
          loading={isRefreshing}
        />
        <PulseTile
          value={data.pulse.waitingTables}
          label="Waiting"
          tone={waitingTone}
          badge={data.pulse.waitingTables > 0 ? 'Needs help' : undefined}
          loading={isRefreshing}
        />
        <PulseTile
          value={data.pulse.openIssues}
          label="Open Issues"
          tone={issuesTone}
          loading={isRefreshing}
        />
        <PulseTile
          value={venuePulseValue}
          label="Venue Pulse"
          tone={venuePulseTone}
          badge={data.pulse.venuePulse.count > 0 ? `${data.pulse.venuePulse.count} today` : undefined}
          loading={isRefreshing}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Alert Queue */}
        <div className="lg:col-span-7">
          <AlertQueue
            alerts={data.alerts}
            onAction={handleAlertAction}
            loading={isRefreshing}
          />
        </div>

        {/* Right Column: Control Deck, Bottleneck Widget, Activity Feed */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Control Deck */}
          <Card className="panel-surface">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <ControlDeck
                onAssignGame={handleAssignGame}
                onLogIssue={handleLogIssue}
                hasBrowsingSessions={hasBrowsingSessions}
                browsingCount={data.pulse.waitingTables}
              />
            </CardContent>
          </Card>

          {/* Bottleneck Widget */}
          <BottleneckWidget games={data.bottleneckedGames} />

          {/* Activity Feed */}
          <Card className="panel-surface">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed
                recentEnded={data.activity.recentEnded}
                recentFeedback={data.activity.recentFeedback}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Game to Session Modal */}
      {selectedSession && (
        <AssignGameToSessionModal
          session={selectedSession}
          availableGames={availableGames}
          isOpen={assignModalOpen}
          onClose={handleCloseAssignModal}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
}
