"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

const venues = ["Flagship · Midtown", "Annex · East", "Pop-up · Con"];

export function TopBar() {
  const [activeVenue, setActiveVenue] = useState(venues[0]);
  const [query, setQuery] = useState("");

  return (
    <header className="flex items-center justify-between border-b border-stroke bg-card/70 backdrop-blur-sm px-6 py-4">
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-ink-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for games..."
            className="w-full rounded-token border border-stroke bg-card/70 pl-11 pr-4 py-2 text-sm font-medium shadow-inner shadow-stroke/40 focus:border-ink-primary focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-ink-primary/10"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {venues.map((venue) => (
          <button
            key={venue}
            onClick={() => setActiveVenue(venue)}
            className={cn(
              "px-3 py-2 rounded-token text-sm font-semibold border transition-colors",
              activeVenue === venue
                ? "bg-accent-primary text-card border-ink-primary/20 shadow-token"
                : "bg-card text-ink-secondary border-stroke hover:text-ink-primary"
            )}
            type="button"
          >
            {venue}
          </button>
        ))}
      </div>
    </header>
  );
}
