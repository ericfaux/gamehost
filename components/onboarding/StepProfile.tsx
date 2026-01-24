'use client';

import { useState, useId } from 'react';
import { cn } from '@/lib/utils';
import {
  User,
  Phone,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from '@/components/icons';
import type { OnboardingData } from './OnboardingWizard';

interface StepProfileProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface FormErrors {
  name?: string;
}

const JOB_TITLES = [
  { value: '', label: 'Select your role...' },
  { value: 'Owner', label: 'Owner' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Staff', label: 'Staff' },
  { value: 'Other', label: 'Other' },
];

export function StepProfile({ data, onUpdate, onNext, onBack }: StepProfileProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const nameInputId = useId();
  const nameErrorId = useId();
  const phoneInputId = useId();
  const jobTitleId = useId();

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field: string) => {
    const newErrors = { ...errors };

    if (field === 'name') {
      if (!data.name.trim()) {
        newErrors.name = 'Name is required';
      } else if (data.name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      } else {
        delete newErrors.name;
      }
    }

    setErrors(newErrors);
  };

  const validateAll = (): boolean => {
    const newErrors: FormErrors = {};

    if (!data.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (data.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    setTouched({ name: true });

    if (validateAll()) {
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
          Tell us about yourself
        </h2>
        <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
          We&apos;ll use this to personalize your experience
        </p>
      </div>

      {/* Name Input */}
      <div className="space-y-1">
        <label htmlFor={nameInputId} className={labelClass}>
          Your Name <span className="text-[color:var(--color-danger)]" aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <div className="relative">
          <User
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={nameInputId}
            type="text"
            value={data.name}
            onChange={e => {
              onUpdate({ name: e.target.value });
              if (touched.name) validateField('name');
            }}
            onBlur={() => handleBlur('name')}
            placeholder="Your full name"
            autoComplete="name"
            autoCapitalize="words"
            spellCheck="false"
            aria-required="true"
            aria-invalid={!!errors.name && touched.name}
            aria-describedby={errors.name && touched.name ? nameErrorId : undefined}
            className={inputClass(!!errors.name && touched.name)}
          />
        </div>
        {errors.name && touched.name && (
          <p id={nameErrorId} role="alert" className="text-sm text-[color:var(--color-danger)] flex items-center gap-1">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            {errors.name}
          </p>
        )}
      </div>

      {/* Phone Input (optional) */}
      <div className="space-y-1">
        <label htmlFor={phoneInputId} className={labelClass}>
          Phone <span className="text-[color:var(--color-ink-secondary)] normal-case">(optional)</span>
        </label>
        <div className="relative">
          <Phone
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={phoneInputId}
            type="tel"
            value={data.phone}
            onChange={e => onUpdate({ phone: e.target.value })}
            placeholder="(555) 123-4567"
            autoComplete="tel"
            inputMode="tel"
            className={inputClass(false)}
          />
        </div>
      </div>

      {/* Job Title Select (optional) */}
      <div className="space-y-1">
        <label htmlFor={jobTitleId} className={labelClass}>
          Your Role <span className="text-[color:var(--color-ink-secondary)] normal-case">(optional)</span>
        </label>
        <div className="relative">
          <Briefcase
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
            aria-hidden="true"
          />
          <select
            id={jobTitleId}
            value={data.jobTitle}
            onChange={e => onUpdate({ jobTitle: e.target.value })}
            className={cn(inputClass(false), 'appearance-none cursor-pointer')}
          >
            {JOB_TITLES.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-[color:var(--color-ink-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
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
