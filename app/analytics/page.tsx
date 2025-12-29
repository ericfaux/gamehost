"use client";

import { AppShell, TokenChip } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockGames, mockSessions } from "@/lib/mockData";

const topPlayed = mockSessions.reduce<Record<string, number>>((acc, session) => {
  acc[session.game_id] = (acc[session.game_id] ?? 0) + 1;
  return acc;
}, {});

const popular = Object.entries(topPlayed)
  .map(([gameId, count]) => ({
    title: mockGames.find((g) => g.id === gameId)?.title ?? "Unknown",
    count,
  }))
  .sort((a, b) => b.count - a.count);

const deadShelf = mockGames.filter((game) => !topPlayed[game.id]).slice(0, 4);

function AnalyticsContent() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Analytics</p>
          <h1 className="text-3xl">Utilization snapshot</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Most played</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {popular.map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{item.title}</p>
                  <div className="h-2 bg-[color:var(--color-muted)] rounded-full overflow-hidden">
                    <div className="h-full bg-[color:var(--color-accent)]" style={{ width: `${Math.min(100, item.count * 25)}%` }}></div>
                  </div>
                </div>
                <TokenChip tone="accent">{item.count}x</TokenChip>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dead shelf risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deadShelf.map((game) => (
              <div key={game.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{game.title}</p>
                  <p className="text-xs text-ink-secondary">No scans this week</p>
                </div>
                <TokenChip tone="muted">{game.vibes[0]}</TokenChip>
              </div>
            ))}
            {deadShelf.length === 0 && <p className="text-sm text-ink-secondary">All titles saw play.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bottlenecks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {popular.slice(0, 3).map((item) => (
              <div key={item.title} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.title}</span>
                  <TokenChip tone="accent">{item.count} holds</TokenChip>
                </div>
                <div className="h-2 bg-[color:var(--color-muted)] rounded-full overflow-hidden">
                  <div className="h-full bg-[color:var(--color-warn)]" style={{ width: `${Math.min(100, item.count * 20)}%` }}></div>
                </div>
              </div>
            ))}
            {popular.length === 0 && <p className="text-sm text-ink-secondary">No demand yet.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <AppShell>
      <AnalyticsContent />
    </AppShell>
  );
}
