import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/components/ui/Avatar";
import { BrandButton } from "@/components/ui/BrandButton";
import { CategoryThumb } from "@/components/ui/CategoryThumb";
import { useApp } from "@/contexts/AppContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { formatDate, formatPrice } from "@/lib/format";

const STATUS_KEY: Record<string, any> = {
  pending: "pending",
  in_progress: "inProgress",
  review: "review",
  completed: "completed",
  cancelled: "cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#FF7A1A",
  in_progress: "#2F6BFF",
  review: "#9333EA",
  completed: "#39E2C2",
  cancelled: "#FF3B30",
};

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, locale, isRtl } = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, ensureThread, updateOrderStatus } = useData();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ScreenHeader title="" showBack />
        <Text style={{ color: colors.foreground }}>Order not found</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLOR[order.status];

  const steps = [
    { key: "pending", label: t("pending") },
    { key: "in_progress", label: t("inProgress") },
    { key: "review", label: t("review") },
    { key: "completed", label: t("completed") },
  ];
  const activeIdx = steps.findIndex((s) => s.key === order.status);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("orderId") + " #" + order.id.slice(-6).toUpperCase()} showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        {/* Service summary */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <CategoryThumb category={order.serviceCover} size={64} rounded={14} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={[
                styles.title,
                { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
              ]}
              numberOfLines={2}
            >
              {order.serviceTitle}
            </Text>
            <View
              style={[
                styles.metaRow,
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
              <Text style={[styles.tierBadge, { color: colors.mutedForeground }]}>
                {t(order.packageTier)}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress steps */}
        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("orderProgress")}
          </Text>
          <View
            style={[
              styles.stepsRow,
              { flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            {steps.map((s, i) => {
              const reached = i <= activeIdx;
              return (
                <React.Fragment key={s.key}>
                  <View style={styles.stepWrap}>
                    <View
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: reached ? statusColor : colors.divider,
                        },
                      ]}
                    >
                      {reached ? (
                        <Feather name="check" size={12} color="#fff" />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        {
                          color: reached ? colors.foreground : colors.mutedForeground,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {s.label}
                    </Text>
                  </View>
                  {i < steps.length - 1 ? (
                    <View
                      style={[
                        styles.stepBar,
                        {
                          backgroundColor:
                            i < activeIdx ? statusColor : colors.divider,
                        },
                      ]}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Counterparty */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("seller")}
          </Text>
          <View
            style={[
              styles.sellerCard,
              { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            <Avatar name={order.freelancerName} size={44} online />
            <Text
              style={[
                styles.sellerName,
                { color: colors.foreground, flex: 1, textAlign: isRtl ? "right" : "left" },
              ]}
            >
              {order.freelancerName}
            </Text>
            <BrandButton
              title={t("contactSeller")}
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={async () => {
                const thread = await ensureThread(
                  order.freelancerId,
                  order.freelancerName,
                );
                router.push(`/chat/${thread.id}`);
              }}
              iconLeft={<Feather name="message-circle" size={14} color={colors.foreground} />}
            />
          </View>
        </View>

        {/* Details */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <View
            style={[
              styles.detailCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <DetailRow label={t("orderId")} value={"#" + order.id.slice(-6).toUpperCase()} />
            <DetailRow label={t("package")} value={t(order.packageTier)} />
            <DetailRow label={t("deliveryDate")} value={formatDate(order.dueAt, locale)} />
            <DetailRow
              label={t("total")}
              value={`${t("sar")} ${formatPrice(order.price, locale)}`}
              highlight
            />
          </View>
        </View>

        {/* Action */}
        {order.status === "review" ? (
          <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
            <BrandButton
              title={t("markComplete")}
              onPress={() => updateOrderStatus(order.id, "completed")}
              iconLeft={<Feather name="check-circle" size={18} color="#fff" />}
            />
          </View>
        ) : null}
        {order.status === "completed" ? (
          <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
            <BrandButton
              title={t("leaveReview")}
              variant="outline"
              iconLeft={<Feather name="star" size={18} color={colors.foreground} />}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const colors = useColors();
  const { isRtl } = useApp();
  return (
    <View
      style={[
        styles.detailRow,
        { flexDirection: isRtl ? "row-reverse" : "row" },
      ]}
    >
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.detailValue,
          {
            color: highlight ? colors.primary : colors.foreground,
            fontFamily: highlight ? "Inter_700Bold" : "Inter_600SemiBold",
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  summaryCard: {
    margin: 20,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    alignItems: "center",
  },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  metaRow: { alignItems: "center", gap: 8, marginTop: 4 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tierBadge: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  stepsRow: { alignItems: "center" },
  stepWrap: { alignItems: "center", gap: 6, width: 64 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  stepBar: { flex: 1, height: 2, marginHorizontal: -10, marginBottom: 18 },
  sellerCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  sellerName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  detailCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  detailRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  detailValue: { fontSize: 14 },
});
