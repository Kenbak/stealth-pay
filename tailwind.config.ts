import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Amber accent palette - replaces 'stealth'
        amber: {
          50: "hsl(var(--amber-50))",
          100: "hsl(var(--amber-100))",
          200: "hsl(var(--amber-200))",
          300: "hsl(var(--amber-300))",
          400: "hsl(var(--amber-400))",
          500: "hsl(var(--amber-500))",
          600: "hsl(var(--amber-600))",
          700: "hsl(var(--amber-700))",
          800: "hsl(var(--amber-800))",
          900: "hsl(var(--amber-900))",
        },
        // Keep 'stealth' as alias for backward compatibility during migration
        stealth: {
          50: "hsl(var(--amber-50))",
          100: "hsl(var(--amber-100))",
          200: "hsl(var(--amber-200))",
          300: "hsl(var(--amber-300))",
          400: "hsl(var(--amber-400))",
          500: "hsl(var(--amber-500))",
          600: "hsl(var(--amber-600))",
          700: "hsl(var(--amber-700))",
          800: "hsl(var(--amber-800))",
          900: "hsl(var(--amber-900))",
          950: "hsl(var(--amber-900))",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        lg: "var(--radius-lg)",
        md: "var(--radius)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
        body: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 20px -5px hsl(38 92% 50% / 0.3)" },
          "50%": { boxShadow: "0 0 30px -5px hsl(38 92% 50% / 0.5)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite",
      },
      boxShadow: {
        "glow-sm": "0 0 20px -5px hsl(38 92% 50% / 0.2)",
        "glow": "0 0 40px -10px hsl(38 92% 50% / 0.3)",
        "glow-lg": "0 0 60px -15px hsl(38 92% 50% / 0.4)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
