import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

import { dict, type Locale, type TKey, translate } from "@/lib/i18n";
import { getJson, setJson, StorageKeys } from "@/lib/storage";

type ThemePreference = "light" | "dark" | "system";

type AppContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  isRtl: boolean;
  themePreference: ThemePreference;
  setThemePreference: (p: ThemePreference) => void;
  isDark: boolean;
  t: (key: TKey) => string;
  dir: "ltr" | "rtl";
  ready: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [locale, setLocaleState] = useState<Locale>("en");
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const storedLocale = await getJson<Locale>(StorageKeys.LOCALE);
      const storedTheme = await getJson<ThemePreference>(StorageKeys.THEME);
      if (storedLocale) setLocaleState(storedLocale);
      if (storedTheme) setThemePreferenceState(storedTheme);
      setReady(true);
    })();
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setJson(StorageKeys.LOCALE, next);
  }, []);

  const setThemePreference = useCallback((next: ThemePreference) => {
    setThemePreferenceState(next);
    setJson(StorageKeys.THEME, next);
  }, []);

  const isDark =
    themePreference === "system"
      ? systemScheme === "dark"
      : themePreference === "dark";

  const isRtl = locale === "ar";

  const t = useCallback(
    (key: TKey) => translate(locale, key) ?? dict.en[key] ?? String(key),
    [locale],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      locale,
      setLocale,
      isRtl,
      themePreference,
      setThemePreference,
      isDark,
      t,
      dir: isRtl ? "rtl" : "ltr",
      ready,
    }),
    [locale, setLocale, isRtl, themePreference, setThemePreference, isDark, t, ready],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
