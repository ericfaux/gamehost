import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { JsonLdSchema } from "@/components/public/JsonLdSchema";

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const BASE_URL = "https://gameledger.io";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Board Game Café Software | GameLedger - Reservations, Inventory & Game Discovery",
    template: "%s | GameLedger",
  },
  description:
    "The operating system built for board game cafés. Smart reservations, instant BGG-powered game discovery, and inventory tracking that delivers 15% higher F&B revenue and 18% more return visits.",
  keywords: [
    "board game café software",
    "board game café reservation system",
    "board game café management",
    "board game café POS",
    "board game inventory tracking",
    "board game cafe software",
    "board game cafe reservation system",
    "board game cafe management",
    "café management software",
    "game library management",
    "hospitality software",
    "QR check-in",
    "café booking system",
  ],
  authors: [{ name: "GameLedger" }],
  creator: "GameLedger",
  publisher: "GameLedger",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "GameLedger",
    title: "Board Game Café Software | GameLedger - Reservations, Inventory & Game Discovery",
    description:
      "The operating system built for board game cafés. Smart reservations, instant BGG-powered game discovery, and inventory tracking that delivers 15% higher F&B revenue and 18% more return visits.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GameLedger - Board game café management software dashboard showing reservations, game library, and analytics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Board Game Café Software | GameLedger",
    description:
      "The operating system for board game cafés. Smart reservations, BGG-powered game discovery, and inventory tracking for 15% higher F&B revenue.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-noise">
      <body
        className={`${instrumentSans.variable} ${fraunces.variable} ${plexMono.variable} bg-[color:var(--color-surface)] text-[color:var(--color-ink-primary)] antialiased min-h-screen`}
      >
        <JsonLdSchema />
        {children}
      </body>
    </html>
  );
}
