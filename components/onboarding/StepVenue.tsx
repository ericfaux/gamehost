'use client';

import { useState, useId, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Store,
  Link2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  Loader2,
} from '@/components/icons';
import { checkSlugAvailability } from '@/app/onboarding/actions';
import type { OnboardingData } from './OnboardingWizard';

interface StepVenueProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface FormErrors {
  venueName?: string;
  venueSlug?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

export function StepVenue({ data, onUpdate, onNext, onBack }: StepVenueProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const venueNameId = useId();
  const venueNameErrorId = useId();
  const venueSlugId = useId();
  const venueSlugErrorId = useId();
  const venueDescId = useId();

  // Auto-generate slug from venue name (unless manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && data.venueName) {
      const newSlug = generateSlug(data.venueName);
      if (newSlug !== data.venueSlug) {
        onUpdate({ venueSlug: newSlug });
      }
    }
  }, [data.venueName, slugManuallyEdited, data.venueSlug, onUpdate]);

  // Check slug availability with debounce
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 2) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');

    try {
      const result = await checkSlugAvailability(slug);
      setSlugStatus(result.available ? 'available' : 'taken');

      if (!result.available) {
        setErrors(prev => ({ ...prev, venueSlug: 'This URL is already taken' }));
      } else {
        setErrors(prev => {
          const { venueSlug: _, ...rest } = prev;
          return rest;
        });
      }
    } catch {
      setSlugStatus('idle');
    }
  }, []);

  // Debounced slug check
  useEffect(() => {
    if (!data.venueSlug || data.venueSlug.length < 2) {
      setSlugStatus('idle');
      return;
    }

    const timer = setTimeout(() => {
      checkSlug(data.venueSlug);
    }, 500);

    return () => clearTimeout(timer);
  }, [data.venueSlug, checkSlug]);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field: string) => {
    const newErrors = { ...errors };

    if (field === 'venueName') {
      if (!data.venueName.trim()) {
        newErrors.venueName = 'Venue name is required';
      } else if (data.venueName.trim().length < 2) {
        newErrors.venueName = 'Venue name must be at least 2 characters';
      } else {
        delete newErrors.venueName;
      }
    }

    if (field === 'venueSlug') {
      if (!data.venueSlug.trim()) {
        newErrors.venueSlug = 'URL slug is required';
      } else if (!/^[a-z0-9-]+$/.test(data.venueSlug)) {
        newErrors.venueSlug = 'Only lowercase letters, numbers, and hyphens allowed';
      } else if (slugStatus === 'taken') {
        newErrors.venueSlug = 'This URL is already taken';
      } else {
        delete newErrors.venueSlug;
      }
    }

    setErrors(newErrors);
  };

  const validateAll = (): boolean => {
    const newErrors: FormErrors = {};

    if (!data.venueName.trim()) {
      newErrors.venueName = 'Venue name is required';
    } else if (data.venueName.trim().length < 2) {
      newErrors.venueName = 'Venue name must be at least 2 characters';
    }

    if (!data.venueSlug.trim()) {
      newErrors.venueSlug = 'URL slug is required';
    } else if (!/^[a-z0-9-]+$/.test(data.venueSlug)) {
      newErrors.venueSlug = 'Only lowercase letters, numbers, and hyphens allowed';
    } else if (slugStatus === 'taken') {
      newErrors.venueSlug = 'This URL is already taken';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    setTouched({ venueName: true, venueSlug: true });

    if (validateAll() && slugStatus !== 'checking') {
      onNext();
    }
  };

  const inputClass = (hasError: boolean) =>
    cn(
      'w-full rounded-token border bg-[color:var(--color-elevated)] pl-11 pr-4 py-3 text-base shadow-card focus-ring',
      'min-h-[48px]',
      hasError
        ? 'border-[color:var(--color-danger)]'
        : 'border-[color:var(--color-structure)]'
    );

  const labelClass =
    'text-xs uppercase tracking-rulebook text-[color:var(--color-ink-secondary)] block mb-1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-serif font-semibold text-[color:var(--color-ink-primary)]">
          Tell us about your venue
        </h2>
        <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
          This is how your venue will appear to guests
        </p>
      </div>

      {/* Venue Name Input */}
      <div className="space-y-1">
        <label htmlFor={venueNameId} className={labelClass}>
          Venue Name <span className="text-[color:var(--color-danger)]" aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <div className="relative">
          <Store
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={venueNameId}
            type="text"
            value={data.venueName}
            onChange={e => {
              onUpdate({ venueName: e.target.value });
              if (touched.venueName) validateField('venueName');
            }}
            onBlur={() => handleBlur('venueName')}
            placeholder="The Board Room"
            autoComplete="organization"
            autoCapitalize="words"
            aria-required="true"
            aria-invalid={!!errors.venueName && touched.venueName}
            aria-describedby={errors.venueName && touched.venueName ? venueNameErrorId : undefined}
            className={inputClass(!!errors.venueName && touched.venueName)}
          />
        </div>
        {errors.venueName && touched.venueName && (
          <p id={venueNameErrorId} role="alert" className="text-sm text-[color:var(--color-danger)] flex items-center gap-1">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            {errors.venueName}
          </p>
        )}
      </div>

      {/* Venue Slug Input */}
      <div className="space-y-1">
        <label htmlFor={venueSlugId} className={labelClass}>
          Your URL <span className="text-[color:var(--color-danger)]" aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <div className="relative">
          <Link2
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={venueSlugId}
            type="text"
            value={data.venueSlug}
            onChange={e => {
              const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
              onUpdate({ venueSlug: value });
              setSlugManuallyEdited(true);
              if (touched.venueSlug) validateField('venueSlug');
            }}
            onBlur={() => handleBlur('venueSlug')}
            placeholder="the-board-room"
            autoComplete="off"
            autoCapitalize="off"
            aria-required="true"
            aria-invalid={!!errors.venueSlug && touched.venueSlug}
            aria-describedby={venueSlugErrorId}
            className={cn(
              inputClass(!!errors.venueSlug && touched.venueSlug),
              'pr-10'
            )}
          />
          {/* Slug status indicator */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {slugStatus === 'checking' && (
              <Loader2 className="w-5 h-5 text-[color:var(--color-ink-secondary)] animate-spin" aria-hidden="true" />
            )}
            {slugStatus === 'available' && (
              <Check className="w-5 h-5 text-green-500" aria-hidden="true" />
            )}
            {slugStatus === 'taken' && (
              <AlertCircle className="w-5 h-5 text-[color:var(--color-danger)]" aria-hidden="true" />
            )}
          </div>
        </div>
        <p id={venueSlugErrorId} className={cn(
          'text-sm flex items-center gap-1',
          errors.venueSlug && touched.venueSlug
            ? 'text-[color:var(--color-danger)]'
            : 'text-[color:var(--color-ink-secondary)]'
        )}>
          {errors.venueSlug && touched.venueSlug ? (
            <>
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              {errors.venueSlug}
            </>
          ) : (
            <>gameledger.app/book/{data.venueSlug || 'your-venue'}</>
          )}
        </p>
      </div>

      {/* Venue Description (optional) */}
      <div className="space-y-1">
        <label htmlFor={venueDescId} className={labelClass}>
          Description <span className="text-[color:var(--color-ink-secondary)] normal-case">(optional)</span>
        </label>
        <textarea
          id={venueDescId}
          value={data.venueDescription}
          onChange={e => onUpdate({ venueDescription: e.target.value })}
          placeholder="A cozy board game cafe with over 500 games..."
          rows={3}
          className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-4 py-3 text-base shadow-card focus-ring resize-none"
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-token font-medium text-base flex items-center justify-center gap-2 transition-colors touch-manipulation border border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)] hover:bg-[color:var(--color-muted)] min-h-[48px]"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={slugStatus === 'checking'}
          className={cn(
            'flex-[2] py-3 rounded-token font-semibold text-base flex items-center justify-center gap-2 transition-colors touch-manipulation min-h-[48px]',
            slugStatus === 'checking'
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]'
          )}
        >
          Continue
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
