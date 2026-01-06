import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { getGamesForVenue } from '@/lib/data/games';
import { getVenueTables } from '@/lib/data/tables';
import { getCopiesInUseByGame, getActiveSessionsForVenue, getFeedbackSummariesByGame } from '@/lib/data/sessions';
import { getTrendingGameIds } from './actions';
import { LibraryClient } from '@/components/admin/LibraryClient';
import type { Session, VenueTable, Game } from '@/lib/db/types';
import type { GameFeedbackSummary } from '@/lib/data/sessions';
import type { LibraryFilter } from '@/components/admin/LibraryCommandBar';

/** Session with table label for display */
export interface SessionWithTable extends Session {
  tableLabel: string;
}

/** Aggregated data for library service console */
export interface LibraryAggregatedData {
  games: Game[];
  tables: Record<string, VenueTable>;
  copiesInUse: Record<string, number>;
  activeSessionsByGame: Record<string, SessionWithTable[]>;
  browsingSessions: SessionWithTable[];
  venueId: string;
  /** Per-game feedback summaries (last 90 days) */
  feedbackSummaries: Record<string, GameFeedbackSummary>;
  /** Game IDs currently trending on BGG Hotness list */
  trendingGameIds: string[];
}

interface LibraryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's venue
  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">No Venue Found</h1>
        <p className="text-slate-600">
          You don&apos;t have a venue associated with your account yet.
        </p>
      </div>
    );
  }

  // Fetch all data in parallel
  const [games, tables, copiesInUse, activeSessions, feedbackSummaries, trendingGameIds] = await Promise.all([
    getGamesForVenue(venue.id),
    getVenueTables(venue.id),
    getCopiesInUseByGame(venue.id),
    getActiveSessionsForVenue(venue.id),
    getFeedbackSummariesByGame(venue.id),
    getTrendingGameIds(venue.id),
  ]);

  // Build tables map for quick lookup
  const tablesMap: Record<string, VenueTable> = {};
  for (const table of tables) {
    tablesMap[table.id] = table;
  }

  // Build active sessions by game_id for the drawer
  const activeSessionsByGame: Record<string, SessionWithTable[]> = {};
  const browsingSessions: SessionWithTable[] = [];

  for (const session of activeSessions) {
    const tableLabel = tablesMap[session.table_id]?.label ?? 'Unknown table';
    const sessionWithTable: SessionWithTable = {
      ...session,
      tableLabel,
    };

    if (session.game_id) {
      // Playing session - add to game's active sessions
      if (!activeSessionsByGame[session.game_id]) {
        activeSessionsByGame[session.game_id] = [];
      }
      activeSessionsByGame[session.game_id].push(sessionWithTable);
    } else {
      // Browsing session - no game selected yet
      browsingSessions.push(sessionWithTable);
    }
  }

  const aggregatedData: LibraryAggregatedData = {
    games,
    tables: tablesMap,
    copiesInUse,
    activeSessionsByGame,
    browsingSessions,
    venueId: venue.id,
    feedbackSummaries,
    trendingGameIds: Array.from(trendingGameIds),
  };

  // Parse URL params for initial state
  const highlightGameId = typeof params.highlight === 'string' ? params.highlight : undefined;
  const initialFilter = typeof params.filter === 'string' ? params.filter as LibraryFilter : undefined;

  return (
    <LibraryClient
      data={aggregatedData}
      initialHighlight={highlightGameId}
      initialFilter={initialFilter}
    />
  );
}
