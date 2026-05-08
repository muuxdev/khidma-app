import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORIES, CategoryCard } from "@/components/CategoryCard";
import { ServiceCard } from "@/components/ServiceCard";
import { Avatar } from "@/components/ui/Avatar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { brand, gradient } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, locale, isRtl } = useApp();
  const { user } = useAuth();
  const { services, orders, walletBalance } = useData();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const visibleServices = useMemo(
    () => services.filter((s) => (s.status ?? "published") === "published"),
    [services],
  );

  const filtered = useMemo(() => {
    let list = visibleServices;
    if (activeCategory) list = list.filter((s) => s.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.titleAr.includes(search) ||
          s.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [visibleServices, activeCategory, search]);

  const trending = visibleServices.slice(0, 3);
  const isFreelancer = user?.role === "freelancer";
  const activeOrder = orders.find(
    (o) =>
      (isFreelancer ? o.freelancerId === user?.id : o.clientId === user?.id) &&
      o.status !== "completed" &&
      o.status !== "cancelled",
  ) || orders.find((o) => o.status !== "completed" && o.status !== "cancelled");
  // Derive completedJobs live from orders so the hero doesn't lag behind a
  // stale `user.completedJobs` (which the profile mapper hard-codes to 0).
  const completedJobs = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "completed" &&
          (isFreelancer ? o.freelancerId === user?.id : o.clientId === user?.id),
      ).length,
    [orders, isFreelancer, user?.id],
  );

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 24) : insets.top;
  const bottomPad = Platform.OS === "web" ? insets.bottom + 100 : insets.bottom + 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad }}
      >
        {/* Greeting header */}
        <View
          style={[
            styles.greeting,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.helloText,
                { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
              ]}
            >
              {t("hello")}
            </Text>
            <Text
              style={[
                styles.userName,
                { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
              ]}
              numberOfLines={1}
            >
              {user?.name?.split(" ")[0] || "Friend"}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            hitSlop={6}
          >
            <Avatar name={user?.name || "U"} size={44} uri={user?.avatar} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
                flexDirection: isRtl ? "row-reverse" : "row",
              },
            ]}
          >
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("search")}
              placeholderTextColor={colors.subtle}
              style={[
                styles.searchInput,
                {
                  color: colors.foreground,
                  textAlign: isRtl ? "right" : "left",
                },
              ]}
            />
          </View>
        </View>

        {/* Hero card — different for freelancer/client */}
        {isFreelancer ? (
          <FreelancerHero
            balance={walletBalance}
            jobs={completedJobs}
            rating={user?.rating || 0}
          />
        ) : (
          <ClientHero activeOrder={activeOrder} />
        )}

        {/* Categories */}
        <SectionHeader title={t("categories")} />
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          inverted={isRtl}
          keyExtractor={(c) => c.key}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                setActiveCategory((prev) => (prev === item.key ? null : item.key))
              }
              style={({ pressed }) => [
                styles.catWrap,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <LinearGradient
                colors={
                  activeCategory === item.key
                    ? item.gradient
                    : ([colors.surface, colors.surface] as [string, string])
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.catTile,
                  activeCategory === item.key
                    ? null
                    : { borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <Feather
                  name={item.iconName}
                  size={22}
                  color={activeCategory === item.key ? "#fff" : colors.foreground}
                />
              </LinearGradient>
              <Text
                style={[
                  styles.catLabel,
                  {
                    color:
                      activeCategory === item.key ? colors.primary : colors.foreground,
                  },
                ]}
                numberOfLines={2}
              >
                {t(item.labelKey)}
              </Text>
            </Pressable>
          )}
        />

        {/* Trending services */}
        {!search && !activeCategory ? (
          <>
            <SectionHeader title={t("nearYou")} />
            <FlatList
              data={trending}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              inverted={isRtl}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => (
                <ServiceCard service={item} variant="compact" />
              )}
            />
          </>
        ) : null}

        {/* All services */}
        <SectionHeader
          title={
            activeCategory
              ? t(CATEGORIES.find((c) => c.key === activeCategory)!.labelKey)
              : t("recommended")
          }
        />
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="search" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No results
            </Text>
          </View>
        ) : (
          filtered.map((s) => <ServiceCard key={s.id} service={s} />)
        )}
      </ScrollView>
    </View>
  );
}

function ClientHero({ activeOrder }: { activeOrder: any }) {
  const { t, locale, isRtl } = useApp();
  if (!activeOrder) {
    return (
      <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
        <LinearGradient
          colors={gradient.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Feather name="zap" size={20} color="#fff" />
          <Text style={styles.heroTitle}>{t("explore")}</Text>
          <Text style={styles.heroSub}>{t("tagline")}</Text>
        </LinearGradient>
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => router.push(`/order/${activeOrder.id}`)}
      style={{ paddingHorizontal: 20, marginTop: 18 }}
    >
      <LinearGradient
        colors={gradient.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View
          style={[
            styles.heroTop,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <Text style={styles.heroBadge}>{t("activeOrders")}</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {activeOrder.serviceTitle}
        </Text>
        <View style={styles.heroProgress}>
          <View
            style={[styles.heroProgressFill, { width: `${activeOrder.progress}%` }]}
          />
        </View>
        <Text style={styles.heroSub}>
          {activeOrder.progress}% · {activeOrder.freelancerName}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function FreelancerHero({
  balance,
  jobs,
  rating,
}: {
  balance: number;
  jobs: number;
  rating: number;
}) {
  const { t, locale, isRtl } = useApp();
  return (
    <Pressable
      onPress={() => router.push("/dashboard")}
      style={{ paddingHorizontal: 20, marginTop: 18 }}
    >
      <LinearGradient
        colors={gradient.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={[styles.heroTop, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <Text style={styles.heroBadge}>{t("availableBalance")}</Text>
          <Feather name="bar-chart-2" size={18} color="#fff" />
        </View>
        <Text style={styles.heroBig}>
          {t("sar")} {balance.toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}
        </Text>
        <View style={[styles.heroStats, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{jobs}</Text>
            <Text style={styles.heroStatLabel}>{t("completed")}</Text>
          </View>
          <View style={[styles.heroDivider, { backgroundColor: "#FFFFFF40" }]} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{rating.toFixed(1)}</Text>
            <Text style={styles.heroStatLabel}>{t("rating")}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  greeting: {
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 12,
  },
  helloText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  userName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  searchWrap: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    gap: 8,
  },
  heroTop: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBadge: {
    color: "#FFFFFFCC",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  heroBig: {
    color: "#fff",
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    marginTop: 4,
  },
  heroSub: {
    color: "#FFFFFFCC",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
  },
  heroProgress: {
    height: 6,
    backgroundColor: "#FFFFFF30",
    borderRadius: 3,
    marginTop: 10,
    overflow: "hidden",
  },
  heroProgressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  heroStats: {
    alignItems: "center",
    gap: 16,
    marginTop: 14,
  },
  heroStat: { flex: 1 },
  heroStatVal: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  heroStatLabel: {
    color: "#FFFFFFCC",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 28,
  },
  catWrap: {
    width: 80,
    alignItems: "center",
    gap: 8,
    marginRight: 14,
  },
  catTile: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
