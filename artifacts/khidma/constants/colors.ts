export const brand = {
  purple: "#5B3EFF",
  blue: "#2F6BFF",
  mint: "#39E2C2",
  orange: "#FF7A1A",
  pink: "#FF4D8D",
} as const;

export const gradient = {
  brand: [brand.purple, brand.blue] as [string, string],
  warm: [brand.orange, brand.pink] as [string, string],
  fresh: [brand.mint, brand.blue] as [string, string],
} as const;

const baseColors = {
  primary: brand.purple,
  primaryAccent: brand.blue,
  accent: brand.mint,
  warning: brand.orange,
  destructive: "#FF3B30",
  success: brand.mint,
};

export const lightColors = {
  ...baseColors,
  background: "#FAFAFA",
  card: "#FFFFFF",
  cardElevated: "#FFFFFF",
  surface: "#F2F3F7",
  foreground: "#111318",
  mutedForeground: "#6B7280",
  subtle: "#9CA3AF",
  border: "#E5E7EB",
  divider: "#EEF0F4",
  inputBg: "#F3F4F8",
  primaryForeground: "#FFFFFF",
  shadow: "rgba(91, 62, 255, 0.12)",
  overlay: "rgba(0, 0, 0, 0.45)",
};

export const darkColors = {
  ...baseColors,
  background: "#10121A",
  card: "#171923",
  cardElevated: "#1E2130",
  surface: "#1A1D28",
  foreground: "#F8F9FA",
  mutedForeground: "#9AA0AE",
  subtle: "#6B7280",
  border: "#272A36",
  divider: "#1F2230",
  inputBg: "#1E2130",
  primaryForeground: "#FFFFFF",
  shadow: "rgba(0, 0, 0, 0.5)",
  overlay: "rgba(0, 0, 0, 0.6)",
};

export type ThemeColors = typeof lightColors;
