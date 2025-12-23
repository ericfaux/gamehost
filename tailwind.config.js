/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F5F2EB",
        card: "#FFFFFF",
        ink: {
          primary: "#2A2626",
          secondary: "#5C5552",
        },
        accent: {
          primary: "#C64D2F",
          secondary: "#3A5A40",
        },
        stroke: "#E5E0D8",
        danger: "#B91C1C",
        highlight: "#F5EFD9",
      },
      boxShadow: {
        card: "0 2px 4px rgba(42,38,38,0.06), 0 4px 12px rgba(42,38,38,0.04)",
        floating: "0 8px 16px rgba(42,38,38,0.08), 0 12px 24px rgba(42,38,38,0.04)",
        token: "0 3px 0px rgba(42,38,38,0.18)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Fraunces", "Georgia", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular"],
      },
      borderRadius: {
        chit: "999px",
        token: "12px",
      },
      backgroundImage: {
        noise:
          "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22 opacity=%220.08%22/%3E%3C/svg%3E')",
      },
      letterSpacing: {
        ledger: "0.2em",
      },
    },
  },
  plugins: [],
};
