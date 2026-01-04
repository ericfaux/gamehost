'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RotateCcw } from '@/components/icons';
import {
  PulseTile,
  AlertQueue,
  ControlDeck,
  ActivityFeed,
  BottleneckWidget,
} from '@/components/admin/dashboard';
import type { OpsHudData, Alert } from '@/lib/data/dashboard';

export interface DashboardClientProps {
  data: OpsHudData;
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
 */
export function DashboardClient({ data }: DashboardClientProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const handleRefresh = () => {
    startRefresh(() => {
      router.refresh();
    });
  };

  const handleAlertAction = (alert: Alert, action: 'primary' | 'secondary') => {
    const actionConfig = action === 'primary' ? alert.primaryAction : alert.secondaryAction;
    if (!actionConfig) return;

    if (actionConfig.type === 'link') {
      router.push(actionConfig.target);
    } else if (actionConfig.type === 'modal') {
      // Handle modal actions by navigating to relevant pages
      // Future: implement actual modals for table-detail and game-detail
      switch (actionConfig.target) {
        case 'table-detail':
          router.push('/admin/sessions');
          break;
        case 'game-detail':
          router.push('/admin/library');
          break;
        default:
          console.warn('Unknown modal target:', actionConfig.target);
      }
    }
  };

  const handleAssignGame = () => {
    // Navigate to sessions page for assigning games
    router.push('/admin/sessions');
  };

  const handleLogIssue = () => {
    // Navigate to library for marking games for repair
    router.push('/admin/library?filter=problematic');
  };

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
          >
            <RotateCcw
              className={cn(
                'w-4 h-4',
                isRefreshing && 'animate-spin'
              )}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Pulse Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PulseTile
          value={data.pulse.activeTables}
          label="Active Tables"
          tone="accent"
          badge={data.pulse.activeTables > 0 ? 'Live' : undefined}
        />
        <PulseTile
          value={data.pulse.waitingTables}
          label="Waiting"
          tone={waitingTone}
          badge={data.pulse.waitingTables > 0 ? 'Needs help' : undefined}
        />
        <PulseTile
          value={data.pulse.openIssues}
          label="Open Issues"
          tone={issuesTone}
        />
        <PulseTile
          value={venuePulseValue}
          label="Venue Pulse"
          tone={venuePulseTone}
          badge={data.pulse.venuePulse.count > 0 ? `${data.pulse.venuePulse.count} today` : undefined}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Alert Queue */}
        <div className="lg:col-span-7">
          <AlertQueue
            alerts={data.alerts}
            onAction={handleAlertAction}
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
    </div>
  );
}
