import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

type Props = {
  label: string;
  value: string;
  trend?: string;
  iconName?: React.ComponentProps<typeof Feather>["name"];
  gradient?: [string, string];
};

export function StatCard({ label, value, trend, iconName, gradient }: Props) {
  const colors = useColors();
  const { isRtl } = useApp();
  const filled = !!gradient;

  const inner = (
    <>
      <View
        style={[
          styles.headerRow,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        <Text
          style={[
            styles.label,
            { color: filled ? "#FFFFFFCC" : colors.mutedForeground },
          ]}
        >
          {label}
        </Text>
        {iconName ? (
          <Feather
            name={iconName}
            size={14}
            color={filled ? "#FFFFFFCC" : colors.mutedForeground}
          />
        ) : null}
      </View>
      <Text
        style={[
          styles.value,
          {
            color: filled ? "#FFFFFF" : colors.foreground,
            textAlign: isRtl ? "right" : "left",
          },
        ]}
      >
        {value}
      </Text>
      {trend ? (
        <Text
          style={[
            styles.trend,
            {
              color: filled ? "#FFFFFFCC" : colors.success,
              textAlign: isRtl ? "right" : "left",
            },
          ]}
        >
          {trend}
        </Text>
      ) : null}
    </>
  );

  if (filled) {
    return (
      <LinearGradient
        colors={gradient!}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {inner}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
    minHeight: 96,
  },
  headerRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  trend: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
