import { Calendar } from 'lucide-react';

interface BookingsDisabledProps {
  venueName: string;
}

export function BookingsDisabled({ venueName }: BookingsDisabledProps) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-sm text-center">
        <Calendar className="w-12 h-12 mx-auto text-stone-300 mb-4" />
        <h1 className="text-xl font-serif font-bold mb-2">
          Reservations Not Available
        </h1>
        <p className="text-stone-600">
          {venueName} isn&apos;t currently accepting online reservations.
          Please contact them directly to book a table.
        </p>
      </div>
    </div>
  );
}
