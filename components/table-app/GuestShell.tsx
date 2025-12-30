/**
 * GuestShell - Consistent layout wrapper for guest-facing pages.
 * Provides the "Tabletop Tactile" background treatment and centered container.
 */

import { ReactNode } from 'react';

interface GuestShellProps {
  children: ReactNode;
  /** Additional class names for the main element */
  className?: string;
  /** Whether to use full height (min-h-screen) or natural height */
  fullHeight?: boolean;
  /** Whether to center content vertically (for landing/error states) */
  centerContent?: boolean;
}

export function GuestShell({
  children,
  className = '',
  fullHeight = true,
  centerContent = false,
}: GuestShellProps) {
  return (
    <main
      className={`
        rulebook-grid
        ${fullHeight ? 'min-h-screen' : ''}
        ${centerContent ? 'flex flex-col items-center justify-center' : ''}
        ${className}
      `.trim()}
    >
      {children}
    </main>
  );
}

interface GuestContainerProps {
  children: ReactNode;
  /** Container max width variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

/**
 * GuestContainer - Centered content container for guest pages.
 */
export function GuestContainer({
  children,
  size = 'md',
  className = '',
}: GuestContainerProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className={`w-full ${sizeClasses[size]} mx-auto px-4 ${className}`}>
      {children}
    </div>
  );
}
