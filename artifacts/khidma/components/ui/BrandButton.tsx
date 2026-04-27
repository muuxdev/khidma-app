import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { gradient } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

type Variant = "primary" | "secondary" | "ghost" | "outline";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
};

export function BrandButton({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  iconLeft,
  iconRight,
  fullWidth = true,
  size = "md",
}: Props) {
  const colors = useColors();
  const isPrimary = variant === "primary";
  const heightMap = { sm: 40, md: 52, lg: 58 };
  const fontSizeMap = { sm: 14, md: 16, lg: 17 };
  const height = heightMap[size];
  const fontSize = fontSizeMap[size];

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.();
  };

  const inner = (
    <View style={[styles.row, { height }]}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#fff" : colors.foreground} />
      ) : (
        <>
          {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
          <Text
            style={[
              styles.label,
              {
                fontSize,
                color:
                  variant === "primary"
                    ? "#fff"
                    : variant === "outline" || variant === "ghost"
                    ? colors.foreground
                    : colors.foreground,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          width: fullWidth ? "100%" : undefined,
          opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed && !disabled ? 0.99 : 1 }],
        },
        variant === "secondary" && {
          backgroundColor: colors.surface,
          borderRadius: 14,
        },
        variant === "outline" && {
          backgroundColor: "transparent",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
        },
        variant === "ghost" && {
          backgroundColor: "transparent",
          borderRadius: 14,
        },
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={gradient.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderRadius: 14 }]}
        >
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
  gradient: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    gap: 10,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  iconLeft: { marginRight: 4 },
  iconRight: { marginLeft: 4 },
});
