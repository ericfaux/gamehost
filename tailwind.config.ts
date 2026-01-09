import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "var(--color-surface)",
        card: "var(--color-elevated)",
        border: "var(--color-structure)",
        ink: {
          primary: "var(--color-ink-primary)",
          secondary: "var(--color-ink-secondary)",
        },
        accent: "var(--color-accent)",
        accentSoft: "var(--color-accent-soft)",
        success: "var(--color-success)",
        warn: "var(--color-warn)",
        danger: "var(--color-danger)",
        muted: "var(--color-muted)",
        teal: "var(--color-teal)",
        tealSoft: "var(--color-teal-soft)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        token: "var(--shadow-token)",
        soft: "var(--shadow-soft)",
      },
      borderRadius: {
        token: "14px",
        panel: "18px",
      },
      backgroundImage: {
        noise:
          "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.95%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22 opacity=%220.04%22/%3E%3C/svg%3E')",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Instrument Sans", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Fraunces", "Georgia", "serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace"],
      },
      letterSpacing: {
        rulebook: "0.18em",
      },
    },
  },
  plugins: [],
};

export default config;
