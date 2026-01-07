import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getVenueByOwnerId } from "@/lib/data/venues";
import { getFeedbackHistory } from "@/lib/data/feedback";
import { FeedbackPageClient } from "@/components/admin/FeedbackPageClient";
import type { FeedbackFilters } from "@/lib/db/types";

export const dynamic = 'force-dynamic';

interface FeedbackPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const params = await searchParams;

  // 1. Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Venue fetch
  const venue = await getVenueByOwnerId(user.id);

  if (!venue) {
    return (
      <div className="text-center py-12">
        <p className="text-[color:var(--color-ink-secondary)]">
          No venue found for your account. Please contact support.
        </p>
      </div>
    );
  }

  // 3. Parse filters from URL for initial data fetch
  const initialFilters: FeedbackFilters = {
    // Date range - use preset unless custom dates provided
    dateRangePreset: params.start
      ? undefined
      : (params.range as FeedbackFilters['dateRangePreset']) || '30d',
    startDate: typeof params.start === 'string' ? params.start : undefined,
    endDate: typeof params.end === 'string' ? params.end : undefined,
    // Sentiment filter
    sentiment: ['positive', 'neutral', 'negative'].includes(params.sentiment as string)
      ? (params.sentiment as FeedbackFilters['sentiment'])
      : undefined,
    // Rating type
    ratingType: ['game', 'venue', 'all'].includes(params.ratingType as string)
      ? (params.ratingType as FeedbackFilters['ratingType'])
      : 'all',
    // Has comment
    hasComment: params.hasComment === 'true',
    // Source
    source: ['end_sheet', 'staff_prompt', 'timer_prompt'].includes(params.source as string)
      ? (params.source as FeedbackFilters['source'])
      : undefined,
    // Search query
    search: typeof params.q === 'string' ? params.q : undefined,
  };

  // 4. Initial data fetch with URL filters
  const initialData = await getFeedbackHistory(venue.id, initialFilters);

  // 5. Render page with client component
  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">Feedback</p>
          <h1 className="text-3xl">Feedback History</h1>
        </div>
      </div>

      {/* Client component */}
      <FeedbackPageClient
        venueId={venue.id}
        initialData={initialData}
      />
    </>
  );
}
