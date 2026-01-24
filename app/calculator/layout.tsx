import type { Metadata } from "next";

const BASE_URL = "https://gameledger.io";

export const metadata: Metadata = {
  title: "Friday Night Economics Calculator | GameLedger - Board Game Café Revenue Tool",
  description:
    "Calculate how much revenue your board game café loses to ghost tables, long game teaches, and inventory chaos. Free tool for café owners.",
  keywords: [
    "board game cafe calculator",
    "cafe revenue calculator",
    "ghost table calculator",
    "board game cafe revenue",
    "friday night economics",
    "cafe efficiency calculator",
    "board game cafe tool",
  ],
  openGraph: {
    title: "Friday Night Economics Calculator | GameLedger",
    description:
      "Calculate how much revenue your board game café loses to ghost tables, long game teaches, and inventory chaos. Free tool for café owners.",
    url: `${BASE_URL}/calculator`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Friday Night Economics Calculator | GameLedger",
    description:
      "Calculate how much revenue your board game café loses to ghost tables, long game teaches, and inventory chaos.",
  },
  alternates: {
    canonical: `${BASE_URL}/calculator`,
  },
};

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
