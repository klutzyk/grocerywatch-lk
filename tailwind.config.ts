import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#211f1a",
        field: "#f5f0e6",
        paper: "#fffaf0",
        leaf: "#0f4a35",
        moss: "#54705a",
        saffron: "#d89b22",
        clay: "#a5472d",
        danger: "#b7352d"
      },
      boxShadow: {
        panel: "0 18px 60px rgba(33, 31, 26, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
