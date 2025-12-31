import { redirect } from "next/navigation";
import { Palette, Shield } from "@/components/icons";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { Callout } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch venue for the current user
  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Settings</p>
            <h1 className="text-3xl">Venue Settings</h1>
          </div>
        </div>
        <Card className="panel-surface">
          <CardContent className="py-6">
            <p className="text-center text-[color:var(--color-ink-secondary)]">
              No venue found for your account. Please contact support.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Settings</p>
          <h1 className="text-3xl">Venue Settings</h1>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Venue Profile */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="panel-surface">
            <CardHeader>
              <CardTitle>Venue Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Name</label>
                <Input defaultValue={venue.name} disabled />
              </div>
              <div>
                <label className="text-xs uppercase tracking-rulebook text-ink-secondary">Slug</label>
                <Input defaultValue={venue.slug} disabled />
              </div>
              <p className="text-xs text-[color:var(--color-ink-secondary)]">
                Contact support to update your venue profile.
              </p>
            </CardContent>
          </Card>

          <Card className="panel-surface">
            <CardHeader className="flex flex-row items-center gap-2">
              <Palette className="h-4 w-4" />
              <CardTitle>Theme Density</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-ink-secondary">Toggle spacing for quick shift changes.</p>
              <Callout title="Rulebook tip">Use compact mode during peak hours to keep more rows onscreen.</Callout>
              <p className="text-xs text-[color:var(--color-ink-secondary)]">
                Toggle density using the sidebar control.
              </p>
            </CardContent>
          </Card>

          <Card className="panel-surface">
            <CardHeader className="flex flex-row items-center gap-2">
              <Shield className="h-4 w-4" />
              <CardTitle>Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-ink-secondary">Confirm before destructive actions.</p>
              <Button variant="destructive" disabled>Archive venue</Button>
              <p className="text-xs text-[color:var(--color-ink-secondary)]">
                Contact support to archive your venue.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
