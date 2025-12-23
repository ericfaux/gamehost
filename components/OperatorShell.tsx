import type React from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function OperatorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-[16rem_1fr] bg-paper text-ink-primary">
      <Sidebar />
      <div className="flex flex-col">
        <TopBar />
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
