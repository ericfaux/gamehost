'use client';

import { createContext, useContext, useState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type Density = 'cozy' | 'compact';

interface DensityContextValue {
  density: Density;
  toggle: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const DensityContext = createContext<DensityContextValue | undefined>(undefined);

// =============================================================================
// HOOK
// =============================================================================

export function useDensity() {
  const ctx = useContext(DensityContext);
  if (!ctx) throw new Error('useDensity must be used within DensityProvider');
  return ctx;
}

// =============================================================================
// PROVIDER
// =============================================================================

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensity] = useState<Density>('cozy');

  const toggle = () => setDensity((prev) => (prev === 'cozy' ? 'compact' : 'cozy'));

  return (
    <DensityContext.Provider value={{ density, toggle }}>
      {children}
    </DensityContext.Provider>
  );
}
