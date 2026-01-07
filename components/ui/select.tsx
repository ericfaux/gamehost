'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from '@/components/icons';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType | null>(null);

export function Select({
  value,
  onValueChange,
  children,
  placeholder = 'Select...',
  className,
  disabled,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Find the selected item's label
  const childArray = React.Children.toArray(children);
  const selectedChild = childArray.find(
    (child): child is React.ReactElement<SelectItemProps> =>
      React.isValidElement<SelectItemProps>(child) && child.props.value === value
  );
  const displayValue = selectedChild ? selectedChild.props.children : placeholder;

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div ref={containerRef} className={cn('relative', className)}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center justify-between rounded-token border border-[color:var(--color-structure)] bg-[color:var(--color-elevated)] px-3 py-2 text-sm shadow-card focus-ring',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span
            className={
              value
                ? 'text-[color:var(--color-ink-primary)]'
                : 'text-[color:var(--color-ink-secondary)]'
            }
          >
            {displayValue}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-[color:var(--color-ink-secondary)] transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-[color:var(--color-surface)] rounded-token border border-[color:var(--color-structure)] shadow-lg py-1 max-h-60 overflow-auto">
            {children}
          </div>
        )}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SelectItem({ value, children, disabled }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within a Select');

  const { value: selectedValue, onValueChange, setOpen } = context;
  const isSelected = value === selectedValue;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onValueChange(value);
        setOpen(false);
      }}
      className={cn(
        'w-full px-3 py-2 text-sm text-left transition-colors',
        isSelected
          ? 'bg-[color:var(--color-muted)] text-[color:var(--color-ink-primary)] font-medium'
          : 'text-[color:var(--color-ink-primary)] hover:bg-[color:var(--color-muted)]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}
