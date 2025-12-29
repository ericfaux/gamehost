"use client";

import type React from "react";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useMockData } from "../context/MockDataContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function AddGameModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addGame } = useMockData();
  const [title, setTitle] = useState("");
  const [bgg, setBgg] = useState("");
  const [players, setPlayers] = useState("2-4");
  const [time, setTime] = useState("45-60m");
  const [location, setLocation] = useState("New Shelf");
  const labelClassName = "text-xs font-bold text-ink-secondary uppercase tracking-wider mb-1 block";

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addGame({ title, bggLink: bgg, players, time, location, complexity: "Medium" });
    setTitle("");
    setBgg("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-primary/50">
      <div className="bg-card border-2 border-stroke shadow-floating rounded-2xl max-w-lg w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stroke bg-paper">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-accent-primary text-card flex items-center justify-center shadow-token">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-ledger text-ink-secondary">Add to ledger</p>
              <p className="text-lg font-serif text-ink-primary">New Game Entry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-stroke hover:bg-highlight flex items-center justify-center text-ink-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClassName}>Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Catan" required />
            </div>
            <div>
              <label className={labelClassName}>BGG Link</label>
              <Input value={bgg} onChange={(e) => setBgg(e.target.value)} placeholder="https://" />
            </div>
            <div>
              <label className={labelClassName}>Players</label>
              <Input value={players} onChange={(e) => setPlayers(e.target.value)} placeholder="2-4" />
            </div>
            <div>
              <label className={labelClassName}>Time</label>
              <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="45-60m" />
            </div>
            <div className="col-span-2">
              <label className={labelClassName}>Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Aisle A · Shelf 3" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="px-5">
              Add Game
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
