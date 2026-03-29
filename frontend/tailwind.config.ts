import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        radar: {
          50: "#f4f7f5",
          100: "#e7efe9",
          300: "#b8d2c0",
          500: "#5f8f6f",
          700: "#2f5b40",
          900: "#152a1d"
        },
        alert: {
          red: "#c0392b",
          amber: "#c78219",
          green: "#1f8a4c"
        }
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
