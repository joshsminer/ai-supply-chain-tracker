import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        severity: {
          critical: { DEFAULT: "#E24B4A", bg: "#FCEBEB", fg: "#791F1F" },
          tight: { DEFAULT: "#EF9F27", bg: "#FAEEDA", fg: "#633806" },
          balanced: { DEFAULT: "#639922", bg: "#EAF3DE", fg: "#3B6D11" },
          monitoring: { DEFAULT: "#B4B2A9", bg: "#F1EFE8", fg: "#5F5E5A" },
        },
        supplier: {
          1: "#534AB7",
          2: "#7F77DD",
          3: "#AFA9EC",
          4: "#D3D1C7",
        },
        supply: {
          dark: "#1D9E75",
          light: "#5DCAA5",
        },
        demand: "#534AB7",
        insight: {
          bg: "#FAEEDA",
          border: "#BA7517",
          fg: "#633806",
          label: "#854F0B",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        micro: ["11px", { lineHeight: "1.4" }],
        caption: ["12px", { lineHeight: "1.4" }],
        body: ["14px", { lineHeight: "1.55" }],
        h3: ["16px", { lineHeight: "1.4", fontWeight: "500" }],
        h2: ["18px", { lineHeight: "1.35", fontWeight: "500" }],
        h1: ["22px", { lineHeight: "1.3", fontWeight: "500" }],
      },
      borderWidth: {
        "0.5": "0.5px",
      },
    },
  },
  plugins: [],
};
export default config;
