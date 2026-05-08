import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { notificationsApi, type DbNotification } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AppNotification } from "@/lib/types";

function dbToUi(n: DbNotification): AppNotification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body ?? "",
    isRead: n.is_read,
    createdAt: new Date(n.created_at).getTime(),
  };
}

function iconForType(
  type: string,
): React.ComponentProps<typeof Feather>["name"] {
  if (type.startsWith("order")) return "shopping-bag";
  if (type.startsWith("message") || type.startsWith("chat"))
    return "message-square";
  if (type.startsWith("review")) return "star";
  if (type.startsWith("wallet") || type.startsWith("payout"))
    return "credit-card";
  return "bell";
}

function useRelativeTime() {
  const { t } = useApp();
  return useCallback(
    (ts: number): string => {
      const diffMs = Date.now() - ts;
      const minutes = Math.max(0, Math.floor(diffMs / 60000));
      if (minutes < 1) return t("justNow");
      if (minutes < 60)
        return t("minutesAgo").replace("{count}", String(minutes));
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t("hoursAgo").replace("{count}", String(hours));
      const days = Math.floor(hours / 24);
      return t("daysAgo").replace("{count}", String(days));
    },
    [t],
  );
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useApp();
  const { user } = useAuth();
  const remoteEnabled =
    isSupabaseConfigured() && !!user && user.email !== "guest@khidma.app";

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const relative = useRelativeTime();

  // Bumped on every fetch so stale resolutions are dropped on the floor.
  const reqIdRef = React.useRef(0);

  const fetchAll = useCallback(async () => {
    if (!remoteEnabled || !user) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const myReq = ++reqIdRef.current;
    try {
      const rows = await notificationsApi.getNotifications(user.id, {
        limit: 100,
      });
      if (myReq !== reqIdRef.current) return; // stale
      setItems(rows.map(dbToUi));
      setError(null);
    } catch (e: unknown) {
      if (myReq !== reqIdRef.current) return;
      setError((e as Error)?.message ?? "Failed to load notifications");
    } finally {
      if (myReq === reqIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [remoteEnabled, user]);

  useEffect(() => {
    setLoading(true);
    void fetchAll();
    // Bump on dep change so any in-flight request is invalidated.
    return () => {
      reqIdRef.current++;
    };
  }, [fetchAll]);

  // Mark all as read when entering the screen — best-effort. Also flip the
  // local read flags so the UI reflects the new state without waiting for
  // the next refetch.
  useEffect(() => {
    if (!remoteEnabled || !user) return;
    let cancelled = false;
    notificationsApi
      .markAllAsRead(user.id)
      .then(() => {
        if (cancelled) return;
        setItems((prev) =>
          prev.some((n) => !n.isRead)
            ? prev.map((n) => ({ ...n, isRead: true }))
            : prev,
        );
      })
      .catch(() => {
        // intentional: UI stays as-is, the user can retry by leaving + re-entering
      });
    return () => {
      cancelled = true;
    };
  }, [remoteEnabled, user]);

  // Live updates while the screen is open. Guarded so messages from a prior
  // user (after sign-out) cannot land on the new session.
  useEffect(() => {
    if (!remoteEnabled || !user) return;
    const subscribedFor = user.id;
    const unsub = notificationsApi.subscribeToNotifications(user.id, (n) => {
      if (subscribedFor !== user.id) return;
      setItems((prev) => [dbToUi(n), ...prev]);
    });
    return () => unsub();
  }, [remoteEnabled, user]);

  const onMarkAll = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (remoteEnabled && user) {
      try {
        await notificationsApi.markAllAsRead(user.id);
      } catch {
        // ignore
      }
    }
  }, [remoteEnabled, user]);

  const hasUnread = useMemo(() => items.some((n) => !n.isRead), [items]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t("notificationsTitle")}
        showBack
        rightIconName={hasUnread ? "check-circle" : undefined}
        onRightPress={hasUnread ? onMarkAll : undefined}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{
            paddingVertical: 8,
            paddingBottom: 24 + insets.bottom,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void fetchAll();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Feather name="bell" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {error ?? t("noNotifications")}
              </Text>
              {!error ? (
                <Text
                  style={[
                    styles.emptyBody,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {t("noNotificationsDesc")}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
              <View
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    flexDirection: isRtl ? "row-reverse" : "row",
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: item.isRead
                        ? colors.surface
                        : colors.primary + "1A",
                    },
                  ]}
                >
                  <Feather
                    name={iconForType(item.type)}
                    size={18}
                    color={item.isRead ? colors.mutedForeground : colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: isRtl ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={[
                        styles.title,
                        {
                          color: colors.foreground,
                          flex: 1,
                          textAlign: isRtl ? "right" : "left",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {!item.isRead ? (
                      <View
                        style={[styles.dot, { backgroundColor: colors.primary }]}
                      />
                    ) : null}
                  </View>
                  {item.body ? (
                    <Text
                      style={[
                        styles.body,
                        {
                          color: colors.mutedForeground,
                          textAlign: isRtl ? "right" : "left",
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.time,
                      {
                        color: colors.subtle,
                        textAlign: isRtl ? "right" : "left",
                      },
                    ]}
                  >
                    {relative(item.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  time: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyBody: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
