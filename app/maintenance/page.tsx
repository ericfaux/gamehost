"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Hammer } from "lucide-react";
import { AppShell, StatusBadge, TokenChip, useToast } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Game } from "@/lib/db/types";
import { mockGames, mockIssues, MaintenanceIssue } from "@/lib/mockData";

export default function MaintenancePage() {
  const { push } = useToast();
  const [issues, setIssues] = useState<MaintenanceIssue[]>(mockIssues);
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const [newGameId, setNewGameId] = useState(mockGames[0]?.id ?? "");
  const [newIssue, setNewIssue] = useState("Broken component");

  const columns: Column<MaintenanceIssue>[] = [
    {
      key: "game_id",
      header: "Game",
      render: (row) => <span className="font-semibold">{mockGames.find((g) => g.id === row.game_id)?.title}</span>,
    },
    { key: "issue", header: "Issue" },
    { key: "severity", header: "Severity", render: (row) => <TokenChip tone="muted">{row.severity}</TokenChip> },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "condition", header: "Condition", render: (row) => <TokenChip>{row.condition}</TokenChip> },
  ];

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      if (severity !== "all" && issue.severity !== severity) return false;
      if (status !== "all" && issue.status !== status) return false;
      return true;
    });
  }, [issues, severity, status]);

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Maintenance</p>
          <h1 className="text-3xl">Issue log</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-4">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-ink-secondary">
              <AlertTriangle className="h-4 w-4" /> Issues
            </div>
            <div className="flex gap-2 text-sm">
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2"
              >
                <option value="all">All severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2"
              >
                <option value="all">All status</option>
                <option value="in_rotation">In rotation</option>
                <option value="out_for_repair">Out for repair</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable data={filtered} columns={columns} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Log maintenance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Game</label>
              <select
                value={newGameId}
                onChange={(e) => setNewGameId(e.target.value)}
                className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2"
              >
                {mockGames.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Issue</label>
              <Input value={newIssue} onChange={(e) => setNewIssue(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2"
                >
                  <option value="in_rotation">In rotation</option>
                  <option value="out_for_repair">Out for repair</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                const game = mockGames.find((g) => g.id === newGameId) as Game;
                const issue: MaintenanceIssue = {
                  id: `issue-${issues.length + 1}`,
                  game_id: newGameId,
                  issue: newIssue,
                  severity: severity as MaintenanceIssue["severity"],
                  status: status as MaintenanceIssue["status"],
                  condition: game.condition,
                };
                setIssues((prev) => [issue, ...prev]);
                push({ title: "Issue logged", description: `${game.title} · ${issue.issue}`, tone: "success" });
              }}
            >
              <Hammer className="h-4 w-4" /> Submit
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
