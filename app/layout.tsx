import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetBrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GameHost",
  description: "Game hosting platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} ${fraunces.variable} ${jetBrains.variable} bg-paper bg-noise text-ink-primary antialiased min-h-screen font-sans`}
      >
        <div className="min-h-screen flex flex-col" aria-label="GameHost landing page layout">
          {children}
        </div>
      </body>
    </html>
  );
}
