'use client';

import { useState } from 'react';
import type { Game, GameStatus, GameComplexity } from '@/lib/db/types';
import Image from 'next/image';
import { GameFormModal } from './AddGameModal';
import { ImportGamesButton } from './ImportGamesButton';

interface GamesTableProps {
  games: Game[];
}

const complexityConfig: Record<GameComplexity, { label: string; classes: string }> = {
  simple: {
    label: 'Simple',
    classes: 'bg-green-100 text-green-700',
  },
  medium: {
    label: 'Medium',
    classes: 'bg-yellow-100 text-yellow-700',
  },
  complex: {
    label: 'Complex',
    classes: 'bg-red-100 text-red-700',
  },
};

const statusConfig: Record<GameStatus, { label: string; classes: string }> = {
  in_rotation: {
    label: 'In Rotation',
    classes: 'bg-blue-100 text-blue-700',
  },
  out_for_repair: {
    label: 'Out of Service',
    classes: 'bg-slate-100 text-slate-600',
  },
  retired: {
    label: 'Retired',
    classes: 'bg-slate-100 text-slate-500',
  },
  for_sale: {
    label: 'For Sale',
    classes: 'bg-purple-100 text-purple-700',
  },
};

function ComplexityBadge({ complexity }: { complexity: GameComplexity }) {
  const config = complexityConfig[complexity];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: GameStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
}

function PlaceholderImage() {
  return (
    <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

export function GamesTable({ games }: GamesTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Game Library</h1>
        <div className="flex items-center gap-2">
          <ImportGamesButton />
          <button
            type="button"
            onClick={() => {
              setSelectedGame(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Game
          </button>
        </div>
      </div>

      {/* Add Game Modal */}
      <GameFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedGame}
      />

      {/* Table */}
      {games.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">No games yet</h3>
          <p className="text-slate-500 mb-4">Get started by adding your first game to the library.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Game
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Players
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Complexity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {games.map((game) => (
                  <tr key={game.id} className="hover:bg-slate-50 transition-colors">
                    {/* Cover Image + Title */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {game.cover_image_url ? (
                          <Image
                            src={game.cover_image_url}
                            alt={`${game.title} cover`}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <PlaceholderImage />
                        )}
                        <span className="font-medium text-slate-900">{game.title}</span>
                      </div>
                    </td>
                    {/* Players */}
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {game.min_players === game.max_players
                        ? game.min_players
                        : `${game.min_players}–${game.max_players}`}
                    </td>
                    {/* Duration */}
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {game.min_time_minutes === game.max_time_minutes
                        ? `${game.min_time_minutes} min`
                        : `${game.min_time_minutes}–${game.max_time_minutes} min`}
                    </td>
                    {/* Complexity */}
                    <td className="px-4 py-3">
                      <ComplexityBadge complexity={game.complexity} />
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={game.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGame(game);
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                          />
                        </svg>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
