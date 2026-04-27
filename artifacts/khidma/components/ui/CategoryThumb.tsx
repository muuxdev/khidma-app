import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { brand } from "@/constants/colors";

const ICON_BY_KEY: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  shopify: "shopping-bag",
  salla: "shopping-cart",
  ads: "trending-up",
  seo: "search",
  branding: "feather",
  photography: "camera",
  content: "edit-3",
};

const GRADIENT_BY_KEY: Record<string, [string, string]> = {
  shopify: [brand.purple, brand.blue],
  salla: [brand.blue, brand.mint],
  ads: [brand.orange, brand.pink],
  seo: [brand.mint, brand.blue],
  branding: [brand.pink, brand.purple],
  photography: [brand.purple, brand.pink],
  content: [brand.blue, brand.purple],
};

type Props = {
  category: string;
  size?: number;
  rounded?: number;
};

export function CategoryThumb({ category, size = 56, rounded = 16 }: Props) {
  const colors = GRADIENT_BY_KEY[category] || [brand.purple, brand.blue];
  const iconName = ICON_BY_KEY[category] || "grid";
  return (
    <View>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.base,
          { width: size, height: size, borderRadius: rounded },
        ]}
      >
        <Feather name={iconName} size={size * 0.42} color="#fff" />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
});
