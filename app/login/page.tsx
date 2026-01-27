'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from './actions';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsLoading(true);

    const result = await login(formData);

    if ('error' in result) {
      setError(result.error);
      setIsLoading(false);
    } else {
      router.push('/admin');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--color-surface)] px-4 bg-section-warm">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/gamehost-logo.svg"
              alt="GameLedger"
              width={180}
              height={48}
              className="mx-auto"
              priority
            />
          </Link>
        </div>

        {/* Login Card */}
        <div className="panel-surface p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-[color:var(--color-ink-primary)] font-serif">
              Welcome back
            </h1>
            <p className="text-[color:var(--color-ink-secondary)] mt-2 text-sm">
              Sign in to manage your venue
            </p>
          </div>

          <form action={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-[color:var(--color-danger)]/10 border border-[color:var(--color-danger)]/20 text-[color:var(--color-danger)] px-4 py-3 rounded-token text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[color:var(--color-ink-secondary)] hover:text-[color:var(--color-accent)] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Enter your password"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[color:var(--color-ink-secondary)]">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="font-medium text-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]/80 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[color:var(--color-ink-secondary)] text-xs mt-6">
          Board Game Cafe Host Portal
        </p>
      </div>
    </div>
  );
}
