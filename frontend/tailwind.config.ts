// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        secondary: "#64748b",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        elmar: {
          // Voorbeeld: pas deze kleuren aan je echte Elmar-kleurcodes aan
          primary: "#0F6DB8",
          secondary: "#FFD600",
          accent: "#181818",
          neutral: "#3D4451",
          "base-100": "#FFFFFF",
          "base-200": "#F2F2F2",
          "base-300": "#E5E6E6",
          info: "#2094f3",
          success: "#009485",
          warning: "#FF9900",
          error: "#FF5722",
        },
      },
      // Eventueel andere thema's, of "light" / "dark"
    ],
  },
};

export default config;
