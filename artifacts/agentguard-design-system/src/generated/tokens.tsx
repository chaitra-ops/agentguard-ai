/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#f6f4ee",
      "foreground": "#1c2635",
      "border": "#e6e2d7",
      "card": "#faf9f5",
      "cardForeground": "#1c2635",
      "popover": "#faf9f5",
      "popoverForeground": "#1c2635",
      "primary": "#1c2635",
      "primaryForeground": "#faf9f5",
      "secondary": "#f8c84a",
      "secondaryForeground": "#1c2635",
      "muted": "#eeeae0",
      "mutedForeground": "#68717c",
      "accent": "#3a9f8b",
      "accentForeground": "#faf9f5",
      "destructive": "#d8463f",
      "destructiveForeground": "#faf9f5",
      "input": "#d9d4c8",
      "ring": "#3a9f8b",
      "chart1": "#3a9f8b",
      "chart2": "#f8c84a",
      "chart3": "#1c2635",
      "chart4": "#d8463f",
      "chart5": "#eb8a3d",
      "sidebar": "#1b2733",
      "sidebarForeground": "#efece3",
      "sidebarBorder": "#303d49",
      "sidebarPrimary": "#f8c84a",
      "sidebarPrimaryForeground": "#1c2635",
      "sidebarAccent": "#293642",
      "sidebarAccentForeground": "#efece3",
      "sidebarRing": "#f8c84a"
    },
    "dark": {
      "background": "#141a20",
      "foreground": "#efece3",
      "border": "#303c49",
      "card": "#1b242b",
      "cardForeground": "#efece3",
      "popover": "#1b242b",
      "popoverForeground": "#efece3",
      "primary": "#f8c84a",
      "primaryForeground": "#1c2635",
      "secondary": "#293642",
      "secondaryForeground": "#efece3",
      "muted": "#28323a",
      "mutedForeground": "#9ea8af",
      "accent": "#3a9f8b",
      "accentForeground": "#efece3",
      "destructive": "#e35d56",
      "destructiveForeground": "#efece3",
      "input": "#3d4a57",
      "ring": "#3a9f8b",
      "chart1": "#3a9f8b",
      "chart2": "#f8c84a",
      "chart3": "#9ea8af",
      "chart4": "#e35d56",
      "chart5": "#eb8a3d",
      "sidebar": "#11171c",
      "sidebarForeground": "#efece3",
      "sidebarBorder": "#2a3640",
      "sidebarPrimary": "#f8c84a",
      "sidebarPrimaryForeground": "#1c2635",
      "sidebarAccent": "#1e2a33",
      "sidebarAccentForeground": "#efece3",
      "sidebarRing": "#f8c84a"
    }
  },
  "fontFamily": {
    "sans": [
      "Manrope",
      "sans-serif"
    ],
    "serif": [
      "Georgia",
      "serif"
    ],
    "mono": [
      "DM Mono",
      "monospace"
    ]
  },
  "radius": "0.75rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
