/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sora:     ["Sora", "sans-serif"],
        jakarta:  ["Plus Jakarta Sans", "sans-serif"],
        mono:     ["JetBrains Mono", "monospace"],
      },
      colors: {
        // Light-mode primary sampled from the sign-in mockup
        green: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          500: "#22c55e",
          600: "#186840",
          700: "#0f4f31",
          900: "#14532d",
        },
        // Dark-mode primary sampled from the recruiter console mockup
        red: {
          50:  "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          500: "#ef4444",
          600: "#9b172b",
          700: "#781421",
          900: "#450a16",
        },
        // Zimbabwe bird gold
        gold: {
          100: "#fef9c3",
          300: "#fde047",
          400: "#c49a2e",
          500: "#e0b050",
          600: "#b8962e",
          900: "#713f12",
        },
        // Semantic grays
        surface: {
          DEFAULT:  "#ffffff",
          muted:    "#f8fafc",
          subtle:   "#f1f5f9",
          dark:     "#0a0a0a",
          "dark-2": "#111111",
          "dark-3": "#1a1a1a",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card:   "var(--shadow-card)",
        "card-md": "var(--shadow-card)",
        "card-lg": "var(--shadow-card)",
        "card-dark": "0 1px 3px rgba(0,0,0,.5)",
      },
    },
  },
  plugins: [],
};

export default config;
