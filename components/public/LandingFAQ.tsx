'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type FAQItem = {
  question: string;
  answer: string;
};

type FAQCategory = {
  title: string;
  items: FAQItem[];
};

const FAQ_DATA: FAQCategory[] = [
  {
    title: 'General Overview',
    items: [
      {
        question: 'What is GameLedger?',
        answer:
          'GameLedger is a "Game Library Operating System" designed specifically for board game cafés. It consists of two parts: a QR-based web app for your guests (to help them pick and learn games) and a Host Dashboard for you (to manage inventory, track analytics, and handle reservations).',
      },
      {
        question: 'Do my customers need to download an app?',
        answer:
          "No. We know friction kills the experience. Guests simply scan a QR code at their table to access the digital menu. There are no downloads, no logins, and no account creation required for players.",
      },
      {
        question: 'Does this replace my staff or "Game Gurus"?',
        answer:
          'Absolutely not. GameLedger is designed to free your staff from low-leverage tasks—like repeating the same rules explanation 50 times a week or searching for a game that ends up being missing. By automating game selection and basic setup, your staff has more time to focus on hospitality, upselling food and drinks, and managing the floor.',
      },
    ],
  },
  {
    title: 'For Owners & Managers: Operations & Data',
    items: [
      {
        question: 'How does this help me manage my game library?',
        answer:
          "Most cafés run on guesswork. GameLedger gives you hard data. We track every game session so you know exactly which games are being played, which are gathering dust, and which need to be retired. You can finally base your purchasing decisions on real trends in your specific community, not just generic internet rankings.",
      },
      {
        question: 'What happens if a game is damaged or missing pieces?',
        answer:
          'We have a built-in maintenance loop. Staff can log issues (e.g., "Missing red dice") directly in the system in seconds. If a game is marked "Out of Service," the recommendation engine automatically stops showing it to guests until you fix it. No more disappointed customers.',
      },
      {
        question: 'Is it difficult to upload my current library?',
        answer:
          "We know you have hundreds of games. We've designed the onboarding process to be as painless as possible, allowing you to import your library data quickly so you can get up and running without weeks of data entry.",
      },
    ],
  },
  {
    title: 'The Guest Experience',
    items: [
      {
        question: 'How does the Game Recommendation Wizard work?',
        answer:
          "Choice paralysis is real. A wall of 500 games can be overwhelming. Our Wizard asks your guests 3 simple questions: How many players? How much time do you have? What's the vibe? In under 30 seconds, it recommends 3-5 games from your library that fit their criteria perfectly.",
      },
      {
        question: 'Does the app teach the entire game?',
        answer:
          'The app provides a "Quick Start" view. This includes a setup checklist and a 5-bullet summary of the core rules. The goal is to get guests from "scanning" to "playing" in under 3 minutes. For deep strategy questions, your staff can still step in, but the basics are handled instantly.',
      },
    ],
  },
  {
    title: 'Bookings & Reservations',
    items: [
      {
        question:
          'How is your reservation system different from tools like OpenTable or Calendly?',
        answer:
          'Generic booking tools manage time, but they don\'t understand capacity. GameLedger bridges the gap between a reservation and the live floor. Because our system knows which tables are currently playing games (and for how long), we prevent "ghost tables" and overbooking.',
      },
      {
        question: 'Can guests reserve specific games?',
        answer:
          'Yes. Our system is inventory-aware. If a group wants to ensure Scythe or a specific large-format booth is available, they can reserve that specific "hardware" or "software" in advance.',
      },
      {
        question: 'Do you charge a commission on bookings?',
        answer:
          "No. Unlike other booking platforms that take a cut of your revenue, GameLedger is a flat-fee software provider. Your bookings are yours; we don't tax your success.",
      },
    ],
  },
  {
    title: 'Pricing & Technical',
    items: [
      {
        question: 'What hardware do I need?',
        answer:
          'You need a device for the Host Stand (tablet or laptop) to manage the dashboard. Your guests use their own smartphones. We provide the printable QR codes for your tables.',
      },
      {
        question: 'Can I export my data?',
        answer:
          'Yes. You own your data. Whether you need to export feedback for marketing or usage stats for inventory accounting, you can pull your data from the dashboard.',
      },
    ],
  },
];

export function LandingFAQ() {
  return (
    <div className="space-y-10">
      {FAQ_DATA.map((category) => (
        <div key={category.title}>
          <h3 className="text-xl font-serif text-ink-primary mb-4 pb-2 border-b border-stroke">
            {category.title}
          </h3>
          <Accordion type="single" collapsible className="w-full">
            {category.items.map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`${category.title}-${idx}`}
                className="border-b border-stroke/50"
              >
                <AccordionTrigger className="text-base hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}
