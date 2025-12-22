'use client';

import { useState } from 'react';
import { login } from './actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsLoading(true);

    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
            <p className="text-gray-600 mt-2">Sign in to manage your venue</p>
          </div>

          <form action={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm 
                         placeholder-gray-400 focus:outline-none focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm 
                         placeholder-gray-400 focus:outline-none focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 
                       text-white font-medium rounded-md shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Board Game Cafe Host Portal
        </p>
      </div>
    </div>
  );
}
