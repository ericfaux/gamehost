'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RotateCcw } from '@/components/icons';
import {
  AlertQueue,
  QuickActions,
  BottleneckWidget,
  ActivityFeed,
} from '@/components/admin/dashboard';
import { VenueFeedbackWidget } from '@/components/admin/VenueFeedbackWidget';
import {
  AssignGameToSessionModal,
  type BrowsingSession,
} from '@/components/admin/AssignGameToSessionModal';
import type { DashboardData, Alert } from '@/lib/data/dashboard';
import type { Game } from '@/lib/db/types';

export interface DashboardClientProps {
  dashboardData: DashboardData;
  availableGames: Game[];
  browsingSessions: BrowsingSession[];
}

/**
 * DashboardClient - Client-side wrapper for dashboard interactivity.
 *
 * Renders the complete blended dashboard layout:
 * 1. Header row: "DASHBOARD > Overview" with refresh button
 * 2. KPI Strip: Games in Library | Active Sessions | Sessions Today
 * 3. Venue Feedback Widget
 * 4. Two-column grid:
 *    - Left (lg:col-span-7): AlertQueue
 *    - Right (lg:col-span-5): QuickActions, BottleneckWidget, ActivityFeed
 *
 * Handles:
 * - Refresh button with loading state
 * - Alert actions (navigation and modals)
 * - Quick Actions → open modal or navigate
 * - Assign game to session modal
 */
export function DashboardClient({
  dashboardData,
  availableGames,
  browsingSessions,
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
    // If there are browsing sessions, open modal with the first one
    if (browsingSessions.length > 0) {
      setSelectedSession(browsingSessions[0]);
      setAssignModalOpen(true);
    } else {
      // Navigate to sessions page for assigning games
      router.push('/admin/sessions');
    }
  }, [router, browsingSessions]);

  const handleCloseAssignModal = useCallback(() => {
    setAssignModalOpen(false);
    setSelectedSession(null);
  }, []);

  const handleAssignSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header row: "DASHBOARD > Overview" with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Dashboard</p>
          <h1 className="text-3xl">Overview</h1>
        </div>
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

      {/* Screen reader announcement for refresh */}
      <div className="sr-only" role="status" aria-live="polite">
        {isRefreshing ? 'Refreshing dashboard data...' : ''}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/library" className="block">
          <div className="bg-white rounded-xl border border-slate-200 p-6 transition-all duration-150 hover:border-orange-300 hover:shadow-md cursor-pointer group">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide group-hover:text-orange-600 transition-colors">
              Games in Library
            </h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {dashboardData.gamesInLibrary}
            </p>
          </div>
        </Link>
        <Link href="/admin/sessions" className="block">
          <div className="bg-white rounded-xl border border-slate-200 p-6 transition-all duration-150 hover:border-orange-300 hover:shadow-md cursor-pointer group">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide group-hover:text-orange-600 transition-colors">
              Active Sessions
            </h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {dashboardData.activeSessions}
            </p>
          </div>
        </Link>
        <Link href="/admin/sessions" className="block">
          <div className="bg-white rounded-xl border border-slate-200 p-6 transition-all duration-150 hover:border-orange-300 hover:shadow-md cursor-pointer group">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide group-hover:text-orange-600 transition-colors">
              Sessions Today
            </h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {dashboardData.totalSessionsToday}
            </p>
          </div>
        </Link>
      </div>

      {/* Venue Feedback Widget */}
      <VenueFeedbackWidget feedback={dashboardData.venueFeedback} />

      {/* Two-column grid: AlertQueue on left, QuickActions/Bottleneck/Activity on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Alert Queue */}
        <div className="lg:col-span-7">
          <AlertQueue
            alerts={dashboardData.alerts}
            onAction={handleAlertAction}
            loading={isRefreshing}
          />
        </div>

        {/* Right Column: QuickActions, Bottleneck Widget, Activity Feed */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <QuickActions
            browsingCount={dashboardData.browsingSessionsCount}
            onAssignGame={handleAssignGame}
          />

          <BottleneckWidget games={dashboardData.bottleneckedGames} />

          <ActivityFeed
            recentEnded={dashboardData.recentEnded}
            recentFeedback={dashboardData.recentFeedback}
          />
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

// Re-export the type for backward compatibility
export type { BrowsingSession };
