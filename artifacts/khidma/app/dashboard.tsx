import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrderCard } from "@/components/OrderCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StatCard } from "@/components/StatCard";
import { brand } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { formatPrice } from "@/lib/format";
import type { Service } from "@/lib/types";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, locale, isRtl } = useApp();
  const { user } = useAuth();
  const { orders, transactions, services } = useData();

  const monthlyEarnings = transactions
    .filter((tx) => tx.type === "earning" && tx.status === "completed")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const activeCount = orders.filter(
    (o) => o.status !== "completed" && o.status !== "cancelled",
  ).length;
  // Live count from orders — `user.completedJobs` isn't mirrored from the
  // backend so we'd otherwise always show 0 in remote mode.
  const completed = orders.filter(
    (o) => o.status === "completed" && o.freelancerId === user?.id,
  ).length;

  const myServices = services.filter(
    (s) => s.ownerType === "user" && s.freelancerId === (user?.id ?? "me"),
  );

  // Mini bar chart values (mock weekly earnings)
  const weeklyData = [320, 480, 250, 720, 540, 880, 660];
  const maxWeekly = Math.max(...weeklyData);
  const days = isRtl
    ? ["س", "ج", "خ", "ر", "ث", "ن", "أ"]
    : ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t("dashboard")}
        showBack
        rightIconName="plus"
        onRightPress={() => router.push("/service-edit/new")}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        {/* Stats grid */}
        <View
          style={[
            styles.statRow,
            { paddingHorizontal: 20, marginTop: 14, flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <StatCard
            label={t("totalEarnings")}
            value={`${t("sar")} ${formatPrice(monthlyEarnings, locale)}`}
            trend="+18% vs last month"
            iconName="trending-up"
            gradient={[brand.purple, brand.blue]}
          />
        </View>
        <View
          style={[
            styles.statRow,
            { paddingHorizontal: 20, marginTop: 12, gap: 12, flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <StatCard
            label={t("activeOrders")}
            value={activeCount.toString()}
            iconName="package"
          />
          <StatCard
            label={t("completed")}
            value={completed.toString()}
            iconName="check-circle"
          />
        </View>

        {/* Weekly chart */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("thisMonth")}
          </Text>
          <View
            style={[
              styles.chartCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.chartRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              {weeklyData.map((v, i) => {
                const h = Math.max(8, (v / maxWeekly) * 110);
                return (
                  <View key={i} style={styles.barWrap}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: h,
                          backgroundColor:
                            i === weeklyData.length - 1
                              ? colors.primary
                              : colors.primary + "40",
                        },
                      ]}
                    />
                    <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
                      {days[i]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* My Services */}
        <View
          style={{
            paddingHorizontal: 20,
            marginTop: 22,
            marginBottom: 12,
            flexDirection: isRtl ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground },
            ]}
          >
            {t("myServices")}
          </Text>
          <Pressable
            onPress={() => router.push("/service-edit/new")}
            hitSlop={8}
            style={({ pressed }) => [
              styles.addPill,
              {
                opacity: pressed ? 0.92 : 1,
                flexDirection: isRtl ? "row-reverse" : "row",
              },
            ]}
          >
            <LinearGradient
              colors={[brand.purple, brand.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.addPillInner,
                { flexDirection: isRtl ? "row-reverse" : "row" },
              ]}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.addPillText}>{t("addService")}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {myServices.length === 0 ? (
          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.primary + "1A" },
                ]}
              >
                <Feather name="briefcase" size={22} color={colors.primary} />
              </View>
              <Text
                style={[styles.emptyTitle, { color: colors.foreground }]}
              >
                {t("noServices")}
              </Text>
              <Text
                style={[
                  styles.emptyDesc,
                  { color: colors.mutedForeground },
                ]}
              >
                {t("noServicesDesc")}
              </Text>
              <Pressable
                onPress={() => router.push("/service-edit/new")}
                style={({ pressed }) => [
                  styles.emptyCTA,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <LinearGradient
                  colors={[brand.purple, brand.blue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.emptyCTAInner}
                >
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.emptyCTAText}>{t("addService")}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {myServices.map((s) => (
              <MyServiceCard key={s.id} service={s} />
            ))}
          </View>
        )}

        {/* Recent orders */}
        <View style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 12 }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("activeOrders")}
          </Text>
        </View>
        {orders
          .filter((o) => o.status !== "completed" && o.status !== "cancelled")
          .slice(0, 5)
          .map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        {orders.filter((o) => o.status !== "completed" && o.status !== "cancelled")
          .length === 0 ? (
          <View style={[styles.emptyWrap]}>
            <Feather name="inbox" size={28} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>
              {t("noOrders")}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function MyServiceCard({ service }: { service: Service }) {
  const colors = useColors();
  const { t, locale, isRtl } = useApp();
  const isPublished = (service.status ?? "published") === "published";
  const startingPrice = Math.min(...service.packages.map((p) => p.price));
  const title = locale === "ar" ? service.titleAr : service.title;

  return (
    <Pressable
      onPress={() => router.push(`/service-edit/${service.id}`)}
      style={({ pressed }) => [
        styles.svcCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.96 : 1,
          flexDirection: isRtl ? "row-reverse" : "row",
        },
      ]}
    >
      <LinearGradient
        colors={
          [
            "shopify",
            "salla",
            "ads",
            "seo",
            "branding",
            "photography",
            "content",
          ].includes(service.category)
            ? CATEGORY_GRAD[service.category]
            : [brand.purple, brand.blue]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.svcThumb}
      >
        <Feather
          name={CATEGORY_ICON[service.category] ?? "grid"}
          size={22}
          color="#fff"
        />
      </LinearGradient>
      <View style={{ flex: 1, gap: 6 }}>
        <View
          style={[
            { flexDirection: isRtl ? "row-reverse" : "row" },
            { alignItems: "center", gap: 8 },
          ]}
        >
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isPublished
                  ? brand.mint + "26"
                  : colors.surface,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isPublished
                    ? brand.mint
                    : colors.mutedForeground,
                },
              ]}
            />
            <Text
              style={[
                styles.statusPillText,
                {
                  color: isPublished ? brand.mint : colors.mutedForeground,
                },
              ]}
            >
              {isPublished ? t("publish") : t("draft")}
            </Text>
          </View>
        </View>
        <Text
          numberOfLines={2}
          style={[
            styles.svcTitle,
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
            { flexDirection: isRtl ? "row-reverse" : "row" },
            { alignItems: "center", justifyContent: "space-between" },
          ]}
        >
          <Text
            style={[styles.svcPrice, { color: colors.primary }]}
          >
            {t("starting")} · {t("sar")} {formatPrice(startingPrice, locale)}
          </Text>
          <Feather
            name={isRtl ? "chevron-left" : "chevron-right"}
            size={18}
            color={colors.mutedForeground}
          />
        </View>
      </View>
    </Pressable>
  );
}

const CATEGORY_GRAD: Record<string, [string, string]> = {
  shopify: [brand.purple, brand.blue],
  salla: [brand.blue, brand.mint],
  ads: [brand.orange, brand.pink],
  seo: [brand.mint, brand.blue],
  branding: [brand.pink, brand.purple],
  photography: [brand.purple, brand.pink],
  content: [brand.blue, brand.purple],
};

const CATEGORY_ICON: Record<
  string,
  React.ComponentProps<typeof Feather>["name"]
> = {
  shopify: "shopping-bag",
  salla: "shopping-cart",
  ads: "trending-up",
  seo: "search",
  branding: "feather",
  photography: "camera",
  content: "edit-3",
};

const styles = StyleSheet.create({
  statRow: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  chartCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
  },
  chartRow: {
    height: 130,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  bar: {
    width: 18,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  addPill: {
    borderRadius: 999,
    overflow: "hidden",
  },
  addPillInner: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  addPillText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  emptyCTA: {
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 6,
  },
  emptyCTAInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyCTAText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  svcCard: {
    padding: 12,
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
  },
  svcThumb: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  svcTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  svcPrice: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
