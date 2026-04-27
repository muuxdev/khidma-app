import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { brand } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import type { TKey } from "@/lib/i18n";

type CategoryDef = {
  key: string;
  labelKey: TKey;
  iconName: React.ComponentProps<typeof Feather>["name"];
  gradient: [string, string];
};

export const CATEGORIES: CategoryDef[] = [
  {
    key: "shopify",
    labelKey: "catShopify",
    iconName: "shopping-bag",
    gradient: [brand.purple, brand.blue],
  },
  {
    key: "salla",
    labelKey: "catSalla",
    iconName: "shopping-cart",
    gradient: [brand.blue, brand.mint],
  },
  {
    key: "ads",
    labelKey: "catAds",
    iconName: "trending-up",
    gradient: [brand.orange, brand.pink],
  },
  {
    key: "seo",
    labelKey: "catSeo",
    iconName: "search",
    gradient: [brand.mint, brand.blue],
  },
  {
    key: "branding",
    labelKey: "catBranding",
    iconName: "feather",
    gradient: [brand.pink, brand.purple],
  },
  {
    key: "photography",
    labelKey: "catPhotography",
    iconName: "camera",
    gradient: [brand.purple, brand.pink],
  },
  {
    key: "content",
    labelKey: "catContent",
    iconName: "edit-3",
    gradient: [brand.blue, brand.purple],
  },
];

export function CategoryCard({ def }: { def: CategoryDef }) {
  const { t } = useApp();
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/(tabs)/", params: { cat: def.key } })}
      style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={def.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tile}
      >
        <Feather name={def.iconName} size={24} color="#fff" />
      </LinearGradient>
      <Text style={styles.label} numberOfLines={2}>
        {t(def.labelKey)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 88,
    alignItems: "center",
    gap: 8,
    marginRight: 12,
  },
  tile: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#0009",
    textAlign: "center",
  },
});
