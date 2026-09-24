/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        farm: { 50: "#f0fdf4", 100: "#dcfce7", 600: "#16a34a", 700: "#15803d", 800: "#166534", 900: "#14532d", 950: "#0b2e1a" },
        sun: { 400: "#fb923c", 500: "#f97316", 600: "#ea580c" },
        cream: "#fbf8f1",
      },
      fontFamily: {
        display: ['"Archivo Black"', "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
