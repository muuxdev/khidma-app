import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatBubble } from "@/components/ChatBubble";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { isOnlineFromLastSeen } from "@/lib/api/mappers";

export default function ChatThreadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    chats,
    messagesByThread,
    sendMessage,
    loadMessages,
    markThreadRead,
  } = useData();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const meId = user?.id ?? "";

  const thread = chats.find((c) => c.id === id);
  const messages = useMemo(
    () => (id ? messagesByThread[id] || [] : []),
    [id, messagesByThread],
  );
  const inverted = useMemo(() => [...messages].reverse(), [messages]);

  // Show the partner's avatar only on the LAST bubble of each consecutive
  // received-message run (WhatsApp / iMessage convention) — anything denser
  // looks noisy. Pre-compute the id set once per message list change.
  const avatarMessageIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.senderId === meId || m.isSystem) continue;
      const next = messages[i + 1];
      if (!next || next.senderId !== m.senderId || next.isSystem) {
        ids.add(m.id);
      }
    }
    return ids;
  }, [messages, meId]);

  // The "Seen" caption goes only on the most recent own message that the
  // partner has already read — matches WhatsApp / iMessage behaviour.
  const lastReadOwnId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.senderId === meId && m.isRead) return m.id;
    }
    return null;
  }, [messages, meId]);

  // Re-evaluate online dot every 30s so the indicator decays without needing
  // a fresh fetch from the partner.
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(i);
  }, []);
  const isOnline = thread ? isOnlineFromLastSeen(thread.lastSeenAt) : false;

  // Pull the canonical message list from the backend every time the screen
  // becomes focused (mount, returning from background, navigating back, etc.)
  // and clear the unread badge for this thread. Using useFocusEffect — not a
  // plain useEffect — guarantees a refetch even when the screen instance is
  // preserved across navigations.
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void loadMessages(id);
      void markThreadRead(id);
    }, [id, loadMessages, markThreadRead]),
  );

  // Keep the thread "read" while the screen is mounted: any incoming realtime
  // message immediately gets marked as read so the bottom-tab badge does not
  // flash up while the user is actively viewing the conversation.
  const incomingCount = messages.filter(
    (m) => m.senderId !== meId && !m.isRead,
  ).length;
  useEffect(() => {
    if (!id || incomingCount === 0) return;
    void markThreadRead(id);
  }, [id, incomingCount, markThreadRead]);

  const onSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !id || !meId) return;
    // Always tag the message with the current user's id. Ownership in the UI
    // is determined exclusively by sender_id === current user's id; we never
    // impersonate the partner with a fake auto-reply.
    sendMessage(id, trimmed, meId);
    setText("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="" showBack rightIconName="more-horizontal" />
      {thread ? (
        <Pressable
          onPress={() =>
            thread.participantId
              ? router.push(`/freelancer/${thread.participantId}`)
              : null
          }
          style={({ pressed }) => [
            styles.headerInfo,
            {
              borderBottomColor: colors.divider,
              flexDirection: isRtl ? "row-reverse" : "row",
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <Avatar
            name={thread.participantName}
            uri={thread.participantAvatar}
            size={40}
            online={isOnline}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.headerName,
                { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
              ]}
            >
              {thread.participantName}
            </Text>
            <Text
              style={[
                styles.headerStatus,
                { color: isOnline ? colors.success : colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
              ]}
            >
              {isOnline ? t("online") : ""}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={inverted}
          keyExtractor={(m) => m.id}
          inverted
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12,
          }}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              mine={item.senderId === meId}
              showSeen={item.id === lastReadOwnId}
              partnerName={thread?.participantName}
              partnerAvatarUri={thread?.participantAvatar}
              showPartnerAvatar={avatarMessageIds.has(item.id)}
            />
          )}
        />
        {thread?.isLocked ? (
          <View
            style={[
              styles.lockedBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.divider,
                paddingBottom: insets.bottom + 14,
              },
            ]}
          >
            <Feather name="lock" size={14} color={colors.mutedForeground} />
            <Text
              style={[
                styles.lockedText,
                {
                  color: colors.mutedForeground,
                  textAlign: isRtl ? "right" : "left",
                },
              ]}
            >
              {t("chatClosed")}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.divider,
                paddingBottom: insets.bottom + 10,
                flexDirection: isRtl ? "row-reverse" : "row",
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={t("typeMessage")}
              placeholderTextColor={colors.subtle}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  textAlign: isRtl ? "right" : "left",
                },
              ]}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={onSend}
              disabled={!text.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: text.trim() ? colors.primary : colors.surface,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather
                name="send"
                size={18}
                color={text.trim() ? "#fff" : colors.mutedForeground}
              />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerInfo: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  headerStatus: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  inputBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedBar: {
    paddingHorizontal: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  lockedText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flexShrink: 1,
  },
});
