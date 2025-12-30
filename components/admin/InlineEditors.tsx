'use client';

/**
 * Inline Editors - Quick-edit components for the Game Ledger table.
 *
 * These components provide inline editing for high-frequency fields:
 * - StatusSelect: Dropdown for game status
 * - ConditionSelect: Dropdown for game condition
 * - CopiesStepper: +/- stepper for copies in rotation
 * - LocationInput: Inline text input for shelf location
 */

import { useState, useRef, useEffect, useTransition } from 'react';
import { Plus, Minus, Check, X, Loader2, AlertCircle } from '@/components/icons';
import { useToast } from '@/components/AppShell';
import { updateGameField } from '@/app/admin/library/actions';
import type { GameStatus, GameCondition } from '@/lib/db/types';

// Status options with labels and colors
const STATUS_OPTIONS: { value: GameStatus; label: string; className: string }[] = [
  {
    value: 'in_rotation',
    label: 'In rotation',
    className: 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]'
  },
  {
    value: 'out_for_repair',
    label: 'Out for repair',
    className: 'bg-[color:var(--color-warn)]/10 text-[color:var(--color-warn)]'
  },
  {
    value: 'retired',
    label: 'Retired',
    className: 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-secondary)]'
  },
  {
    value: 'for_sale',
    label: 'For sale',
    className: 'bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]'
  },
];

// Condition options with labels and tones
const CONDITION_OPTIONS: { value: GameCondition; label: string; tone: 'default' | 'warn' }[] = [
  { value: 'new', label: 'New', tone: 'default' },
  { value: 'good', label: 'Good', tone: 'default' },
  { value: 'worn', label: 'Worn', tone: 'default' },
  { value: 'problematic', label: 'Problematic', tone: 'warn' },
];

interface InlineEditorProps {
  gameId: string;
  onUpdate?: () => void;
}

/**
 * Inline Status Select - Dropdown for game status
 */
export function StatusSelect({
  gameId,
  currentValue,
  onUpdate
}: InlineEditorProps & { currentValue: GameStatus }) {
  const { push } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localValue, setLocalValue] = useState(currentValue);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync with prop changes
  useEffect(() => {
    setLocalValue(currentValue);
  }, [currentValue]);

  const currentOption = STATUS_OPTIONS.find(opt => opt.value === localValue) ?? STATUS_OPTIONS[0];

  const handleSelect = (value: GameStatus) => {
    if (value === localValue) {
      setIsOpen(false);
      return;
    }

    // Optimistic update
    const previousValue = localValue;
    setLocalValue(value);
    setIsOpen(false);

    startTransition(async () => {
      const result = await updateGameField(gameId, 'status', value);
      if (result.success) {
        push({ title: 'Status updated', tone: 'success' });
        onUpdate?.();
      } else {
        // Revert on failure
        setLocalValue(previousValue);
        push({ title: 'Failed to update', description: result.error, tone: 'danger' });
      }
    });
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`
          px-3 py-1 text-xs font-semibold rounded-full border border-[color:var(--color-structure)]
          whitespace-nowrap transition-all cursor-pointer
          ${currentOption.className}
          ${isPending ? 'opacity-50' : 'hover:ring-2 hover:ring-[color:var(--color-accent)]/20'}
        `}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        ) : (
          currentOption.label
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] bg-[color:var(--color-elevated)] border border-[color:var(--color-structure)] rounded-lg shadow-card py-1">
          {STATUS_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`
                w-full px-3 py-2 text-left text-xs font-medium
                hover:bg-[color:var(--color-muted)] transition-colors
                flex items-center justify-between
                ${option.value === localValue ? 'bg-[color:var(--color-muted)]' : ''}
              `}
            >
              <span className={`px-2 py-0.5 rounded-full ${option.className}`}>
                {option.label}
              </span>
              {option.value === localValue && (
                <Check className="h-3 w-3 text-[color:var(--color-accent)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Inline Condition Select - Dropdown for game condition
 */
export function ConditionSelect({
  gameId,
  currentValue,
  onUpdate
}: InlineEditorProps & { currentValue: GameCondition }) {
  const { push } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localValue, setLocalValue] = useState(currentValue);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync with prop changes
  useEffect(() => {
    setLocalValue(currentValue);
  }, [currentValue]);

  const currentOption = CONDITION_OPTIONS.find(opt => opt.value === localValue) ?? CONDITION_OPTIONS[0];

  const getChipClasses = (tone: 'default' | 'warn') => {
    if (tone === 'warn') {
      return 'bg-[color:var(--color-warn)]/10 border-[color:var(--color-warn)]/20 text-[color:var(--color-warn)]';
    }
    return 'bg-[color:var(--color-muted)] border-[color:var(--color-structure)] text-[color:var(--color-ink-secondary)]';
  };

  const handleSelect = (value: GameCondition) => {
    if (value === localValue) {
      setIsOpen(false);
      return;
    }

    // Optimistic update
    const previousValue = localValue;
    setLocalValue(value);
    setIsOpen(false);

    startTransition(async () => {
      const result = await updateGameField(gameId, 'condition', value);
      if (result.success) {
        push({ title: 'Condition updated', tone: 'success' });
        onUpdate?.();
      } else {
        // Revert on failure
        setLocalValue(previousValue);
        push({ title: 'Failed to update', description: result.error, tone: 'danger' });
      }
    });
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`
          inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-card
          transition-all cursor-pointer
          ${getChipClasses(currentOption.tone)}
          ${isPending ? 'opacity-50' : 'hover:ring-2 hover:ring-[color:var(--color-accent)]/20'}
        `}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        ) : (
          currentOption.label
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[120px] bg-[color:var(--color-elevated)] border border-[color:var(--color-structure)] rounded-lg shadow-card py-1">
          {CONDITION_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`
                w-full px-3 py-2 text-left text-xs font-medium
                hover:bg-[color:var(--color-muted)] transition-colors
                flex items-center justify-between
                ${option.value === localValue ? 'bg-[color:var(--color-muted)]' : ''}
              `}
            >
              <span className={`px-2 py-0.5 rounded-full border ${getChipClasses(option.tone)}`}>
                {option.label}
              </span>
              {option.value === localValue && (
                <Check className="h-3 w-3 text-[color:var(--color-accent)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Inline Copies Stepper - +/- controls for copies in rotation
 */
export function CopiesStepper({
  gameId,
  currentValue,
  onUpdate
}: InlineEditorProps & { currentValue: number }) {
  const { push } = useToast();
  const [isPending, startTransition] = useTransition();
  const [localValue, setLocalValue] = useState(currentValue);

  // Sync with prop changes
  useEffect(() => {
    setLocalValue(currentValue);
  }, [currentValue]);

  const handleChange = (delta: number) => {
    const newValue = Math.max(0, localValue + delta);
    if (newValue === localValue) return;

    // Optimistic update
    const previousValue = localValue;
    setLocalValue(newValue);

    startTransition(async () => {
      const result = await updateGameField(gameId, 'copies_in_rotation', newValue);
      if (result.success) {
        push({ title: `Copies set to ${newValue}`, tone: 'success' });
        onUpdate?.();
      } else {
        // Revert on failure
        setLocalValue(previousValue);
        push({ title: 'Failed to update', description: result.error, tone: 'danger' });
      }
    });
  };

  return (
    <div className="inline-flex items-center gap-0.5 bg-[color:var(--color-muted)] rounded-lg border border-[color:var(--color-structure)]">
      <button
        onClick={() => handleChange(-1)}
        disabled={isPending || localValue === 0}
        className="p-1.5 hover:bg-[color:var(--color-structure)] rounded-l-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Decrease copies"
      >
        <Minus className="h-3 w-3 text-[color:var(--color-ink-secondary)]" />
      </button>
      <span className={`
        min-w-[24px] text-center text-sm font-semibold tabular-nums
        ${isPending ? 'text-[color:var(--color-ink-secondary)]' : 'text-[color:var(--color-ink-primary)]'}
      `}>
        {isPending ? '...' : localValue}
      </span>
      <button
        onClick={() => handleChange(1)}
        disabled={isPending}
        className="p-1.5 hover:bg-[color:var(--color-structure)] rounded-r-lg transition-colors disabled:opacity-40"
        aria-label="Increase copies"
      >
        <Plus className="h-3 w-3 text-[color:var(--color-ink-secondary)]" />
      </button>
    </div>
  );
}

/**
 * Inline Location Input - Text input for shelf location (save on blur)
 */
export function LocationInput({
  gameId,
  currentValue,
  onUpdate
}: InlineEditorProps & { currentValue: string | null }) {
  const { push } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localValue, setLocalValue] = useState(currentValue ?? '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with prop changes
  useEffect(() => {
    setLocalValue(currentValue ?? '');
  }, [currentValue]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedValue = localValue.trim();
    const previousValue = currentValue ?? '';

    // Don't save if unchanged
    if (trimmedValue === previousValue) {
      setIsEditing(false);
      return;
    }

    setIsEditing(false);
    setError(null);

    startTransition(async () => {
      const result = await updateGameField(gameId, 'shelf_location', trimmedValue);
      if (result.success) {
        push({ title: 'Location updated', tone: 'success' });
        onUpdate?.();
      } else {
        // Revert on failure
        setLocalValue(previousValue);
        setError(result.error ?? 'Failed to update');
        push({ title: 'Failed to update', description: result.error, tone: 'danger' });
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setLocalValue(currentValue ?? '');
      setIsEditing(false);
      setError(null);
    }
  };

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className={`
            w-full max-w-[100px] px-2 py-1 text-xs font-mono
            rounded border transition-colors
            ${error
              ? 'border-[color:var(--color-danger)] bg-[color:var(--color-danger)]/5'
              : 'border-[color:var(--color-accent)] bg-[color:var(--color-elevated)]'
            }
            focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/20
          `}
          placeholder="e.g., A3"
        />
        {isPending && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <Loader2 className="h-3 w-3 animate-spin text-[color:var(--color-accent)]" />
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={`
        font-mono text-xs px-2 py-1 rounded
        transition-colors cursor-pointer
        ${localValue
          ? 'text-[color:var(--color-ink-primary)]'
          : 'text-[color:var(--color-ink-secondary)] italic'
        }
        hover:bg-[color:var(--color-muted)] hover:ring-1 hover:ring-[color:var(--color-accent)]/20
        ${error ? 'ring-1 ring-[color:var(--color-danger)]' : ''}
      `}
      title="Click to edit location"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        localValue || '—'
      )}
    </button>
  );
}

/**
 * Full Chip - Displayed when all copies of a game are in use (bottlenecked)
 * Shows a hint about how to resolve the bottleneck
 */
export function FullChip({ copiesInUse, copiesInRotation }: { copiesInUse: number; copiesInRotation: number }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className="
          inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
          bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)] border border-[color:var(--color-danger)]/20
          cursor-help
        "
      >
        <AlertCircle className="h-3 w-3" />
        Full
      </span>

      {showTooltip && (
        <div className="
          absolute left-0 top-full mt-2 z-50
          px-3 py-2 text-xs text-[color:var(--color-ink-primary)]
          bg-[color:var(--color-elevated)] border border-[color:var(--color-structure)]
          rounded-lg shadow-card w-48
        ">
          <p className="font-medium mb-1">All copies in use</p>
          <p className="text-[color:var(--color-ink-secondary)]">
            {copiesInUse}/{copiesInRotation} copies are being played.
            Increase copies or end a session using this game.
          </p>
        </div>
      )}
    </div>
  );
}
