'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Gamepad2, Wrench, QrCode, Plus, UserPlus } from '@/components/icons';

export interface QuickActionsProps {
  browsingCount: number;
  onAssignGame: () => void;
  onSeatWalkIn: () => void;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  badge?: number;
  primary?: boolean;
}

function ActionButton({ icon, label, onClick, href, badge, primary }: ActionButtonProps) {
  const buttonClasses = cn(
    // Base styling with large tap targets
    'relative flex items-center gap-3 w-full py-4 px-5',
    'rounded-xl border transition-all duration-150',
    'shadow-card hover:shadow-token',
    'active:scale-[0.98] active:shadow-soft',
    'focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/50 focus:ring-offset-2',
    // Primary (accent) vs outline styling
    primary
      ? 'bg-[color:var(--color-accent)] border-[color:var(--color-accent)] text-white hover:brightness-110'
      : 'bg-[color:var(--color-elevated)] border-[color:var(--color-structure)] text-[color:var(--color-ink-primary)] hover:border-[color:var(--color-structure-strong)]',
  );

  const content = (
    <>
      <span className={cn('shrink-0', primary ? 'text-white' : 'text-[color:var(--color-ink-secondary)]')}>
        {icon}
      </span>
      <span className="font-semibold text-base">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            'absolute top-2 right-2',
            'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full',
            'text-xs font-bold',
            primary
              ? 'bg-white text-[color:var(--color-accent)]'
              : 'bg-[color:var(--color-accent)] text-white',
          )}
        >
          {badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={buttonClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={buttonClasses}>
      {content}
    </button>
  );
}

/**
 * QuickActions - Big tactile buttons for high-frequency operator actions.
 * Designed to feel like a physical control panel with large touch targets.
 */
export function QuickActions({ browsingCount, onAssignGame, onSeatWalkIn }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ActionButton
          icon={<UserPlus className="w-5 h-5" />}
          label="Seat Walk-In"
          onClick={onSeatWalkIn}
          primary
        />
        <ActionButton
          icon={<Gamepad2 className="w-5 h-5" />}
          label="Assign game"
          onClick={onAssignGame}
          badge={browsingCount > 0 ? browsingCount : undefined}
        />
        <ActionButton
          icon={<Wrench className="w-5 h-5" />}
          label="Mark for repair"
          href="/admin/library?filter=problematic"
        />
        <ActionButton
          icon={<QrCode className="w-5 h-5" />}
          label="Print QRs"
          href="/admin/floorplan?view=list"
        />
        <ActionButton
          icon={<Plus className="w-5 h-5" />}
          label="Add game"
          href="/admin/library?action=add"
        />
      </CardContent>
    </Card>
  );
}
