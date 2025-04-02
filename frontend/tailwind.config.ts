// tailwind.config.ts (of .js)
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Kies een font dat lijkt op het font in de Elmar-huisstijl
        elmar: ['"Poppins"', "sans-serif"],
      },
      colors: {
        // Eventueel extra custom colors
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        elmar: {
          // Primair is de hoofdkleur (van het logo)
          primary: "#0F6DB8",
          // Secundair kun je bijvoorbeeld geel of grijs doen, afhankelijk van de brand
          secondary: "#464646",
          accent: "#E6E6E6",
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
    ],
  },
};
export default config;
