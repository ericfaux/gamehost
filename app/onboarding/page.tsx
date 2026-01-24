import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getVenueByOwnerId } from '@/lib/data/venues';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import type { Profile } from '@/lib/db/types';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // If user already has a venue, redirect to admin
  const existingVenue = await getVenueByOwnerId(user.id);
  if (existingVenue) {
    redirect('/admin');
  }

  // Fetch existing profile for pre-filling (may not exist yet)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <OnboardingWizard
      userId={user.id}
      userEmail={user.email ?? ''}
      existingProfile={profile as Profile | null}
    />
  );
}
