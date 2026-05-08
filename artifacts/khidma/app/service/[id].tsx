import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
// Pressable kept for the package picker tabs below.
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/components/ui/Avatar";
import { BrandButton } from "@/components/ui/BrandButton";
import { CategoryThumb } from "@/components/ui/CategoryThumb";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { formatPrice } from "@/lib/format";

export default function ServiceDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, locale, isRtl } = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { services, createOrder } = useData();
  const { user } = useAuth();
  const [tier, setTier] = useState<"basic" | "standard" | "premium">("standard");
  const [placing, setPlacing] = useState(false);

  const service = services.find((s) => s.id === id);
  if (!service) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ScreenHeader title="" showBack />
        <Text style={{ color: colors.foreground }}>Not found</Text>
      </View>
    );
  }

  const pkg = service.packages.find((p) => p.tier === tier)!;
  const fee = Math.round(pkg.price * 0.05);
  const total = pkg.price + fee;
  const title = locale === "ar" ? service.titleAr : service.title;
  const desc = locale === "ar" ? service.descriptionAr : service.description;
  const isOwnService = !!user && service.freelancerId === user.id;

  const handleOrder = async () => {
    if (!user || isOwnService) return;
    setPlacing(true);
    // Chat is now gated on the deposit being paid; the order's conversation
    // is created by payDeposit(), not eagerly here.
    const order = await createOrder(service, tier, user.name, user.id);
    setPlacing(false);
    if (Platform.OS === "web") {
      router.replace(`/order/${order.id}`);
    } else {
      Alert.alert(t("orderPlaced"), t("orderPlacedDesc"), [
        { text: t("done"), style: "cancel" },
        { text: t("viewOrder"), onPress: () => router.replace(`/order/${order.id}`) },
      ]);
    }
  };

  const bottomBarHeight = 86;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="" showBack rightIconName="share-2" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: bottomBarHeight + insets.bottom + 16,
        }}
      >
        {/* Cover */}
        <View style={{ paddingHorizontal: 20, alignItems: "center", marginTop: 8 }}>
          <CategoryThumb category={service.cover} size={220} rounded={28} />
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
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
            <Feather name="star" size={14} color={colors.warning} />
            <Text style={[styles.meta, { color: colors.foreground }]}>
              {service.rating.toFixed(1)}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              ({service.reviewCount} {t("reviews")})
            </Text>
            <Text style={[styles.dot, { color: colors.subtle }]}>·</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {service.ordersInQueue} {t("inQueue")}
            </Text>
          </View>
        </View>

        {/* Seller */}
        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <Pressable
            onPress={() => router.push(`/freelancer/${service.freelancerId}`)}
            style={({ pressed }) => [
              styles.sellerCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                flexDirection: isRtl ? "row-reverse" : "row",
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Avatar
              name={service.freelancerName}
              uri={service.freelancerAvatar}
              size={48}
              online
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.sellerName,
                  { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
                ]}
              >
                {service.freelancerName}
              </Text>
              <Text
                style={[
                  styles.sellerSub,
                  { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
                ]}
              >
                {t("viewProfile")}
              </Text>
            </View>
            <Feather
              name={isRtl ? "chevron-left" : "chevron-right"}
              size={20}
              color={colors.mutedForeground}
            />
          </Pressable>
        </View>

        {/* Packages */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("package")}
          </Text>
          <View
            style={[
              styles.pkgTabs,
              {
                backgroundColor: colors.surface,
                flexDirection: isRtl ? "row-reverse" : "row",
              },
            ]}
          >
            {(["basic", "standard", "premium"] as const).map((p) => {
              const active = tier === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setTier(p)}
                  style={[
                    styles.pkgTab,
                    {
                      backgroundColor: active ? colors.card : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pkgTabText,
                      { color: active ? colors.foreground : colors.mutedForeground },
                    ]}
                  >
                    {t(p)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.pkgCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.pkgHeader,
                { flexDirection: isRtl ? "row-reverse" : "row" },
              ]}
            >
              <Text style={[styles.pkgName, { color: colors.foreground }]}>
                {pkg.name}
              </Text>
              <Text style={[styles.pkgPrice, { color: colors.primary }]}>
                {t("sar")} {formatPrice(pkg.price, locale)}
              </Text>
            </View>
            <View
              style={[
                styles.pkgInfoRow,
                { flexDirection: isRtl ? "row-reverse" : "row" },
              ]}
            >
              <View style={[styles.pkgInfo, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
                <Feather name="clock" size={14} color={colors.mutedForeground} />
                <Text style={[styles.pkgInfoText, { color: colors.mutedForeground }]}>
                  {pkg.deliveryDays} {t("days")}
                </Text>
              </View>
              <View style={[styles.pkgInfo, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
                <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
                <Text style={[styles.pkgInfoText, { color: colors.mutedForeground }]}>
                  {pkg.revisions} {t("revisions")}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.divider,
                { backgroundColor: colors.divider },
              ]}
            />
            <View style={{ gap: 10 }}>
              {pkg.features.map((f, i) => (
                <View
                  key={i}
                  style={[
                    styles.featureRow,
                    { flexDirection: isRtl ? "row-reverse" : "row" },
                  ]}
                >
                  <View
                    style={[
                      styles.checkCircle,
                      { backgroundColor: colors.primary + "1A" },
                    ]}
                  >
                    <Feather name="check" size={11} color={colors.primary} />
                  </View>
                  <Text
                    style={[
                      styles.featureText,
                      {
                        color: colors.foreground,
                        textAlign: isRtl ? "right" : "left",
                      },
                    ]}
                  >
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("aboutSeller")}
          </Text>
          <Text
            style={[
              styles.desc,
              { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {desc}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.divider,
            paddingBottom: insets.bottom + 12,
            flexDirection: isRtl ? "row-reverse" : "row",
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
            {t("total")}
          </Text>
          <Text style={[styles.totalValue, { color: colors.foreground }]}>
            {t("sar")} {formatPrice(total, locale)}
          </Text>
        </View>
        <View style={{ flex: 1.4 }}>
          <BrandButton
            title={isOwnService ? t("ownServiceCannotOrder") : t("orderNow")}
            onPress={handleOrder}
            loading={placing}
            disabled={isOwnService}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  metaRow: {
    marginTop: 10,
    alignItems: "center",
    gap: 6,
  },
  meta: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dot: { fontSize: 13 },
  sellerCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  sellerName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sellerSub: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  contactBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  pkgTabs: {
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  pkgTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  pkgTabText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  pkgCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  pkgHeader: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  pkgName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  pkgPrice: { fontSize: 18, fontFamily: "Inter_700Bold" },
  pkgInfoRow: {
    gap: 14,
  },
  pkgInfo: {
    alignItems: "center",
    gap: 6,
  },
  pkgInfoText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  featureRow: {
    alignItems: "center",
    gap: 10,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  desc: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 22,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 14,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  totalValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
});
