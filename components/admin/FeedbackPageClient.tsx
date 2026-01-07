'use client';

import type { FeedbackHistoryResult } from '@/lib/db/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from '@/components/icons';

interface FeedbackPageClientProps {
  venueId: string;
  initialData: FeedbackHistoryResult;
}

export function FeedbackPageClient({ venueId, initialData }: FeedbackPageClientProps) {
  return (
    <div className="grid gap-4">
      {/* Placeholder - will be built out in subsequent prompts */}
      <Card className="panel-surface">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-ink-secondary" />
            <CardTitle>Feedback History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-ink-secondary">
            {initialData.totalCount} feedback responses loaded.
            Full UI coming in next prompts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
