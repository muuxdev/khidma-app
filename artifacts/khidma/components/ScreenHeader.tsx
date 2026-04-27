import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

type Props = {
  title: string;
  showBack?: boolean;
  rightIconName?: React.ComponentProps<typeof Feather>["name"];
  onRightPress?: () => void;
  transparent?: boolean;
};

export function ScreenHeader({
  title,
  showBack,
  rightIconName,
  onRightPress,
  transparent,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isRtl } = useApp();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 24) : insets.top;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: topPad,
          backgroundColor: transparent ? "transparent" : colors.background,
          borderBottomColor: transparent ? "transparent" : colors.divider,
        },
      ]}
    >
      <View
        style={[
          styles.row,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        <View style={styles.side}>
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather
                name={isRtl ? "chevron-right" : "chevron-left"}
                size={22}
                color={colors.foreground}
              />
            </Pressable>
          ) : null}
        </View>
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={[styles.side, { alignItems: isRtl ? "flex-start" : "flex-end" }]}>
          {rightIconName ? (
            <Pressable
              onPress={onRightPress}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name={rightIconName} size={20} color={colors.foreground} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
  },
  side: {
    width: 60,
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
