"use client";

import type React from "react";
import { createContext, useContext, useMemo, useState } from "react";

type GameStatus = "available" | "in_use" | "maintenance";

type Game = {
  id: string;
  title: string;
  status: GameStatus;
  location: string;
  players: string;
  time: string;
  complexity: string;
  condition: string;
  bggLink?: string;
};

type Session = {
  id: string;
  table: string;
  gameId: string;
  startedAt: number;
};

type MaintenanceIssue = {
  id: string;
  title: string;
  detail?: string;
  status: "open" | "fixed";
  reportedAt: string;
};

type MockDataContextValue = {
  games: Game[];
  sessions: Session[];
  maintenance: MaintenanceIssue[];
  addGame: (game: Omit<Game, "id" | "status" | "condition"> & { condition?: string }) => void;
  startSession: (table: string, gameId: string) => void;
  endSession: (sessionId: string) => void;
  toggleIssue: (issueId: string) => void;
};

const initialGames: Game[] = [
  {
    id: "catan",
    title: "Catan",
    status: "available",
    location: "Aisle A · Shelf 3",
    players: "3-4",
    time: "60-90m",
    complexity: "Medium",
    condition: "Well-loved",
    bggLink: "https://boardgamegeek.com/boardgame/13/catan",
  },
  {
    id: "azul",
    title: "Azul",
    status: "in_use",
    location: "Aisle B · Shelf 2",
    players: "2-4",
    time: "30-45m",
    complexity: "Light",
    condition: "Excellent",
    bggLink: "https://boardgamegeek.com/boardgame/230802/azul",
  },
  {
    id: "wingspan",
    title: "Wingspan",
    status: "available",
    location: "Feature Table",
    players: "1-5",
    time: "40-70m",
    complexity: "Medium",
    condition: "New Arrival",
  },
  {
    id: "gloomhaven",
    title: "Gloomhaven",
    status: "maintenance",
    location: "Back Room",
    players: "1-4",
    time: "90-150m",
    complexity: "Heavy",
    condition: "Check minis",
  },
  {
    id: "cascadia",
    title: "Cascadia",
    status: "available",
    location: "Aisle C · Shelf 1",
    players: "1-4",
    time: "30-45m",
    complexity: "Light",
    condition: "Great",
  },
  {
    id: "decrypto",
    title: "Decrypto",
    status: "available",
    location: "Front Counter",
    players: "3-8",
    time: "25-40m",
    complexity: "Medium",
    condition: "Sleeved",
  },
  {
    id: "spirit-island",
    title: "Spirit Island",
    status: "available",
    location: "Aisle D · Shelf 4",
    players: "1-4",
    time: "90-150m",
    complexity: "Heavy",
    condition: "Complete",
  },
  {
    id: "ticket-to-ride",
    title: "Ticket to Ride",
    status: "available",
    location: "Aisle B · Shelf 1",
    players: "2-5",
    time: "45-60m",
    complexity: "Light",
    condition: "Good",
  },
  {
    id: "root",
    title: "Root",
    status: "available",
    location: "Aisle D · Shelf 2",
    players: "2-4",
    time: "60-90m",
    complexity: "Heavy",
    condition: "Inventory",
  },
  {
    id: "cartographers",
    title: "Cartographers",
    status: "available",
    location: "Sketch Station",
    players: "1-8",
    time: "30-45m",
    complexity: "Light",
    condition: "Pads stocked",
  },
  {
    id: "brass-birmingham",
    title: "Brass: Birmingham",
    status: "available",
    location: "Aisle E · Shelf 3",
    players: "2-4",
    time: "90-150m",
    complexity: "Heavy",
    condition: "Deluxe",
  },
  {
    id: "heat",
    title: "Heat: Pedal to the Metal",
    status: "available",
    location: "Aisle A · Feature",
    players: "1-6",
    time: "45-90m",
    complexity: "Medium",
    condition: "Track tiles",
  },
];

const initialSessions: Session[] = [
  {
    id: "session-1",
    table: "Table 2",
    gameId: "azul",
    startedAt: Date.now() - 12 * 60 * 1000,
  },
];

const initialIssues: MaintenanceIssue[] = [
  {
    id: "issue-1",
    title: "Torn box corner",
    detail: "Catan copy #2 - needs tape reinforcement",
    status: "open",
    reportedAt: "Today 9:20",
  },
  {
    id: "issue-2",
    title: "Missing blue dice",
    detail: "King of Tokyo expansion set",
    status: "open",
    reportedAt: "Yesterday 18:40",
  },
  {
    id: "issue-3",
    title: "Sleeves fraying",
    detail: "Dominion base set",
    status: "fixed",
    reportedAt: "Yesterday 12:10",
  },
];

const MockDataContext = createContext<MockDataContextValue | undefined>(undefined);

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function MockDataProvider({ children }: { children: React.ReactNode }) {
  const [games, setGames] = useState<Game[]>(() => initialGames);
  const [sessions, setSessions] = useState<Session[]>(() => initialSessions);
  const [maintenance, setMaintenance] = useState<MaintenanceIssue[]>(() => initialIssues);

  const addGame: MockDataContextValue["addGame"] = ({ condition, ...newGame }) => {
    const game: Game = {
      ...newGame,
      id: createId("game"),
      status: "available",
      condition: condition || "New",
    };
    setGames((prev) => [...prev, game]);
  };

  const startSession: MockDataContextValue["startSession"] = (table, gameId) => {
    setGames((prev) =>
      prev.map((game) => (game.id === gameId ? { ...game, status: "in_use" } : game))
    );
    const newSession: Session = {
      id: createId("session"),
      table,
      gameId,
      startedAt: Date.now(),
    };
    setSessions((prev) => [...prev, newSession]);
  };

  const endSession: MockDataContextValue["endSession"] = (sessionId) => {
    setSessions((prev) => {
      const session = prev.find((s) => s.id === sessionId);
      if (session) {
        setGames((gamesState) =>
          gamesState.map((game) =>
            game.id === session.gameId ? { ...game, status: "available" } : game
          )
        );
      }
      return prev.filter((sessionItem) => sessionItem.id !== sessionId);
    });
  };

  const toggleIssue: MockDataContextValue["toggleIssue"] = (issueId) => {
    setMaintenance((prev) =>
      prev.map((issue) =>
        issue.id === issueId
          ? { ...issue, status: issue.status === "open" ? "fixed" : "open" }
          : issue
      )
    );
  };

  const value = useMemo(
    () => ({ games, sessions, maintenance, addGame, startSession, endSession, toggleIssue }),
    [games, sessions, maintenance]
  );

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
}

export function useMockData() {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error("useMockData must be used within MockDataProvider");
  }
  return context;
}

export default MockDataProvider;
