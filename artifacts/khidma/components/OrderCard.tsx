import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatPrice, formatRelative } from "@/lib/format";
import type { Order } from "@/lib/types";

import { CategoryThumb } from "./ui/CategoryThumb";

const STATUS_KEY: Record<Order["status"], any> = {
  pending_deposit: "pendingDeposit",
  deposit_paid: "depositPaid",
  info_received: "infoReceived",
  fully_paid: "fullyPaid",
  in_progress: "inProgress",
  delivered: "delivered",
  completed: "completed",
  cancelled: "cancelled",
};

const STATUS_COLOR: Record<Order["status"], string> = {
  pending_deposit: "#FF7A1A",
  deposit_paid: "#F59E0B",
  info_received: "#FACC15",
  fully_paid: "#06B6D4",
  in_progress: "#2F6BFF",
  delivered: "#9333EA",
  completed: "#39E2C2",
  cancelled: "#FF3B30",
};

export function OrderCard({ order }: { order: Order }) {
  const colors = useColors();
  const { t, locale, isRtl } = useApp();
  const statusColor = STATUS_COLOR[order.status];

  return (
    <Pressable
      onPress={() => router.push(`/order/${order.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.96 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.headerRow,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        <CategoryThumb category={order.serviceCover} size={56} rounded={12} />
        <View style={styles.headerBody}>
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              {
                color: colors.foreground,
                textAlign: isRtl ? "right" : "left",
              },
            ]}
          >
            {order.serviceTitle}
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.mutedForeground,
                textAlign: isRtl ? "right" : "left",
              },
            ]}
          >
            {order.freelancerName} · {formatRelative(order.createdAt, locale)}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.progressRow,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        <View
          style={[
            styles.progressBg,
            { backgroundColor: colors.divider },
          ]}
        >
          <View
            style={[
              styles.progressFg,
              {
                width: `${order.progress}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
          {order.progress}%
        </Text>
      </View>

      <View
        style={[
          styles.footer,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        <View
          style={[
            styles.statusPill,
            { backgroundColor: statusColor + "20" },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {t(STATUS_KEY[order.status])}
          </Text>
        </View>
        <Text style={[styles.price, { color: colors.foreground }]}>
          {t("sar")} {formatPrice(order.price, locale)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  headerRow: {
    alignItems: "flex-start",
    gap: 12,
  },
  headerBody: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  progressRow: {
    alignItems: "center",
    gap: 10,
  },
  progressBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFg: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    minWidth: 36,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  price: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
