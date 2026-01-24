'use client';

import { useState, useId } from 'react';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Globe,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from '@/components/icons';
import type { OnboardingData } from './OnboardingWizard';

interface StepLocationProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface FormErrors {
  timezone?: string;
}

// Common US timezones
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
  { value: 'OTHER', label: 'Other' },
];

export function StepLocation({ data, onUpdate, onNext, onBack }: StepLocationProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const streetId = useId();
  const cityId = useId();
  const stateId = useId();
  const postalId = useId();
  const countryId = useId();
  const timezoneId = useId();
  const timezoneErrorId = useId();

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field: string) => {
    const newErrors = { ...errors };

    if (field === 'timezone') {
      if (!data.timezone) {
        newErrors.timezone = 'Timezone is required';
      } else {
        delete newErrors.timezone;
      }
    }

    setErrors(newErrors);
  };

  const validateAll = (): boolean => {
    const newErrors: FormErrors = {};

    if (!data.timezone) {
      newErrors.timezone = 'Timezone is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    setTouched({ timezone: true });

    if (validateAll()) {
      onNext();
    }
  };

  const inputClass = (hasError: boolean) =>
    cn(
      'w-full rounded-token border bg-[color:var(--color-elevated)] px-4 py-3 text-base shadow-card focus-ring',
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
          Where are you located?
        </h2>
        <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
          Address is optional - you can add it later in settings
        </p>
      </div>

      {/* Timezone (required) */}
      <div className="space-y-1">
        <label htmlFor={timezoneId} className={labelClass}>
          <Globe className="inline w-4 h-4 mr-1 -mt-0.5" aria-hidden="true" />
          Timezone <span className="text-[color:var(--color-danger)]" aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <select
          id={timezoneId}
          value={data.timezone}
          onChange={e => {
            onUpdate({ timezone: e.target.value });
            if (touched.timezone) validateField('timezone');
          }}
          onBlur={() => handleBlur('timezone')}
          aria-required="true"
          aria-invalid={!!errors.timezone && touched.timezone}
          aria-describedby={errors.timezone && touched.timezone ? timezoneErrorId : undefined}
          className={cn(inputClass(!!errors.timezone && touched.timezone), 'appearance-none cursor-pointer')}
        >
          <option value="">Select your timezone...</option>
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        {errors.timezone && touched.timezone && (
          <p id={timezoneErrorId} role="alert" className="text-sm text-[color:var(--color-danger)] flex items-center gap-1">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            {errors.timezone}
          </p>
        )}
      </div>

      {/* Address Section (optional) */}
      <div className="border-t border-[color:var(--color-structure)] pt-4">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-[color:var(--color-ink-secondary)]" aria-hidden="true" />
          <span className="text-sm font-medium text-[color:var(--color-ink-secondary)]">
            Address (optional - skip if you prefer)
          </span>
        </div>

        <div className="space-y-4">
          {/* Street */}
          <div className="space-y-1">
            <label htmlFor={streetId} className={labelClass}>
              Street Address
            </label>
            <input
              id={streetId}
              type="text"
              value={data.addressStreet}
              onChange={e => onUpdate({ addressStreet: e.target.value })}
              placeholder="123 Main Street"
              autoComplete="street-address"
              className={inputClass(false)}
            />
          </div>

          {/* City / State Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={cityId} className={labelClass}>
                City
              </label>
              <input
                id={cityId}
                type="text"
                value={data.addressCity}
                onChange={e => onUpdate({ addressCity: e.target.value })}
                placeholder="San Francisco"
                autoComplete="address-level2"
                className={inputClass(false)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={stateId} className={labelClass}>
                State / Province
              </label>
              <input
                id={stateId}
                type="text"
                value={data.addressState}
                onChange={e => onUpdate({ addressState: e.target.value })}
                placeholder="CA"
                autoComplete="address-level1"
                className={inputClass(false)}
              />
            </div>
          </div>

          {/* Postal / Country Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={postalId} className={labelClass}>
                Postal Code
              </label>
              <input
                id={postalId}
                type="text"
                value={data.addressPostalCode}
                onChange={e => onUpdate({ addressPostalCode: e.target.value })}
                placeholder="94102"
                autoComplete="postal-code"
                className={inputClass(false)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={countryId} className={labelClass}>
                Country
              </label>
              <select
                id={countryId}
                value={data.addressCountry}
                onChange={e => onUpdate({ addressCountry: e.target.value })}
                autoComplete="country"
                className={cn(inputClass(false), 'appearance-none cursor-pointer')}
              >
                {COUNTRIES.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
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
          className="flex-[2] py-3 rounded-token font-semibold text-base flex items-center justify-center gap-2 transition-colors touch-manipulation bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98] min-h-[48px]"
        >
          Continue
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
