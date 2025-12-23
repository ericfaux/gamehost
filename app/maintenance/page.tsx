"use client";

import { OperatorShell } from "../../components/OperatorShell";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useMockData } from "../../context/MockDataContext";
import { AlertTriangle, Check } from "lucide-react";

export default function MaintenancePage() {
  const { maintenance, toggleIssue } = useMockData();

  return (
    <OperatorShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-ledger text-ink-secondary">Upkeep</p>
          <h1 className="text-3xl font-serif text-ink-primary">Maintenance Log</h1>
        </div>
        <Badge tone="danger">Flagged issues: {maintenance.filter((m) => m.status === "open").length}</Badge>
      </div>

      <Card className="border-2 border-stroke/80">
        <div className="px-5 py-4 border-b border-stroke bg-paper/80 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-danger" />
          <p className="text-sm text-ink-secondary">Track damages like a ruled checklist. Tap to mark fixed.</p>
        </div>
        <div className="divide-y divide-stroke">
          {maintenance.map((issue) => (
            <div key={issue.id} className="flex items-center justify-between px-5 py-4 hover:bg-highlight/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge tone={issue.status === "open" ? "danger" : "success"}>
                    {issue.status === "open" ? "Open" : "Fixed"}
                  </Badge>
                  <p className="text-sm font-semibold text-ink-primary">{issue.title}</p>
                </div>
                {issue.detail && <p className="text-xs text-ink-secondary">{issue.detail}</p>}
                <p className="text-[11px] text-ink-secondary uppercase tracking-ledger">{issue.reportedAt}</p>
              </div>
              <Button
                variant={issue.status === "open" ? "secondary" : "ghost"}
                onClick={() => toggleIssue(issue.id)}
                className="gap-2"
              >
                {issue.status === "open" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {issue.status === "open" ? "Mark fixed" : "Re-open"}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </OperatorShell>
  );
}
