'use client';

import { useState } from 'react';
import { signup } from './actions';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle } from '@/components/icons';

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const result = await signup(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.message) {
        setMessage(result.message);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--color-surface)] px-4 bg-section-teal">
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

        {/* Signup Card */}
        <div className="panel-surface p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-[color:var(--color-ink-primary)] font-serif">
              Create your account
            </h1>
            <p className="text-[color:var(--color-ink-secondary)] mt-2 text-sm">
              Get started with managing your venue
            </p>
          </div>

          {message ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[color:var(--color-success)]/10 mb-4">
                <CheckCircle className="w-6 h-6 text-[color:var(--color-success)]" />
              </div>
              <p className="text-[color:var(--color-success)] text-sm font-medium">
                {message}
              </p>
              <p className="text-[color:var(--color-ink-secondary)] text-sm mt-2">
                Please check your inbox and click the confirmation link.
              </p>
            </div>
          ) : (
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Create a password"
                />
                <p className="text-xs text-[color:var(--color-ink-secondary)]">
                  Must be at least 8 characters
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-[color:var(--color-ink-secondary)]">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]/80 transition-colors"
              >
                Sign in
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
