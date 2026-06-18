import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          light: "var(--color-primary-light)",
          dark: "var(--color-primary-dark)",
        },
        // timr.* aliases remapped to brand blue — keeps existing pages working
        timr: {
          orange:           "#2563EB",
          "orange-hover":   "#1D4ED8",
          "orange-light":   "#DBEAFE",
          "orange-dark":    "#1E40AF",
          blue:             "#2563EB",
          "blue-hover":     "#1D4ED8",
          "blue-light":     "#DBEAFE",
          "blue-dark":      "#1E40AF",
          yellow:           "#F59E0B",
          "yellow-hover":   "#D97706",
          "yellow-light":   "#FEF3C7",
          "yellow-dark":    "#B45309",
          dark:             "#0F172A",
          success:          "#10B981",
        },
      },
    },
  },
  plugins: [],
};

export default config;
