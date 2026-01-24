'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';
import {
  Globe,
  Instagram,
  Facebook,
  Phone,
  Mail,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Check,
} from '@/components/icons';
import type { OnboardingData } from './OnboardingWizard';

interface StepSocialProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}

export function StepSocial({
  data,
  onUpdate,
  onSubmit,
  onBack,
  isSubmitting,
  submitError,
}: StepSocialProps) {
  const websiteId = useId();
  const phoneId = useId();
  const emailId = useId();
  const instagramId = useId();
  const facebookId = useId();

  const inputClass =
    'w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] pl-11 pr-4 py-3 text-base shadow-card focus-ring min-h-[48px]';

  const labelClass =
    'text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)] block mb-1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-serif font-semibold text-[color:var(--color-ink-primary)]">
          Connect with guests
        </h2>
        <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
          All of these are optional - add them now or later
        </p>
      </div>

      {/* Error message */}
      {submitError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-token border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-red-800">{submitError}</p>
        </div>
      )}

      {/* Contact Info Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-[color:var(--color-ink-primary)]">
          Contact Information
        </h3>

        {/* Website */}
        <div className="space-y-1">
          <label htmlFor={websiteId} className={labelClass}>
            Website
          </label>
          <div className="relative">
            <Globe
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              id={websiteId}
              type="url"
              value={data.venueWebsite}
              onChange={e => onUpdate({ venueWebsite: e.target.value })}
              placeholder="https://yourwebsite.com"
              autoComplete="url"
              inputMode="url"
              className={inputClass}
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label htmlFor={phoneId} className={labelClass}>
            Venue Phone
          </label>
          <div className="relative">
            <Phone
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              id={phoneId}
              type="tel"
              value={data.venuePhone}
              onChange={e => onUpdate({ venuePhone: e.target.value })}
              placeholder="(555) 123-4567"
              autoComplete="tel"
              inputMode="tel"
              className={inputClass}
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label htmlFor={emailId} className={labelClass}>
            Contact Email
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              id={emailId}
              type="email"
              value={data.venueEmail}
              onChange={e => onUpdate({ venueEmail: e.target.value })}
              placeholder="hello@yourvenue.com"
              autoComplete="email"
              inputMode="email"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Social Links Section */}
      <div className="border-t border-[color:var(--color-structure)] pt-4 space-y-4">
        <h3 className="text-sm font-medium text-[color:var(--color-ink-primary)]">
          Social Media
        </h3>

        {/* Instagram */}
        <div className="space-y-1">
          <label htmlFor={instagramId} className={labelClass}>
            Instagram
          </label>
          <div className="relative">
            <Instagram
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              id={instagramId}
              type="text"
              value={data.socialInstagram}
              onChange={e => {
                // Remove @ if user types it
                const value = e.target.value.replace(/^@/, '');
                onUpdate({ socialInstagram: value });
              }}
              placeholder="yourvenue"
              autoComplete="off"
              autoCapitalize="off"
              className={inputClass}
            />
          </div>
          <p className="text-xs text-[color:var(--color-ink-secondary)]">
            instagram.com/{data.socialInstagram || 'yourvenue'}
          </p>
        </div>

        {/* Facebook */}
        <div className="space-y-1">
          <label htmlFor={facebookId} className={labelClass}>
            Facebook
          </label>
          <div className="relative">
            <Facebook
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              id={facebookId}
              type="text"
              value={data.socialFacebook}
              onChange={e => onUpdate({ socialFacebook: e.target.value })}
              placeholder="yourvenue"
              autoComplete="off"
              autoCapitalize="off"
              className={inputClass}
            />
          </div>
          <p className="text-xs text-[color:var(--color-ink-secondary)]">
            facebook.com/{data.socialFacebook || 'yourvenue'}
          </p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className={cn(
            'flex-1 py-3 rounded-token font-medium text-base flex items-center justify-center gap-2 transition-colors touch-manipulation border min-h-[48px]',
            isSubmitting
              ? 'border-slate-200 text-slate-400 cursor-not-allowed'
              : 'border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)]'
          )}
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={cn(
            'flex-[2] py-3 rounded-token font-semibold text-base flex items-center justify-center gap-2 transition-colors touch-manipulation min-h-[48px]',
            isSubmitting
              ? 'bg-teal-400 text-white cursor-not-allowed'
              : 'bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              Creating your venue...
            </>
          ) : (
            <>
              Complete Setup
              <Check className="w-5 h-5" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
