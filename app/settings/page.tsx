"use client";

import { Palette, Shield } from "lucide-react";
import { AppShell, Callout } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { mockVenues } from "@/lib/mockData";

function SettingsContent() {
  const venue = mockVenues[0];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Settings</p>
          <h1 className="text-3xl">Venue profile</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Name</label>
              <Input defaultValue={venue.name} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Slug</label>
              <Input defaultValue={venue.slug} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="secondary">Save profile</Button>
              <Button variant="ghost">Cancel</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <CardTitle>Theme density</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-ink-secondary">Toggle spacing for quick shift changes.</p>
            <Callout title="Rulebook tip">Use compact mode during peak hours to keep more rows onscreen.</Callout>
            <div className="flex items-center gap-2">
              <Button variant="secondary">Switch to compact</Button>
              <Button variant="ghost">Stay cozy</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <CardTitle>Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-ink-secondary">Confirm before destructive actions.</p>
            <Button variant="destructive">Archive venue</Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}
