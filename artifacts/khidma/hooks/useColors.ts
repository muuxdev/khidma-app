import { darkColors, lightColors, type ThemeColors } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

export function useColors(): ThemeColors {
  const { isDark } = useApp();
  return isDark ? darkColors : lightColors;
}
