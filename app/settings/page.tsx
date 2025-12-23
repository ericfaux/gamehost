"use client";

import { OperatorShell } from "../../components/OperatorShell";
import { Card } from "../../components/ui/card";

export default function SettingsPage() {
  return (
    <OperatorShell>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-ledger text-ink-secondary">Preferences</p>
        <h1 className="text-3xl font-serif text-ink-primary">Settings</h1>
      </div>
      <Card className="p-6 border-2 border-stroke/80 text-sm text-ink-secondary">
        Operator preferences coming soon. Use the sidebar to navigate active tools.
      </Card>
    </OperatorShell>
  );
}
