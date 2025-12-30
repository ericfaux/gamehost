"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Users, Clock, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardTitle } from "@/components/ui/card";
import { TokenChip } from "@/components/AppShell";
import type { Game } from "@/lib/db/types";

interface AssignGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (gameId: string) => Promise<void>;
  games: Game[];
  tableLabel: string;
  isAssigning: boolean;
}

export function AssignGameModal({
  isOpen,
  onClose,
  onAssign,
  games,
  tableLabel,
  isAssigning,
}: AssignGameModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setSelectedGameId(null);
      // Focus search input when modal opens
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Filter games by search term
  const filteredGames = useMemo(() => {
    if (!searchTerm.trim()) {
      return games.slice(0, 20); // Show first 20 if no search
    }
    const term = searchTerm.toLowerCase();
    return games
      .filter((game) => game.title.toLowerCase().includes(term))
      .slice(0, 20);
  }, [games, searchTerm]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && selectedGameId) {
      handleAssign();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const currentIndex = filteredGames.findIndex((g) => g.id === selectedGameId);
      let newIndex: number;

      if (e.key === "ArrowDown") {
        newIndex = currentIndex < filteredGames.length - 1 ? currentIndex + 1 : 0;
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : filteredGames.length - 1;
      }

      if (filteredGames[newIndex]) {
        setSelectedGameId(filteredGames[newIndex].id);
        // Scroll into view
        const element = document.getElementById(`game-${filteredGames[newIndex].id}`);
        element?.scrollIntoView({ block: "nearest" });
      }
    }
  };

  const handleAssign = async () => {
    if (!selectedGameId || isAssigning) return;
    await onAssign(selectedGameId);
  };

  const formatPlayerRange = (min: number, max: number) => {
    if (min === max) return `${min}`;
    return `${min}-${max}`;
  };

  const formatTimeRange = (min: number, max: number) => {
    if (min === max) return `${min}m`;
    return `${min}-${max}m`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-game-title"
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-structure bg-surface shadow-token"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-structure p-6">
          <div>
            <CardTitle id="assign-game-title" className="text-xl">
              Assign Game
            </CardTitle>
            <p className="text-sm text-ink-secondary">
              Select a game for <span className="font-semibold">{tableLabel}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-ink-secondary"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-structure">
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search games by title..."
              className="pl-10"
              aria-label="Search games"
            />
            <Search className="h-4 w-4 absolute left-3 top-3 text-ink-secondary" />
          </div>
        </div>

        {/* Game list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2"
          role="listbox"
          aria-label="Available games"
        >
          {filteredGames.length === 0 ? (
            <p className="text-center py-8 text-sm text-ink-secondary">
              {searchTerm ? "No games match your search" : "No games available"}
            </p>
          ) : (
            <div className="space-y-1">
              {filteredGames.map((game) => {
                const isSelected = game.id === selectedGameId;
                return (
                  <button
                    id={`game-${game.id}`}
                    key={game.id}
                    type="button"
                    onClick={() => setSelectedGameId(game.id)}
                    onDoubleClick={handleAssign}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-[color:var(--color-accent-soft)] border-[color:var(--color-accent)] shadow-card"
                        : "bg-transparent border-transparent hover:bg-[color:var(--color-muted)]/60 hover:border-[color:var(--color-structure)]"
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${isSelected ? "text-[color:var(--color-accent)]" : ""}`}>
                          {game.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-ink-secondary">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {formatPlayerRange(game.min_players, game.max_players)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeRange(game.min_time_minutes, game.max_time_minutes)}
                          </span>
                          <TokenChip tone="muted">{game.complexity}</TokenChip>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-[color:var(--color-accent)] flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-structure p-4">
          <p className="text-xs text-ink-secondary">
            {filteredGames.length} of {games.length} games
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isAssigning}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedGameId || isAssigning}
            >
              {isAssigning ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Assigning...
                </>
              ) : (
                "Assign Game"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
