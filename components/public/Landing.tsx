'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Landing() {
  return (
    <main className="min-h-screen bg-[color:var(--color-canvas)] flex items-center justify-center p-6">
      <Card className="max-w-3xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to GameHost</CardTitle>
          <p className="text-sm text-[color:var(--color-ink-secondary)]">
            Find a venue, reserve a table, and play games — all in one place.
          </p>
        </CardHeader>

        <CardContent>
          <section className="grid gap-6 sm:grid-cols-2 items-start">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--color-ink-primary)] mb-2">
                Reserve a Table
              </h2>
              <p className="text-sm text-[color:var(--color-ink-secondary)] mb-4">
                Search venues, choose a time, and reserve a table. No account required to book.
              </p>
              <Link href="/v">
                <Button variant="primary">Find a Venue</Button>
              </Link>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-[color:var(--color-ink-primary)] mb-2">
                Venue Owners
              </h2>
              <p className="text-sm text-[color:var(--color-ink-secondary)] mb-4">
                Manage bookings, the floorplan, and your venue profile.
              </p>
              <Link href="/login">
                <Button variant="secondary">Sign in (Owners)</Button>
              </Link>
            </div>
          </section>

          <footer className="mt-8 pt-4 border-t border-[color:var(--color-structure)]">
            <p className="text-xs text-[color:var(--color-ink-tertiary)]">
              Powered by GameHost
            </p>
          </footer>
        </CardContent>
      </Card>
    </main>
  );
}
