import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        huerta: {
          50: "#EEF9F1",
          100: "#D5F0DD",
          200: "#ADE1BE",
          300: "#7ACF98",
          400: "#47B370",
          500: "#24824E",
          600: "#1B6B44",
          700: "#145335",
          800: "#0F3F29",
          900: "#0A2C1D",
        },
        reciclaje: {
          50: "#ECFAFD",
          100: "#D0F0F8",
          200: "#A5E1F0",
          300: "#6BCBE4",
          400: "#31ACD0",
          500: "#0E86A8",
          600: "#0E7490",
          700: "#0B5B72",
          800: "#084354",
          900: "#06303D",
        },
        sol: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
