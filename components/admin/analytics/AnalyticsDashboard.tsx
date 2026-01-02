'use client';

import { Activity, Percent, Clock, Heart } from '@/components/icons';
import type { AnalyticsSummary } from '@/lib/data/analytics';

// ============================================================================
// Sub-components
// ============================================================================

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
}

function KpiCard({ icon, label, value, subtext }: KpiCardProps) {
  return (
    <div className="panel-surface p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-[color:var(--color-ink-secondary)] mb-1">
            {label}
          </p>
          <p className="text-2xl font-semibold text-[color:var(--color-ink-primary)]">
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-[color:var(--color-ink-secondary)] mt-1">
              {subtext}
            </p>
          )}
        </div>
        <div className="p-2 rounded-xl bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

interface GraveyardItemProps {
  title: string;
  lastPlayedAt: string | null;
  onRetire: () => void;
}

function GraveyardItem({ title, lastPlayedAt, onRetire }: GraveyardItemProps) {
  const formatLastPlayed = (date: string | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-[color:var(--color-structure)] last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[color:var(--color-ink-primary)] truncate">
          {title}
        </p>
        <p className="text-xs text-[color:var(--color-ink-secondary)]">
          Last played: {formatLastPlayed(lastPlayedAt)}
        </p>
      </div>
      <button
        onClick={onRetire}
        className="ml-3 px-3 py-1.5 text-xs font-medium rounded-lg
                   bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)]
                   hover:bg-[color:var(--color-structure)] transition-colors
                   focus-ring"
      >
        Retire
      </button>
    </div>
  );
}

interface HiddenGemItemProps {
  title: string;
  avgRating: number;
  playCount: number;
  onPromote: () => void;
}

function HiddenGemItem({
  title,
  avgRating,
  playCount,
  onPromote,
}: HiddenGemItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[color:var(--color-structure)] last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[color:var(--color-ink-primary)] truncate">
          {title}
        </p>
        <p className="text-xs text-[color:var(--color-ink-secondary)]">
          Rating: {avgRating.toFixed(1)} ⭐ &middot; Plays: {playCount}
        </p>
      </div>
      <button
        onClick={onPromote}
        className="ml-3 px-3 py-1.5 text-xs font-medium rounded-lg
                   bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]
                   hover:bg-[color:var(--color-accent)] hover:text-white transition-colors
                   focus-ring"
      >
        Promote
      </button>
    </div>
  );
}

interface TopGameBarProps {
  title: string;
  playCount: number;
  maxCount: number;
  avgRating: number | null;
}

function TopGameBar({ title, playCount, maxCount, avgRating }: TopGameBarProps) {
  const widthPct = maxCount > 0 ? (playCount / maxCount) * 100 : 0;

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-[color:var(--color-ink-primary)] truncate flex-1 mr-2">
          {title}
        </span>
        <span className="text-xs text-[color:var(--color-ink-secondary)] whitespace-nowrap">
          {playCount} plays
          {avgRating != null && ` · ${avgRating.toFixed(1)}★`}
        </span>
      </div>
      <div className="h-2 bg-[color:var(--color-muted)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[color:var(--color-accent)] rounded-full transition-all duration-500"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface AnalyticsDashboardProps {
  data: AnalyticsSummary;
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const {
    totalPlays30d,
    activeLibraryPct,
    avgSessionMinutes,
    venueCsat,
    topGames,
    graveyardCandidates,
    hiddenGems,
  } = data;

  const maxPlayCount =
    topGames.length > 0 ? Math.max(...topGames.map((g) => g.playCount)) : 0;

  const handleRetire = (gameId: string, title: string) => {
    console.log(`Retire action triggered for game: ${title} (${gameId})`);
  };

  const handlePromote = (gameId: string, title: string) => {
    console.log(`Promote action triggered for game: ${title} (${gameId})`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[color:var(--color-ink-primary)]">
          Library Pulse
        </h1>
        <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
          Discover insights about your game library performance and player preferences
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Activity className="w-5 h-5" />}
          label="Total Plays"
          value={totalPlays30d.toLocaleString()}
          subtext="Last 30 days"
        />
        <KpiCard
          icon={<Percent className="w-5 h-5" />}
          label="Utilization"
          value={`${activeLibraryPct}%`}
          subtext="Library played in 90 days"
        />
        <KpiCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Time"
          value={avgSessionMinutes != null ? `${avgSessionMinutes}m` : '—'}
          subtext="Per session"
        />
        <KpiCard
          icon={<Heart className="w-5 h-5" />}
          label="Venue Score"
          value={venueCsat != null ? venueCsat.toFixed(1) : '—'}
          subtext="Out of 5 (90 days)"
        />
      </div>

      {/* Main Content Grid - Graveyard & Hidden Gems */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graveyard Card */}
        <div className="panel-surface p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[color:var(--color-ink-primary)]">
              The Graveyard
            </h2>
            <p className="text-xs text-[color:var(--color-ink-secondary)]">
              Games with 0 plays in the last 90 days
            </p>
          </div>

          {graveyardCandidates.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[color:var(--color-ink-secondary)]">
                No dormant games found. Your library is active!
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {graveyardCandidates.map((game) => (
                <GraveyardItem
                  key={game.gameId}
                  title={game.title}
                  lastPlayedAt={game.lastPlayedAt}
                  onRetire={() => handleRetire(game.gameId, game.title)}
                />
              ))}
            </div>
          )}

          {graveyardCandidates.length > 0 && (
            <p className="mt-3 text-xs text-[color:var(--color-ink-secondary)]">
              {graveyardCandidates.length} game
              {graveyardCandidates.length !== 1 ? 's' : ''} need attention
            </p>
          )}
        </div>

        {/* Hidden Gems Card */}
        <div className="panel-surface p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[color:var(--color-ink-primary)]">
              Hidden Gems
            </h2>
            <p className="text-xs text-[color:var(--color-ink-secondary)]">
              Low plays (&lt;5) but high ratings (&gt;4.5★)
            </p>
          </div>

          {hiddenGems.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[color:var(--color-ink-secondary)]">
                No hidden gems discovered yet
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {hiddenGems.map((game) => (
                <HiddenGemItem
                  key={game.gameId}
                  title={game.title}
                  avgRating={game.avgRating}
                  playCount={game.playCount}
                  onPromote={() => handlePromote(game.gameId, game.title)}
                />
              ))}
            </div>
          )}

          {hiddenGems.length > 0 && (
            <p className="mt-3 text-xs text-[color:var(--color-ink-secondary)]">
              {hiddenGems.length} gem{hiddenGems.length !== 1 ? 's' : ''} ready to shine
            </p>
          )}
        </div>
      </div>

      {/* Bottom Section - Power Law / Top Games */}
      <div className="panel-surface p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--color-ink-primary)]">
            Power Law
          </h2>
          <p className="text-xs text-[color:var(--color-ink-secondary)]">
            Top 5 games by play count (last 30 days)
          </p>
        </div>

        {topGames.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[color:var(--color-ink-secondary)]">
              No play data available for the last 30 days
            </p>
          </div>
        ) : (
          <div>
            {topGames.map((game) => (
              <TopGameBar
                key={game.gameId}
                title={game.title}
                playCount={game.playCount}
                maxCount={maxPlayCount}
                avgRating={game.avgRating}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
