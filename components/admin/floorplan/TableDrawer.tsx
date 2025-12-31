"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VenueTableWithLayout } from "@/lib/db/types";
import type { TableSessionInfo } from "./TableNode";

interface TableDrawerProps {
  table: VenueTableWithLayout | null;
  session: TableSessionInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onEndSession: (sessionId: string) => Promise<void>;
  onAssignGame: () => void;
}

export function TableDrawer({
  table,
  session,
  isOpen,
  onClose,
  onEndSession,
  onAssignGame,
}: TableDrawerProps) {
  if (!isOpen || !table) return null;

  return (
    <div className="fixed bottom-4 right-4 z-10 w-80">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{table.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[color:var(--color-ink-secondary)]">
          <div>Capacity: {table.capacity ?? "—"}</div>
          <div>Zone: {table.zone_id ?? "Unassigned"}</div>
          {session ? (
            <div className="space-y-1">
              <div>Status: {session.status}</div>
              {session.gameTitle && <div>Game: {session.gameTitle}</div>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => onEndSession(session.sessionId)}>
                  End session
                </Button>
                <Button size="sm" variant="secondary" onClick={onAssignGame}>
                  Assign game
                </Button>
              </div>
            </div>
          ) : (
            <div>No active session for this table.</div>
          )}
          <div className="pt-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
