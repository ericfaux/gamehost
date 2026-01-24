import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Set Up Your Venue | GameLedger',
  description: 'Complete your venue setup to start managing your board game cafe',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {children}
      </div>
    </div>
  );
}
