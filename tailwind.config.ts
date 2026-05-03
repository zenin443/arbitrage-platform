/*
 * ARBITRANCE DESIGN TOKENS v1.0
 * =============================
 * Typography scale (responsive with clamp — defined in globals.css :root):
 *   --fs-xs:  Widget labels, footnotes, timestamps         [clamp(11px, 0.75vw, 13px)]
 *   --fs-sm:  Table data, body text, sidebar items         [clamp(12px, 0.82vw, 14px)]
 *   --fs-md:  Section titles, widget headers               [clamp(13px, 0.88vw, 15px)]
 *   --fs-lg:  Page headings, nav items                     [clamp(14px, 0.95vw, 16px)]
 *   --fs-xl:  Stat card numbers                            [clamp(18px, 1.3vw, 24px)]
 *   --fs-2xl: Hero numbers                                 [clamp(22px, 1.6vw, 28px)]
 *
 * Font weights: 400 (normal), 500 (medium) ONLY
 * Font families: sans (Inter) for UI, mono (SF Mono) for data/numbers
 *
 * Colors: Prefer arb-* tokens over th-* or raw hex values
 *   arb-green:           Positive values, profitable gaps, success states
 *   arb-red:             Negative values, losses, danger states
 *   arb-amber:           Warnings, pending, caution states
 *   arb-blue:            Links, info, spot-futures type indicators
 *   arb-bg-primary:      Main page background (#0D1117)
 *   arb-bg-secondary:    Cards, widgets, panels (#161B22)
 *   arb-bg-tertiary:     Borders, dividers (#21262D)
 *   arb-text-primary:    Main readable text (#E6EDF3)
 *   arb-text-secondary:  Labels, muted text (#8B949E)
 *   arb-text-tertiary:   Hints, disabled states (#484F58)
 *
 * Spacing: Use --pad-xs through --pad-lg for responsive padding
 *   --pad-xs: clamp(4px, 0.35vw, 6px)
 *   --pad-sm: clamp(6px, 0.5vw, 10px)
 *   --pad-md: clamp(8px, 0.65vw, 12px)
 *   --pad-lg: clamp(10px, 0.8vw, 16px)
 *
 * Discovery audit (Apr 2026):
 *   27 unique hex colors found across app/ and components/
 *   Brand colors retained: #627EEA (ETH), #9945FF (SOL), #F0B90B (BNB),
 *     #8247E5 (MATIC), #00B4D8 (cross-chain), #28A0F0 (Arbitrum), #FF0420 (OP)
 *   Hardcoded font sizes: text-[8px] → text-[32px] (17 variants) — migrate to --fs-* vars
 *   Font weights in use: 400, 500 only
 */

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-ibm-sans)', 'IBM Plex Sans', '-apple-system', 'sans-serif'],
        mono: ['var(--font-ibm-mono)', 'IBM Plex Mono', 'monospace'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Legacy th-* tokens — kept for backward compatibility
        th: {
          bg:        "#0D1117",
          surface:   "#161B22",
          hover:     "#1C2128",
          border:    "#21262D",
          primary:   "#E6EDF3",
          secondary: "#8B949E",
          dim:       "#484F58",
          accent:    "#388BFD",
          green:     "#3FB950",
          red:       "#F85149",
          yellow:    "#D29922",
          purple:    "#BC8CFF",
        },
        // Canonical arb-* design tokens — use these going forward
        arb: {
          bg: {
            primary:   '#0D1117',
            secondary: '#161B22',
            tertiary:  '#21262D',
          },
          text: {
            primary:   '#E6EDF3',
            secondary: '#8B949E',
            tertiary:  '#484F58',
          },
          green: '#3FB950',
          red:   '#F85149',
          amber: '#D29922',
          blue:  '#388BFD',
          border: {
            DEFAULT: '#21262D',
            light:   'rgba(33,38,45,0.3)',
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
