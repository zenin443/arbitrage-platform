import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        th: {
          bg:      "#0D1117",
          surface: "#161B22",
          hover:   "#1C2128",
          border:  "#21262D",
          primary:   "#E6EDF3",
          secondary: "#8B949E",
          dim:       "#484F58",
          accent:  "#388BFD",
          green:   "#3FB950",
          red:     "#F85149",
          yellow:  "#D29922",
          purple:  "#BC8CFF",
        },
      },
    },
  },
  plugins: [],
};
export default config;
