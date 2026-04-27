import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/contexts/AppContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { formatRelative } from "@/lib/format";

export default function ChatListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, locale, isRtl } = useApp();
  const { chats } = useData();

  const sorted = [...chats].sort((a, b) => b.lastMessageAt - a.lastMessageAt);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 24) : insets.top;
  const bottomPad = Platform.OS === "web" ? insets.bottom + 100 : 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topPad + 8, paddingHorizontal: 20 }}>
        <Text
          style={[
            styles.title,
            { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
          ]}
        >
          {t("chat")}
        </Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: bottomPad }}
        ItemSeparatorComponent={() => (
          <View
            style={[
              styles.divider,
              { backgroundColor: colors.divider },
            ]}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
              <Feather name="message-circle" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {t("noChats")}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {t("noChatsDesc")}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/chat/${item.id}`)}
            style={({ pressed }) => [
              styles.row,
              {
                flexDirection: isRtl ? "row-reverse" : "row",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Avatar name={item.participantName} size={52} online={item.online} />
            <View style={{ flex: 1 }}>
              <View
                style={[
                  styles.topRow,
                  { flexDirection: isRtl ? "row-reverse" : "row" },
                ]}
              >
                <Text
                  style={[
                    styles.name,
                    { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
                  ]}
                  numberOfLines={1}
                >
                  {item.participantName}
                </Text>
                <Text style={[styles.time, { color: colors.mutedForeground }]}>
                  {formatRelative(item.lastMessageAt, locale)}
                </Text>
              </View>
              <View
                style={[
                  styles.bottomRow,
                  { flexDirection: isRtl ? "row-reverse" : "row" },
                ]}
              >
                <Text
                  style={[
                    styles.preview,
                    { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage || t("typeMessage")}
                </Text>
                {item.unreadCount > 0 ? (
                  <View
                    style={[
                      styles.unreadDot,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        )}
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
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
    gap: 12,
  },
  topRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  bottomRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    gap: 8,
  },
  preview: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  unreadDot: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 84,
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
