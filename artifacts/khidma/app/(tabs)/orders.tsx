import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OrderCard } from "@/components/OrderCard";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

type Filter = "all" | "active" | "completed";

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useApp();
  const { orders } = useData();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");

  const visibleOrders = useMemo(() => {
    let list = orders;
    if (filter === "active") {
      list = list.filter(
        (o) => o.status !== "completed" && o.status !== "cancelled",
      );
    } else if (filter === "completed") {
      list = list.filter(
        (o) => o.status === "completed" || o.status === "cancelled",
      );
    }
    return list;
  }, [orders, filter]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 24) : insets.top;
  const bottomPad = Platform.OS === "web" ? insets.bottom + 100 : 100;

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: t("allOrders") },
    { key: "active", label: t("active") },
    { key: "completed", label: t("history") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topPad + 8, paddingHorizontal: 20 }}>
        <Text
          style={[
            styles.title,
            { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
          ]}
        >
          {t("orders")}
        </Text>
        <View
          style={[
            styles.filterRow,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          {tabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setFilter(tab.key)}
                style={({ pressed }) => [
                  styles.tab,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? "#fff" : colors.foreground },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={visibleOrders}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: bottomPad }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
              <Feather name="package" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {t("noOrders")}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {t("noOrdersDesc")}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  filterRow: {
    marginTop: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
