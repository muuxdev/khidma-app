import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatPrice } from "@/lib/format";
import type { Service } from "@/lib/types";

import { Avatar } from "./ui/Avatar";
import { CategoryThumb } from "./ui/CategoryThumb";

type Props = {
  service: Service;
  variant?: "wide" | "compact";
};

export function ServiceCard({ service, variant = "wide" }: Props) {
  const colors = useColors();
  const { t, locale, isRtl } = useApp();
  const startingPrice = Math.min(...service.packages.map((p) => p.price));
  const title = locale === "ar" ? service.titleAr : service.title;

  if (variant === "compact") {
    return (
      <Pressable
        onPress={() => router.push(`/service/${service.id}`)}
        style={({ pressed }) => [
          styles.compactCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.96 : 1,
          },
        ]}
      >
        <CategoryThumb category={service.cover} size={120} rounded={14} />
        <View style={styles.compactBody}>
          <Text
            numberOfLines={2}
            style={[
              styles.compactTitle,
              {
                color: colors.foreground,
                textAlign: isRtl ? "right" : "left",
              },
            ]}
          >
            {title}
          </Text>
          <View
            style={[
              styles.metaRow,
              { flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            <Feather name="star" size={12} color={colors.warning} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {service.rating.toFixed(1)} ({service.reviewCount})
            </Text>
          </View>
          <Text style={[styles.price, { color: colors.foreground }]}>
            {t("sar")} {formatPrice(startingPrice, locale)}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(`/service/${service.id}`)}
      style={({ pressed }) => [
        styles.wideCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          flexDirection: isRtl ? "row-reverse" : "row",
          opacity: pressed ? 0.96 : 1,
        },
      ]}
    >
      <CategoryThumb category={service.cover} size={92} rounded={14} />
      <View style={styles.wideBody}>
        <Text
          numberOfLines={2}
          style={[
            styles.wideTitle,
            {
              color: colors.foreground,
              textAlign: isRtl ? "right" : "left",
            },
          ]}
        >
          {title}
        </Text>
        <View
          style={[
            styles.sellerRow,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <Avatar name={service.freelancerName} size={20} />
          <Text style={[styles.seller, { color: colors.mutedForeground }]}>
            {service.freelancerName}
          </Text>
        </View>
        <View
          style={[
            styles.bottomRow,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <View
            style={[
              styles.metaRow,
              { flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            <Feather name="star" size={12} color={colors.warning} />
            <Text style={[styles.meta, { color: colors.foreground }]}>
              {service.rating.toFixed(1)}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              ({service.reviewCount})
            </Text>
          </View>
          <Text style={[styles.price, { color: colors.primary }]}>
            {t("sar")} {formatPrice(startingPrice, locale)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wideCard: {
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  wideBody: {
    flex: 1,
    justifyContent: "space-between",
    gap: 6,
  },
  wideTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  sellerRow: {
    alignItems: "center",
    gap: 8,
  },
  seller: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  bottomRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRow: {
    alignItems: "center",
    gap: 4,
  },
  meta: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  price: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  compactCard: {
    width: 200,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginRight: 12,
  },
  compactBody: {
    padding: 12,
    gap: 6,
  },
  compactTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
    minHeight: 36,
  },
});
