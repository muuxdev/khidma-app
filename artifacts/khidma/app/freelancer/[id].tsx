import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { ServiceCard } from "@/components/ServiceCard";
import { Avatar } from "@/components/ui/Avatar";
import { BrandButton } from "@/components/ui/BrandButton";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { followsApi, profilesApi, servicesApi } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Role, Service, User } from "@/lib/types";

/** Public freelancer profile. Reads from the live profile when Supabase is
 *  configured (with React Query for cache + invalidation around Follow), and
 *  gracefully degrades to whatever name/avatar we have on the cached service
 *  list in mock-fallback mode. */
export default function FreelancerProfileScreen() {
  const colors = useColors();
  const { t, isRtl } = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { services: localServices, orders: localOrders } = useData();
  const { user } = useAuth();
  const qc = useQueryClient();

  const remoteEnabled =
    !!id && isSupabaseConfigured() && !!user && user.email !== "guest@khidma.app";
  const meId = user?.id ?? "";
  const isSelf = !!user && id === user.id;

  // Profile (Supabase). Falls back to a synthetic User derived from the local
  // service list so the screen renders even before the network call resolves.
  const profileQuery = useQuery({
    queryKey: ["freelancerProfile", id],
    queryFn: () => profilesApi.getProfile(id as string),
    enabled: remoteEnabled,
  });

  // Services published by this freelancer. Always also derives a local list
  // so the screen has something to show in mock mode.
  const servicesQuery = useQuery({
    queryKey: ["freelancerServices", id],
    queryFn: () => servicesApi.listMyServices(id as string),
    enabled: remoteEnabled,
  });

  const localForFreelancer = useMemo(
    () =>
      localServices.filter(
        (s) => s.freelancerId === id && (s.status ?? "published") === "published",
      ),
    [localServices, id],
  );
  const remoteForFreelancer: Service[] = (servicesQuery.data ?? []).filter(
    (s) => (s.status ?? "published") === "published",
  );
  const services = remoteEnabled && servicesQuery.data
    ? remoteForFreelancer
    : localForFreelancer;

  const fallbackName =
    isSelf && user
      ? user.name
      : localForFreelancer[0]?.freelancerName ??
        localOrders.find((o) => o.clientId === id)?.clientName ??
        "";
  const fallbackAvatar =
    isSelf && user ? user.avatar : localForFreelancer[0]?.freelancerAvatar;
  // Default the role to "freelancer" so the existing rich layout stays the
  // baseline. The client view is opted into only when we positively learn
  // the viewed user is a client.
  // In mock mode without a profile row we have no reliable signal for client
  // vs freelancer, so we keep the existing rich freelancer layout as the
  // baseline. The minimal client view turns on as soon as the profile row
  // arrives from Supabase with `role = 'client'`.
  const fallbackRole: Role = isSelf && user ? user.role : "freelancer";
  const profile: Partial<User> & { name: string; avatar?: string; role: Role } =
    profileQuery.data
      ? { ...profileQuery.data }
      : {
          id: id as string,
          name: fallbackName,
          avatar: fallbackAvatar,
          role: fallbackRole,
        };
  const isClientProfile = profile.role === "client";

  // Follow state
  const followingQuery = useQuery({
    queryKey: ["isFollowing", meId, id],
    queryFn: () => followsApi.isFollowing(meId, id as string),
    enabled: remoteEnabled && !isSelf,
  });
  const isFollowing = !!followingQuery.data;
  const followersCount = profile.followersCount ?? 0;

  const onToggleFollow = async () => {
    if (!remoteEnabled || isSelf || !id || !meId) return;
    try {
      if (isFollowing) {
        await followsApi.unfollow(meId, id as string);
      } else {
        await followsApi.follow(meId, id as string);
      }
      // Optimistic refresh: re-pull the profile (followers_count) and the
      // edge so the button + counter reflect reality.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["isFollowing", meId, id] }),
        qc.invalidateQueries({ queryKey: ["freelancerProfile", id] }),
      ]);
    } catch (err) {
      Alert.alert(t("errorGeneric"), (err as Error).message);
    }
  };

  // Follow is freelancer-only. Clients aren't followable in this product.
  const showFollow = remoteEnabled && !isSelf && !isClientProfile;

  // Lifetime orders placed (for client profile view). Sourced from the
  // trigger-maintained `placed_orders_count` column when remote, with a
  // mock-mode fallback that counts cached orders by client_id.
  const placedOrdersCount =
    profile.placedOrdersCount ??
    localOrders.filter((o) => o.clientId === id).length;

  // Aggregate freelancer rating across services as a sensible default when the
  // profile row's own rating is empty (mock fallback path).
  const aggRating = useMemo(() => {
    const rated = services.filter((s) => s.rating > 0);
    if (!rated.length) return 0;
    return rated.reduce((sum, s) => sum + s.rating, 0) / rated.length;
  }, [services]);
  const rating = profile.rating || aggRating || 0;
  // `completedJobs` is sourced from the trigger-maintained profile counter
  // (see profiles.completed_orders_count). Public viewers can't read other
  // users' orders rows, so this is the only safe source for true totals.
  const completedJobs = profile.completedJobs ?? 0;

  const Stat = ({ value, label }: { value: string; label: string }) => (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );

  const Chips = ({ items }: { items: string[] }) => (
    <View
      style={[
        styles.chips,
        { flexDirection: isRtl ? "row-reverse" : "row" },
      ]}
    >
      {items.map((c) => (
        <View
          key={c}
          style={[
            styles.chip,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.chipText, { color: colors.foreground }]}>
            {c}
          </Text>
        </View>
      ))}
    </View>
  );

  // The header title is intentionally the user's own name — the page itself
  // *is* their public profile, so a separate "View profile" label would be
  // redundant.
  const headerTitle = profile.name || t("profile");

  // ---- Client profile view ---------------------------------------------------
  // Clients get a deliberately minimal card: photo, name, rating, and total
  // orders placed. No bio, tags, skills, services list, or follow button.
  if (isClientProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={headerTitle} showBack />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View
            style={[
              styles.headerCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Avatar
              name={profile.name}
              uri={profile.avatar}
              size={88}
              online={false}
            />
            <Text
              style={[styles.name, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {profile.name}
            </Text>
            <View
              style={[
                styles.statsRow,
                { flexDirection: isRtl ? "row-reverse" : "row" },
              ]}
            >
              <Stat
                value={rating ? rating.toFixed(1) : "—"}
                label={t("rating")}
              />
              <View
                style={[styles.statSep, { backgroundColor: colors.divider }]}
              />
              <Stat
                value={String(placedOrdersCount)}
                label={t("ordersPlaced")}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={headerTitle} showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Header card */}
        <View
          style={[
            styles.headerCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Avatar
            name={profile.name}
            uri={profile.avatar}
            size={88}
            online={false}
          />
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {profile.name}
          </Text>
          {profile.bio ? (
            <Text
              style={[
                styles.bio,
                {
                  color: colors.mutedForeground,
                  textAlign: isRtl ? "right" : "left",
                },
              ]}
              numberOfLines={3}
            >
              {profile.bio}
            </Text>
          ) : null}

          <View
            style={[
              styles.statsRow,
              { flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            <Stat value={rating ? rating.toFixed(1) : "—"} label={t("rating")} />
            <View style={[styles.statSep, { backgroundColor: colors.divider }]} />
            <Stat value={String(completedJobs)} label={t("projectsCompleted")} />
            <View style={[styles.statSep, { backgroundColor: colors.divider }]} />
            <Stat value={String(followersCount)} label={t("followers")} />
            {profile.yearsOfExperience != null ? (
              <>
                <View
                  style={[styles.statSep, { backgroundColor: colors.divider }]}
                />
                <Stat
                  value={String(profile.yearsOfExperience)}
                  label={t("yearsExperience")}
                />
              </>
            ) : null}
          </View>

          {showFollow ? (
            <BrandButton
              title={isFollowing ? t("following") : t("follow")}
              onPress={onToggleFollow}
              variant={isFollowing ? "outline" : "primary"}
              iconLeft={
                <Feather
                  name={isFollowing ? "check" : "user-plus"}
                  size={16}
                  color={isFollowing ? colors.foreground : "#fff"}
                />
              }
              loading={followingQuery.isLoading}
            />
          ) : null}
        </View>

        {/* Tags / expertise */}
        {profile.tags && profile.tags.length ? (
          <Section title={t("expertise")} isRtl={isRtl} colors={colors}>
            <Chips items={profile.tags} />
          </Section>
        ) : null}

        {/* Skills */}
        {profile.skills && profile.skills.length ? (
          <Section title={t("skillsLabel")} isRtl={isRtl} colors={colors}>
            <Chips items={profile.skills} />
          </Section>
        ) : null}

        {/* Keywords */}
        {profile.keywords && profile.keywords.length ? (
          <Section title={t("keywordsLabel")} isRtl={isRtl} colors={colors}>
            <Chips items={profile.keywords} />
          </Section>
        ) : null}

        {/* Services */}
        <Section title={t("services")} isRtl={isRtl} colors={colors}>
          {services.length ? (
            services.map((s) => <ServiceCard key={s.id} service={s} />)
          ) : (
            <Text
              style={[
                styles.empty,
                {
                  color: colors.mutedForeground,
                  textAlign: isRtl ? "right" : "left",
                },
              ]}
            >
              {t("noServicesYet")}
            </Text>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  isRtl,
  colors,
  children,
}: {
  title: string;
  isRtl: boolean;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
        ]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    margin: 20,
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    gap: 14,
  },
  name: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  bio: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  statsRow: {
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 6,
  },
  statBlock: {
    alignItems: "center",
    minWidth: 60,
  },
  statValue: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
    textAlign: "center",
  },
  statSep: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginHorizontal: 20,
    marginBottom: 12,
  },
  chips: {
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  empty: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 20,
  },
});
