import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FFFBFC",
        card: "#FFFFFF",
        primary: "#FF5A7E",
        blush: "#FFC2CE",
        deep: "#E84367",
        ink: "#1A1A1E",
        inkSoft: "#6B5B5F",
        "ink-soft": "#6B5B5F",
        border: "#F5E6E8",
        success: "#DDF2E6",
        background: "#FFFBFC",
        foreground: "#1A1A1E",
      },
      borderRadius: {
        card: "24px",
        pill: "999px",
        input: "16px",
        lg: "24px",
        md: "16px",
        sm: "12px",
        full: "999px",
      },
      boxShadow: {
        card: "0 8px 32px rgba(255, 90, 126, 0.08)",
        DEFAULT: "0 8px 32px rgba(255, 90, 126, 0.08)",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Instrument Serif", "serif"],
        body: ["var(--font-body)", "Satoshi", "sans-serif"],
        sans: ["var(--font-body)", "Satoshi", "sans-serif"],
        serif: ["var(--font-heading)", "Instrument Serif", "serif"],
      },
      spacing: {
        "section-gap": "80px",
      },
      maxWidth: {
        app: "480px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
