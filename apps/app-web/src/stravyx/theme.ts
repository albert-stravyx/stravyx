/**
 * Central design tokens for the Stravyx UI.
 * Urgency-tier colors stay in `types.ts` (`URGENCY_TIERS`).
 */

export const FONT_DISPLAY = '"DM Serif Display", Georgia, serif';
export const FONT_BODY = '"DM Sans", sans-serif';

export const COLORS = {
  brand: {
    green: "#5cb89c",
    greenHover: "#4a9d84",
    greenDark: "#2d6b53",
    greenSoft: "#e8f5f0",
    greenSofter: "#f0faf7",
    orange: "#d85a30",
    orangeHover: "#b8481f",
  },
  ink: {
    primary: "#2d2d2d",
    muted: "#737373",
    faint: "#b0b0b0",
  },
  surface: {
    page: "#fafafa",
    card: "#ffffff",
    border: "#e8e8e8",
  },
} as const;

export const TYPE_SCALE = {
  caption: "11px",
  label: "12px",
  body: "13px",
  bodyLg: "14px",
  subhead: "15px",
  title: "18px",
  heading: "22px",
  display: "28px",
} as const;
