"use client";

import { useMemo, useState } from "react";
import { OperatorShell } from "../../components/OperatorShell";
import { AddGameModal } from "../../components/AddGameModal";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useMockData } from "../../context/MockDataContext";
import { Users, Clock, Plus } from "lucide-react";

const statusTone = {
  available: "success",
  in_use: "warning",
  maintenance: "danger",
} as const;

type PlayerFilter = "any" | "2" | "4" | "6";

export default function LibraryPage() {
  const { games } = useMockData();
  const [availableOnly, setAvailableOnly] = useState(false);
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("any");
  const [open, setOpen] = useState(false);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      if (availableOnly && game.status !== "available") return false;
      if (playerFilter !== "any") {
        const maxPlayers = game.players.split("-").pop();
        if (!maxPlayers) return false;
        if (playerFilter === "6") {
          return parseInt(maxPlayers, 10) >= 6;
        }
        return parseInt(maxPlayers, 10) >= parseInt(playerFilter, 10);
      }
      return true;
    });
  }, [availableOnly, games, playerFilter]);

  return (
    <OperatorShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-ledger text-ink-secondary">Library</p>
          <h1 className="text-3xl font-serif text-ink-primary">Game Ledger</h1>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Game
        </Button>
      </div>

      <Card className="border-2 border-stroke/80">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stroke bg-paper/80">
          <div className="flex gap-2 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setAvailableOnly((prev) => !prev)}
              className={`px-3 py-2 rounded-token border text-sm font-semibold transition-colors ${
                availableOnly
                  ? "bg-accent-primary text-card border-ink-primary/30 shadow-token"
                  : "bg-card text-ink-secondary border-stroke hover:text-ink-primary"
              }`}
            >
              Available only
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-token border border-stroke bg-card text-ink-secondary">
              <Users className="h-4 w-4" />
              <select
                value={playerFilter}
                onChange={(e) => setPlayerFilter(e.target.value as PlayerFilter)}
                className="bg-transparent text-sm font-semibold focus:outline-none"
              >
                <option value="any">Any players</option>
                <option value="2">2+</option>
                <option value="4">4+</option>
                <option value="6">6+</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Clock className="h-4 w-4" />
            Rotations today: <span className="font-semibold text-ink-primary">28</span>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full ledger-table">
            <thead>
              <tr>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">Players</th>
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-4 py-3">Complexity</th>
                <th className="text-left px-4 py-3">Condition</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((game) => (
                <tr key={game.id} className="hover:bg-highlight/70 transition-colors">
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[game.status]}>
                      {game.status === "available" && "Available"}
                      {game.status === "in_use" && "In Use"}
                      {game.status === "maintenance" && "Maintenance"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink-primary">{game.title}</td>
                  <td className="px-4 py-3 font-mono text-sm text-ink-secondary">{game.location}</td>
                  <td className="px-4 py-3">{game.players}</td>
                  <td className="px-4 py-3">{game.time}</td>
                  <td className="px-4 py-3 text-ink-secondary">{game.complexity}</td>
                  <td className="px-4 py-3 text-ink-secondary">{game.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AddGameModal open={open} onClose={() => setOpen(false)} />
    </OperatorShell>
  );
}
