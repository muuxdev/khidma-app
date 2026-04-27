import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Renders a one-time, dismissible banner when Supabase env keys are missing.
 * The app keeps working in mock fallback mode; this just makes the state
 * visible so the user knows why writes don't sync across devices.
 */
export function SupabaseStatusBanner() {
  const colors = useColors();
  const { t, isRtl } = useApp();
  const [dismissed, setDismissed] = useState(false);

  if (isSupabaseConfigured() || dismissed) return null;

  const fg = "#7A4A00";
  const bg = "#FFF4D6";

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: bg,
          borderBottomColor: colors.border,
          flexDirection: isRtl ? "row-reverse" : "row",
        },
      ]}
      accessibilityRole="alert"
    >
      <Feather name="cloud-off" size={16} color={fg} />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: fg }]} numberOfLines={1}>
          {t("supabaseMissingTitle")}
        </Text>
        <Text style={[styles.body, { color: fg }]} numberOfLines={2}>
          {t("supabaseMissingBody")}
        </Text>
      </View>
      <Pressable onPress={() => setDismissed(true)} hitSlop={10}>
        <Feather name="x" size={16} color={fg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textCol: { flex: 1 },
  title: { fontSize: 12, fontWeight: "600" },
  body: { fontSize: 11, marginTop: 2 },
});
