'use client';

import { useState, useId } from 'react';
import { cn } from '@/lib/utils';
import {
  User,
  Mail,
  Phone,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from '@/components/icons';
import type { BookingData } from './BookingWizard';
import type { VenueBookingSettings } from '@/lib/db/types';

interface StepDetailsProps {
  data: BookingData;
  settings: VenueBookingSettings;
  onUpdate: (updates: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface FormErrors {
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  contact?: string;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation - accepts various formats
function isValidPhone(phone: string): boolean {
  const digitsOnly = phone.replace(/[\s\-().+]/g, '');
  return /^\d{7,15}$/.test(digitsOnly);
}

export function StepDetails({
  data,
  settings,
  onUpdate,
  onNext,
  onBack,
}: StepDetailsProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Generate unique IDs for accessibility
  const nameInputId = useId();
  const nameErrorId = useId();
  const emailInputId = useId();
  const emailErrorId = useId();
  const emailDescId = useId();
  const phoneInputId = useId();
  const phoneErrorId = useId();
  const notesInputId = useId();
  const notesDescId = useId();
  const contactErrorId = useId();

  // Mark field as touched on blur
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };

  // Validate individual field
  const validateField = (field: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'guestName':
        if (!data.guestName.trim()) {
          newErrors.guestName = 'Name is required';
        } else {
          delete newErrors.guestName;
        }
        break;

      case 'guestEmail':
        if (settings.require_email && !data.guestEmail.trim()) {
          newErrors.guestEmail = 'Email is required';
        } else if (data.guestEmail.trim() && !EMAIL_REGEX.test(data.guestEmail)) {
          newErrors.guestEmail = 'Please enter a valid email';
        } else {
          delete newErrors.guestEmail;
        }
        break;

      case 'guestPhone':
        if (settings.require_phone && !data.guestPhone.trim()) {
          newErrors.guestPhone = 'Phone is required';
        } else if (data.guestPhone.trim() && !isValidPhone(data.guestPhone)) {
          newErrors.guestPhone = 'Please enter a valid phone number';
        } else {
          delete newErrors.guestPhone;
        }
        break;
    }

    setErrors(newErrors);
  };

  // Validate all fields
  const validateAll = (): boolean => {
    const newErrors: FormErrors = {};

    // Name is always required
    if (!data.guestName.trim()) {
      newErrors.guestName = 'Name is required';
    }

    // Email validation
    if (settings.require_email && !data.guestEmail.trim()) {
      newErrors.guestEmail = 'Email is required';
    } else if (data.guestEmail.trim() && !EMAIL_REGEX.test(data.guestEmail)) {
      newErrors.guestEmail = 'Please enter a valid email';
    }

    // Phone validation
    if (settings.require_phone && !data.guestPhone.trim()) {
      newErrors.guestPhone = 'Phone is required';
    } else if (data.guestPhone.trim() && !isValidPhone(data.guestPhone)) {
      newErrors.guestPhone = 'Please enter a valid phone number';
    }

    // At least one contact method required
    if (!data.guestEmail.trim() && !data.guestPhone.trim()) {
      newErrors.contact = 'Please provide at least one contact method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleNext = () => {
    setTouched({
      guestName: true,
      guestEmail: true,
      guestPhone: true,
    });

    if (validateAll()) {
      onNext();
    }
  };

  const inputClass = (hasError: boolean) =>
    cn(
      'w-full rounded-token border bg-[color:var(--color-elevated)] pl-11 pr-4 py-3 text-base shadow-card focus-ring',
      'min-h-[48px]', // Touch target
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
          Your Details
        </h2>
        <p className="text-sm text-[color:var(--color-ink-secondary)] mt-1">
          Let us know how to contact you
        </p>
      </div>

      {/* Contact Method Warning */}
      {errors.contact && touched.guestEmail && touched.guestPhone && (
        <div
          id={contactErrorId}
          role="alert"
          className="flex items-start gap-2 p-3 bg-amber-50 rounded-token border border-amber-200"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-amber-800">{errors.contact}</p>
        </div>
      )}

      {/* Name Input */}
      <div className="space-y-1">
        <label htmlFor={nameInputId} className={labelClass}>
          Name <span className="text-[color:var(--color-danger)]" aria-hidden="true">*</span>
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
            value={data.guestName}
            onChange={e => {
              onUpdate({ guestName: e.target.value });
              if (touched.guestName) validateField('guestName');
            }}
            onBlur={() => handleBlur('guestName')}
            placeholder="Your name"
            autoComplete="name"
            autoCapitalize="words"
            spellCheck="false"
            aria-required="true"
            aria-invalid={!!errors.guestName && touched.guestName}
            aria-describedby={errors.guestName && touched.guestName ? nameErrorId : undefined}
            className={inputClass(!!errors.guestName && touched.guestName)}
          />
        </div>
        {errors.guestName && touched.guestName && (
          <p id={nameErrorId} role="alert" className="text-sm text-[color:var(--color-danger)]">
            {errors.guestName}
          </p>
        )}
      </div>

      {/* Email Input */}
      <div className="space-y-1">
        <label htmlFor={emailInputId} className={labelClass}>
          Email{' '}
          {settings.require_email && (
            <>
              <span className="text-[color:var(--color-danger)]" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </>
          )}
        </label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={emailInputId}
            type="email"
            value={data.guestEmail}
            onChange={e => {
              onUpdate({ guestEmail: e.target.value });
              if (touched.guestEmail) validateField('guestEmail');
            }}
            onBlur={() => handleBlur('guestEmail')}
            placeholder="your@email.com"
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
            inputMode="email"
            spellCheck="false"
            aria-required={settings.require_email}
            aria-invalid={!!errors.guestEmail && touched.guestEmail}
            aria-describedby={cn(
              emailDescId,
              errors.guestEmail && touched.guestEmail ? emailErrorId : ''
            )}
            className={inputClass(!!errors.guestEmail && touched.guestEmail)}
          />
        </div>
        {errors.guestEmail && touched.guestEmail && (
          <p id={emailErrorId} role="alert" className="text-sm text-[color:var(--color-danger)]">
            {errors.guestEmail}
          </p>
        )}
        <p id={emailDescId} className="text-xs text-[color:var(--color-ink-secondary)]">
          We&apos;ll send your confirmation here
        </p>
      </div>

      {/* Phone Input */}
      <div className="space-y-1">
        <label htmlFor={phoneInputId} className={labelClass}>
          Phone{' '}
          {settings.require_phone && (
            <>
              <span className="text-[color:var(--color-danger)]" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </>
          )}
        </label>
        <div className="relative">
          <Phone
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
            aria-hidden="true"
          />
          <input
            id={phoneInputId}
            type="tel"
            value={data.guestPhone}
            onChange={e => {
              onUpdate({ guestPhone: e.target.value });
              if (touched.guestPhone) validateField('guestPhone');
            }}
            onBlur={() => handleBlur('guestPhone')}
            placeholder="(555) 123-4567"
            autoComplete="tel"
            inputMode="tel"
            aria-required={settings.require_phone}
            aria-invalid={!!errors.guestPhone && touched.guestPhone}
            aria-describedby={errors.guestPhone && touched.guestPhone ? phoneErrorId : undefined}
            className={inputClass(!!errors.guestPhone && touched.guestPhone)}
          />
        </div>
        {errors.guestPhone && touched.guestPhone && (
          <p id={phoneErrorId} role="alert" className="text-sm text-[color:var(--color-danger)]">
            {errors.guestPhone}
          </p>
        )}
      </div>

      {/* Special Requests */}
      <div className="space-y-1">
        <label htmlFor={notesInputId} className={labelClass}>
          Special Requests{' '}
          <span className="text-[color:var(--color-ink-secondary)] normal-case">(optional)</span>
        </label>
        <div className="relative">
          <StickyNote
            className="absolute left-3 top-3 w-5 h-5 text-[color:var(--color-ink-secondary)] pointer-events-none"
            aria-hidden="true"
          />
          <textarea
            id={notesInputId}
            value={data.notes}
            onChange={e => onUpdate({ notes: e.target.value })}
            placeholder="Accessibility needs, celebrations, etc."
            rows={3}
            aria-describedby={notesDescId}
            className="w-full rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] pl-11 pr-4 py-3 text-base shadow-card focus-ring resize-none min-h-[88px]"
          />
        </div>
        <p id={notesDescId} className="text-xs text-[color:var(--color-ink-secondary)]">
          Let us know if you have any special requirements
        </p>
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
