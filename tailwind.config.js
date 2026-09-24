/** @type {import('tailwindcss').Config} */
// Palette sampled from the client's own Tau Poultry flyer and chick boxes,
// not a framework default: forest green, chick yolk, flyer ember, cardboard kraft.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        farm: { 50: "#eef3ea", 100: "#dfe8d6", 600: "#3f7d3a", 700: "#2f6a33", 800: "#245029", 900: "#1f4d2b", 950: "#18261b" },
        sun: { 400: "#f6b73c", 500: "#e2561b", 600: "#c44612" },
        yolk: "#f4a51c",
        kraft: { DEFAULT: "#c49a6c", light: "#e9d8bf", dark: "#8a6a45" },
        paper: "#f5efe2",
        cream: "#f5efe2",
        chalk: { DEFAULT: "#263028", line: "#e8e4d6" },
        ink: "#1d2a1f",
      },
      fontFamily: {
        display: ['"Anton"', "Impact", "sans-serif"],
        sans: ['"Atkinson Hyperlegible"', "system-ui", "sans-serif"],
        hand: ['"Caveat"', "cursive"],
      },
      borderRadius: { tag: "3px" },
    },
  },
  plugins: [],
};
