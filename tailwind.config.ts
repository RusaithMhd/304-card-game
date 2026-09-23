import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        table: {
          bg: "#0b1320",
          felt: "#0e231b",
          border: "#1d3a2f",
          accent: "#2d5e4b",
          highlight: "#3d7e65",
        },
        gold: {
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
        },
        card: {
          red: "#e11d48",
          black: "#0f172a",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 12px 24px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4)',
        'table-glow': 'inset 0 0 100px rgba(0, 0, 0, 0.7)',
      },
    },
  },
  plugins: [],
};
export default config;
