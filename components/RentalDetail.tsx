"use client";

import { useState } from "react";

const WAIVER_TEXT = `By signing this waiver, you acknowledge and agree to the following terms and conditions for the rental of board games from this establishment. You accept full responsibility for any damage, loss, or theft of the rented games during the rental period. You agree to return all game components in the same condition as received. You understand that replacement costs may be assessed for any missing or damaged components. You agree to handle all game materials with care and follow any specific instructions provided for delicate or specialty items.`;

export type Rental = {
  id: string;
  guest_name: string;
  guest_email?: string | null;
  guest_phone?: string | null;
  game_id: string;
  game_name: string;
  rental_start: string;
  rental_end?: string | null;
  status: "active" | "returned" | "overdue";
  waiver_signed: boolean;
  waiver_signed_at?: string | null;
  notes?: string | null;
  guest_ip?: string | null;
  user_agent?: string | null;
  waiver_version?: string | null;
};

interface RentalDetailProps {
  rental: Rental;
  onClose?: () => void;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "Not available";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export default function RentalDetail({ rental, onClose }: RentalDetailProps) {
  const [showWaiver, setShowWaiver] = useState(false);

  const formattedRentalStart = formatDate(rental.rental_start);
  const formattedRentalEnd = formatDate(rental.rental_end);
  const formattedWaiverDate = formatDate(rental.waiver_signed_at);

  const statusColors = {
    active: "bg-green-100 text-green-800",
    returned: "bg-gray-100 text-gray-800",
    overdue: "bg-red-100 text-red-800",
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Rental Details</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Guest Name</label>
            <p className="text-gray-900">{rental.guest_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <p>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[rental.status]}`}
              >
                {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Game</label>
            <p className="text-gray-900">{rental.game_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Rental ID</label>
            <p className="text-gray-900 font-mono text-sm">{rental.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Start Time</label>
            <p className="text-gray-900">{formattedRentalStart}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">End Time</label>
            <p className="text-gray-900">{formattedRentalEnd}</p>
          </div>
        </div>

        {rental.notes && (
          <div>
            <label className="text-sm font-medium text-gray-500">Notes</label>
            <p className="text-gray-900">{rental.notes}</p>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-500">Waiver Status</label>
              <p className="text-gray-900">
                {rental.waiver_signed ? (
                  <span className="text-green-600 font-medium">✓ Signed</span>
                ) : (
                  <span className="text-red-600 font-medium">✗ Not Signed</span>
                )}
              </p>
            </div>
            {rental.waiver_signed && (
              <button
                onClick={() => setShowWaiver(!showWaiver)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showWaiver ? "Hide Waiver" : "View Waiver"}
              </button>
            )}
          </div>

          {showWaiver && rental.waiver_signed && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Signed Waiver Agreement
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {WAIVER_TEXT}
              </p>
              <div className="mt-6 border-t border-gray-200 pt-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Digital Chain of Custody
                </p>
                <div className="font-mono text-[10px] text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Signed By:</span>
                    <span className="text-gray-900">{rental.guest_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timestamp:</span>
                    <span className="text-gray-900">{formattedWaiverDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IP Address:</span>
                    <span className="text-gray-900">{rental.guest_ip || "Not Recorded"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Device:</span>
                    <span className="text-gray-900 truncate max-w-[200px]" title={rental.user_agent || ""}>
                      {rental.user_agent || "Not Recorded"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span className="text-gray-900">{rental.waiver_version || "1.0"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
