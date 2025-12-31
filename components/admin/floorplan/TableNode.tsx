import type { TableShape } from "@/lib/db/types";

export interface TableSessionInfo {
  sessionId: string;
  status: "playing" | "browsing";
  gameTitle?: string;
  startedAt?: string | null;
  hasDuplicates?: boolean;
}

export function getDefaultLayoutForCapacity(capacity: number | null) {
  if (!capacity || capacity <= 2) {
    return { w: 0.12, h: 0.12, shape: "circle" as TableShape };
  }

  if (capacity <= 4) {
    return { w: 0.18, h: 0.12, shape: "rectangle" as TableShape };
  }

  if (capacity <= 6) {
    return { w: 0.22, h: 0.14, shape: "rectangle" as TableShape };
  }

  return { w: 0.26, h: 0.16, shape: "rectangle" as TableShape };
}
