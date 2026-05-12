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
        // Original Communiculture palette
        comm: {
          blue: "#0033cc",
          red: "#cc3300",
          orange: "#ff6600",
        },
      },
      fontFamily: {
        sans: ["Proletarian", "sans-serif"],
        mono: ["Proletarian", "var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
