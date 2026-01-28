'use client';

import { useTransition } from 'react';
import { promoteHiddenGem, retireGraveyardGame } from '@/app/admin/analytics/actions';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Star } from '@/components/icons';
import { useAppShell } from '@/components/AppShell';

interface AnalyticsActionsDialogProps {
  open: boolean;
  onClose: () => void;
  action: 'promote' | 'retire' | null;
  gameId: string | null;
  gameTitle: string | null;
  onComplete: () => void;
}

export function AnalyticsActionsDialog({
  open,
  onClose,
  action,
  gameId,
  gameTitle,
  onComplete,
}: AnalyticsActionsDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useAppShell();

  const handleConfirm = async () => {
    if (!gameId) return;

    startTransition(async () => {
      try {
        let result;
        if (action === 'promote') {
          result = await promoteHiddenGem(gameId);
        } else if (action === 'retire') {
          result = await retireGraveyardGame(gameId);
        } else {
          return;
        }

        if (result.success) {
          const message =
            action === 'promote'
              ? `"${gameTitle}" added as Staff Pick`
              : `"${gameTitle}" has been retired`;

          toast({
            message,
            tone: 'success',
          });
          onComplete();
        } else {
          toast({
            message: result.error || 'Failed to update game',
            tone: 'danger',
          });
        }
      } catch {
        toast({
          message: 'An unexpected error occurred',
          tone: 'danger',
        });
      }
    });
  };

  const handleClose = () => {
    if (!isPending) {
      onClose();
    }
  };

  const isPromote = action === 'promote';
  const isRetire = action === 'retire';

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isPromote && (
              <>
                <Star className="w-5 h-5 text-amber-500" />
                Promote as Staff Pick?
              </>
            )}
            {isRetire && (
              <>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Retire Game?
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPromote && (
              <>
                Add <span className="font-medium">{gameTitle}</span> to your staff recommendations
                in the Game Wizard. Players will see this highlighted as a staff pick.
              </>
            )}
            {isRetire && (
              <>
                Mark <span className="font-medium">{gameTitle}</span> as retired. The game will no
                longer be available for play, but you can reactivate it anytime.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={isPromote ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isPromote ? 'Yes, Promote' : 'Yes, Retire'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
