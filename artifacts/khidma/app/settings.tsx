import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Locale } from "@/lib/i18n";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, locale, setLocale, themePreference, setThemePreference, isRtl } =
    useApp();

  const langs: { key: Locale; label: string }[] = [
    { key: "en", label: t("english") },
    { key: "ar", label: t("arabic") },
  ];
  const themes: { key: "light" | "dark" | "system"; label: string }[] = [
    { key: "light", label: t("light") },
    { key: "dark", label: t("dark") },
    { key: "system", label: t("system") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("settings")} showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Text
            style={[
              styles.sectionLabel,
              { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("language")}
          </Text>
          <View
            style={[
              styles.optionsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {langs.map((l, i) => {
              const active = locale === l.key;
              return (
                <Pressable
                  key={l.key}
                  onPress={() => setLocale(l.key)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      flexDirection: isRtl ? "row-reverse" : "row",
                      borderBottomWidth: i < langs.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: colors.divider,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.optionLabel, { color: colors.foreground, flex: 1, textAlign: isRtl ? "right" : "left" }]}>
                    {l.label}
                  </Text>
                  {active ? (
                    <Feather name="check" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Text
            style={[
              styles.sectionLabel,
              { color: colors.mutedForeground, marginTop: 24, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("theme")}
          </Text>
          <View
            style={[
              styles.optionsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {themes.map((th, i) => {
              const active = themePreference === th.key;
              return (
                <Pressable
                  key={th.key}
                  onPress={() => setThemePreference(th.key)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      flexDirection: isRtl ? "row-reverse" : "row",
                      borderBottomWidth: i < themes.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: colors.divider,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Feather
                    name={
                      th.key === "light"
                        ? "sun"
                        : th.key === "dark"
                        ? "moon"
                        : "smartphone"
                    }
                    size={18}
                    color={colors.mutedForeground}
                  />
                  <Text style={[styles.optionLabel, { color: colors.foreground, flex: 1, textAlign: isRtl ? "right" : "left" }]}>
                    {th.label}
                  </Text>
                  {active ? (
                    <Feather name="check" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Text
            style={[
              styles.aboutLine,
              { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("aboutKhidma")} · {t("version")} 1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  optionsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  optionRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 12,
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  aboutLine: {
    marginTop: 28,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
