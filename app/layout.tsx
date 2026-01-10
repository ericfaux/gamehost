import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

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
    default: "GameLedger | The Operating System for Board Game Cafés",
    template: "%s | GameLedger",
  },
  description:
    "Streamline reservations, game check-outs, and guest feedback. GameLedger helps board game cafés run smoother Friday nights and boost return visits by 18%.",
  keywords: [
    "board game café",
    "board game cafe",
    "café management",
    "cafe management software",
    "board game café software",
    "table reservations",
    "game library management",
    "hospitality software",
    "QR check-in",
    "board game inventory",
    "café booking system",
    "game café POS",
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
    title: "GameLedger | The Operating System for Board Game Cafés",
    description:
      "Streamline reservations, game check-outs, and guest feedback. GameLedger helps board game cafés run smoother Friday nights and boost return visits by 18%.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GameLedger - Board Game Café Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GameLedger | The Operating System for Board Game Cafés",
    description:
      "Streamline reservations, game check-outs, and guest feedback. Boost return visits by 18%.",
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
    canonical: BASE_URL,
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
        {children}
      </body>
    </html>
  );
}
