/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#060B10",
        cyan: "#00D4FF",
        danger: "#FF4D4D",
        ok: "#00E676",
        amber: "#FFB020",
        snow: "#F5F7FA",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 0 42px rgba(0, 212, 255, 0.18)",
        danger: "0 0 34px rgba(255, 77, 77, 0.22)",
      },
    },
  },
  plugins: [],
};
