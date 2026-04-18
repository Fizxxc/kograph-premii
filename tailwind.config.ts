import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4F46E5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81"
        }
      },
      boxShadow: {
        glass: "0 16px 40px rgba(79, 70, 229, 0.14)",
        premium: "0 28px 70px rgba(2, 6, 23, 0.35)"
      },
      backgroundImage: {
        "hero-premium":
          "radial-gradient(circle at 20% 0%, rgba(99,102,241,0.3), transparent 25%), radial-gradient(circle at 80% 10%, rgba(236,72,153,0.18), transparent 22%), linear-gradient(180deg, rgba(15,23,42,0.88), rgba(2,6,23,0.98))"
      }
    }
  },
  plugins: []
};

export default config;
