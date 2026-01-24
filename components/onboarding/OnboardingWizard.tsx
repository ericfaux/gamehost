'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from '@/components/icons';
import { StepWelcome } from './StepWelcome';
import { StepProfile } from './StepProfile';
import { StepVenue } from './StepVenue';
import { StepLocation } from './StepLocation';
import { StepSocial } from './StepSocial';
import { StepComplete } from './StepComplete';
import { completeOnboarding } from '@/app/onboarding/actions';
import type { Profile } from '@/lib/db/types';

interface OnboardingWizardProps {
  userId: string;
  userEmail: string;
  existingProfile: Profile | null;
}

export interface OnboardingData {
  // Profile fields
  name: string;
  phone: string;
  jobTitle: string;

  // Venue fields
  venueName: string;
  venueSlug: string;
  venueDescription: string;
  venuePhone: string;
  venueEmail: string;
  venueWebsite: string;

  // Social fields
  socialInstagram: string;
  socialFacebook: string;

  // Location fields
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  addressCountry: string;
  timezone: string;
}

const STEPS = [
  { num: 1, label: 'Welcome', shortLabel: 'Start' },
  { num: 2, label: 'Profile', shortLabel: 'You' },
  { num: 3, label: 'Venue', shortLabel: 'Venue' },
  { num: 4, label: 'Location', shortLabel: 'Where' },
  { num: 5, label: 'Connect', shortLabel: 'Social' },
  { num: 6, label: 'Done', shortLabel: 'Done' },
];

// Try to detect timezone from browser
function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York';
  }
}

export function OnboardingWizard({ userId, userEmail, existingProfile }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [targetStep, setTargetStep] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const stepContainerRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<OnboardingData>({
    // Pre-fill from existing profile if available
    name: existingProfile?.name ?? '',
    phone: existingProfile?.phone ?? '',
    jobTitle: existingProfile?.job_title ?? '',
    // Venue fields
    venueName: '',
    venueSlug: '',
    venueDescription: '',
    venuePhone: '',
    venueEmail: userEmail,
    venueWebsite: '',
    // Social
    socialInstagram: '',
    socialFacebook: '',
    // Location
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressPostalCode: '',
    addressCountry: 'US',
    timezone: detectTimezone(),
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  // Navigate to step with direction tracking
  const navigateToStep = useCallback((newStep: number, dir?: 'forward' | 'backward') => {
    if (newStep === step || isTransitioning) return;

    const newDirection = dir || (newStep > step ? 'forward' : 'backward');
    setDirection(newDirection);
    setTargetStep(newStep);
    setIsTransitioning(true);

    setTimeout(() => {
      setStep(newStep);
      setIsTransitioning(false);
      setTargetStep(null);
    }, 150);
  }, [step, isTransitioning]);

  // Handle final submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const result = await completeOnboarding({
      name: data.name,
      phone: data.phone || null,
      jobTitle: data.jobTitle || null,
      venueName: data.venueName,
      venueSlug: data.venueSlug,
      venueDescription: data.venueDescription || null,
      venuePhone: data.venuePhone || null,
      venueEmail: data.venueEmail || null,
      venueWebsite: data.venueWebsite || null,
      socialInstagram: data.socialInstagram || null,
      socialFacebook: data.socialFacebook || null,
      addressStreet: data.addressStreet || null,
      addressCity: data.addressCity || null,
      addressState: data.addressState || null,
      addressPostalCode: data.addressPostalCode || null,
      addressCountry: data.addressCountry || null,
      timezone: data.timezone,
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsComplete(true);
      navigateToStep(6, 'forward');
    } else {
      setSubmitError(result.error || 'Something went wrong. Please try again.');
    }
  };

  // Focus management on step change
  useEffect(() => {
    const timeout = setTimeout(() => {
      stepContainerRef.current?.focus();
    }, 50);
    return () => clearTimeout(timeout);
  }, [step]);

  // Completed state
  if (step === 6 && isComplete) {
    return (
      <StepComplete
        venueName={data.venueName}
        onGoToDashboard={() => router.push('/admin')}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-card border border-[color:var(--color-structure)] overflow-hidden">
      {/* Progress Header */}
      <div className="px-4 py-4 bg-[color:var(--color-muted)] border-b border-[color:var(--color-structure)]">
        <div
          className="flex items-start justify-between gap-1"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={6}
          aria-label={`Setup progress: Step ${step} of 6, ${STEPS[step - 1]?.label}`}
        >
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-start flex-1 last:flex-none">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                    step > s.num && 'bg-teal-500 text-white',
                    step === s.num && 'bg-teal-500 text-white ring-2 ring-teal-200 ring-offset-1',
                    step < s.num && 'bg-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)]'
                  )}
                  aria-current={step === s.num ? 'step' : undefined}
                >
                  {step > s.num ? (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <span>{s.num}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-1.5 text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 text-center leading-tight',
                    step > s.num && 'text-teal-600 font-medium',
                    step === s.num && 'text-[color:var(--color-ink-primary)] font-semibold',
                    step < s.num && 'text-[color:var(--color-ink-secondary)] opacity-60'
                  )}
                >
                  <span className="sm:hidden">{s.shortLabel}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1 sm:mx-1.5 mt-3.5 transition-colors duration-300',
                    step > s.num ? 'bg-teal-500' : 'bg-[color:var(--color-structure)]'
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div
        ref={stepContainerRef}
        tabIndex={-1}
        role="region"
        aria-label={`Step ${step}: ${STEPS[step - 1]?.label}`}
        aria-live="polite"
        className="p-4 sm:p-6 outline-none"
      >
        {/* Loading state during transition */}
        {isTransitioning && targetStep && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 animate-in fade-in duration-100">
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" aria-hidden="true" />
            <p className="text-sm text-[color:var(--color-ink-secondary)]">
              Loading {STEPS[targetStep - 1]?.label}...
            </p>
          </div>
        )}

        {/* Step content */}
        {!isTransitioning && (
          <div
            className={cn(
              'transition-all duration-200 ease-out',
              direction === 'forward'
                ? 'animate-in fade-in slide-in-from-right-4'
                : 'animate-in fade-in slide-in-from-left-4'
            )}
            key={step}
          >
            {step === 1 && (
              <StepWelcome
                onNext={() => navigateToStep(2, 'forward')}
              />
            )}

            {step === 2 && (
              <StepProfile
                data={data}
                onUpdate={updateData}
                onNext={() => navigateToStep(3, 'forward')}
                onBack={() => navigateToStep(1, 'backward')}
              />
            )}

            {step === 3 && (
              <StepVenue
                data={data}
                onUpdate={updateData}
                onNext={() => navigateToStep(4, 'forward')}
                onBack={() => navigateToStep(2, 'backward')}
              />
            )}

            {step === 4 && (
              <StepLocation
                data={data}
                onUpdate={updateData}
                onNext={() => navigateToStep(5, 'forward')}
                onBack={() => navigateToStep(3, 'backward')}
              />
            )}

            {step === 5 && (
              <StepSocial
                data={data}
                onUpdate={updateData}
                onSubmit={handleSubmit}
                onBack={() => navigateToStep(4, 'backward')}
                isSubmitting={isSubmitting}
                submitError={submitError}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
