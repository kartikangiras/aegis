import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist"', "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "monospace"],
        display: ['"Spectral"', '"Iowan Old Style"', "Charter", "Georgia", "serif"],
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.375rem",
        "2xl": "1.75rem",
        "3xl": "clamp(1.875rem, 1.6rem + 1.4vw, 2.5rem)",
        "4xl": "clamp(2.25rem, 1.8rem + 2.2vw, 3.25rem)",
        "5xl": "clamp(2.875rem, 2.2rem + 3.4vw, 4.5rem)",
      },
      borderRadius: {
        xs: "3px",
        sm: "5px",
        md: "8px",
        lg: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
