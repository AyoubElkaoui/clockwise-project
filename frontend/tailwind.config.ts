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
        // timr. brand colors
        timr: {
          orange: '#FF6B35',
          'orange-hover': '#E55A28',
          'orange-light': '#FFE5DD',
          'orange-dark': '#D14A1E',
          blue: '#00A8E8',
          'blue-hover': '#0091CC',
          'blue-light': '#CCF0FF',
          'blue-dark': '#006B94',
          yellow: '#FFC857',
          'yellow-hover': '#E5B34F',
          'yellow-light': '#FFF4D6',
          'yellow-dark': '#CC9F45',
          dark: '#1A1A2E',
          success: '#10B981',
        },
      },
    },
  },
  plugins: [],
};

export default config;
