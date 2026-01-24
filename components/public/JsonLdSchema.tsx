import Script from 'next/script';

const BASE_URL = 'https://gameledger.io';

// FAQ data matching the requested questions with expanded answers
const faqData = [
  {
    question: 'What is GameLedger?',
    answer:
      'GameLedger is a "Game Library Operating System" designed specifically for board game cafés. It consists of two parts: a QR-based web app for your guests (to help them pick and learn games) and a Host Dashboard for you (to manage inventory, track analytics, and handle reservations). Our platform helps cafés increase F&B revenue by 15% and boost return visits by 18% through faster game discovery and streamlined operations.',
  },
  {
    question: 'Do my customers need to download an app?',
    answer:
      'No. We know friction kills the experience. Guests simply scan a QR code at their table to access the digital menu. There are no downloads, no logins, and no account creation required for players. The entire experience runs in their mobile browser, making it accessible to everyone instantly.',
  },
  {
    question: 'Does this replace my staff or "Game Gurus"?',
    answer:
      'Absolutely not. GameLedger is designed to free your staff from low-leverage tasks—like repeating the same rules explanation 50 times a week or searching for a game that ends up being missing. By automating game selection and basic setup, your staff has more time to focus on hospitality, upselling food and drinks, and managing the floor. We save an average of 12 minutes per table that your staff can redirect to guest experience.',
  },
  {
    question: 'How does this help me manage my game library?',
    answer:
      'Most cafés run on guesswork. GameLedger gives you hard data. We track every game session so you know exactly which games are being played, which are gathering dust, and which need to be retired. You can finally base your purchasing decisions on real trends in your specific community, not just generic internet rankings. Our asset tracking prevents you from losing money on damaged or incomplete games.',
  },
  {
    question: 'What happens if a game is damaged or missing pieces?',
    answer:
      'We have a built-in maintenance loop. Staff can log issues (e.g., "Missing red dice") directly in the system in seconds. If a game is marked "Out of Service," the recommendation engine automatically stops showing it to guests until you fix it. No more disappointed customers discovering a broken game 30 minutes into their session.',
  },
  {
    question: 'Is it difficult to upload my current library?',
    answer:
      'Not at all—it\'s instant. We integrate directly with the BoardGameGeek (BGG) API, so you don\'t need to manually type in player counts, playtimes, or complexity ratings. Just select your games and we pull the metadata automatically. You can add 500+ games in minutes, not weeks of manual data entry.',
  },
  {
    question: 'How does the Game Recommendation Wizard work?',
    answer:
      'Choice paralysis is real. A wall of 500 games can be overwhelming. Our BGG-powered Wizard asks your guests 3 simple questions: How many players? How much time do you have? What\'s the vibe? In under 30 seconds, it recommends 3-5 games from your library that fit their criteria perfectly. This turns 20 minutes of shelf-staring into 2 minutes of picking, leaving more time for playing and ordering.',
  },
  {
    question:
      'How is your reservation system different from OpenTable or Calendly?',
    answer:
      'Generic booking tools manage time, but they don\'t understand capacity. GameLedger bridges the gap between a reservation and the live floor. Because our system knows which tables are currently playing games (and for how long), we prevent "ghost tables" and overbooking. Our inventory-aware booking system eliminates double-bookings and ensures the table is actually available when guests arrive.',
  },
  {
    question: 'Can guests reserve specific games?',
    answer:
      'Yes. Our system is inventory-aware. If a group wants to ensure Scythe or a specific large-format booth is available, they can reserve that specific game or table in advance. This premium feature lets your most dedicated customers guarantee they get exactly what they want when they visit.',
  },
  {
    question: 'Do you charge a commission on bookings?',
    answer:
      'No. Unlike other booking platforms that take a cut of your revenue, GameLedger is a flat-fee software provider. Your bookings are yours—we don\'t tax your success. This means more revenue stays in your pocket, not ours.',
  },
  {
    question: 'What hardware do I need?',
    answer:
      'Minimal hardware is required. You need a device for the Host Stand (tablet or laptop) to manage the dashboard. Your guests use their own smartphones to interact with the system. We provide printable QR codes for your tables. That\'s it—no specialized POS hardware, no expensive equipment investments.',
  },
];

// FAQPage Schema
const faqPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqData.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

// SoftwareApplication Schema
const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'GameLedger',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web-based',
  description:
    'The operating system built for board game cafés. Smart reservations, instant BGG-powered game discovery, and inventory tracking that delivers 15% higher F&B revenue and 18% more return visits.',
  url: BASE_URL,
  offers: {
    '@type': 'Offer',
    name: 'Free Pilot Weekend',
    price: '0',
    priceCurrency: 'USD',
    description:
      'Try GameLedger risk-free with a complimentary pilot weekend for your board game café.',
  },
  featureList: [
    'Smart table reservations',
    'BGG-powered game recommendation wizard',
    'Real-time inventory tracking',
    'QR-based guest check-in',
    'Game condition logging',
    'Usage analytics dashboard',
    'No-download guest experience',
  ],
  screenshot: `${BASE_URL}/og-image.png`,
};

// Organization Schema
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GameLedger',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description:
    'The operating system for board game cafés. GameLedger provides smart reservations, BGG-powered game discovery, and inventory management to help cafés increase revenue and return visits.',
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'sales',
    url: `${BASE_URL}/contact`,
  },
};

export function JsonLdSchema() {
  return (
    <>
      <Script
        id="faq-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqPageSchema),
        }}
      />
      <Script
        id="software-application-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema),
        }}
      />
      <Script
        id="organization-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
    </>
  );
}
