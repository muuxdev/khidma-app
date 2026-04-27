import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

  // On mount (and whenever the conversation id changes), pull the canonical
  // message list from the backend and clear the unread badge for this thread.
  useEffect(() => {
    if (!id) return;
    void loadMessages(id);
    void markThreadRead(id);
  }, [id, loadMessages, markThreadRead]);

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
        <View
          style={[
            styles.headerInfo,
            {
              borderBottomColor: colors.divider,
              flexDirection: isRtl ? "row-reverse" : "row",
            },
          ]}
        >
          <Avatar name={thread.participantName} size={40} online={thread.online} />
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
                { color: thread.online ? colors.success : colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
              ]}
            >
              {thread.online ? t("online") : ""}
            </Text>
          </View>
        </View>
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
            <ChatBubble message={item} mine={item.senderId === meId} />
          )}
        />
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
});
