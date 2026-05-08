import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { gradient } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatTime } from "@/lib/format";
import type { Message } from "@/lib/types";

import { Avatar } from "./ui/Avatar";

type Props = {
  message: Message;
  mine: boolean;
  /** Render a small "Seen" caption below this message — only set on the most
   *  recent own message that the partner has already read. */
  showSeen?: boolean;
  /** Partner's display name — used for the avatar fallback initials when
   *  no avatar URI is available. Ignored on own messages. */
  partnerName?: string;
  partnerAvatarUri?: string;
  /** Whether to render the partner avatar next to this received bubble. The
   *  caller should set this true only on the last message of each consecutive
   *  received-message run, so the column doesn't fill with duplicate avatars. */
  showPartnerAvatar?: boolean;
};

export function ChatBubble({
  message,
  mine,
  showSeen,
  partnerName,
  partnerAvatarUri,
  showPartnerAvatar,
}: Props) {
  const colors = useColors();
  const { locale, isRtl, t } = useApp();

  // Automated escrow / system messages render as a centered, neutral chip
  // so they're visually distinct from real conversation between the parties.
  if (message.isSystem) {
    return (
      <View style={[styles.systemWrap]}>
        <View
          style={[
            styles.systemBubble,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              flexDirection: isRtl ? "row-reverse" : "row",
            },
          ]}
        >
          <Feather name="info" size={12} color={colors.mutedForeground} />
          <Text style={[styles.systemText, { color: colors.mutedForeground }]}>
            {message.text}
          </Text>
        </View>
        <Text style={[styles.systemTime, { color: colors.mutedForeground }]}>
          {formatTime(message.createdAt, locale)}
        </Text>
      </View>
    );
  }

  const alignSelf = mine
    ? isRtl
      ? "flex-start"
      : "flex-end"
    : isRtl
    ? "flex-end"
    : "flex-start";

  const bubbleRadius = mine
    ? { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 }
    : { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 4, borderBottomRightRadius: 18 };

  if (mine) {
    return (
      <View style={[styles.wrap, { alignSelf }]}>
        <LinearGradient
          colors={gradient.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, bubbleRadius]}
        >
          <Text style={[styles.text, { color: "#fff" }]}>{message.text}</Text>
        </LinearGradient>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatTime(message.createdAt, locale)}
        </Text>
        {showSeen ? (
          <Text style={[styles.seen, { color: colors.mutedForeground }]}>
            {t("seen")}
          </Text>
        ) : null}
      </View>
    );
  }

  // Reserve a constant gutter for the avatar column so consecutive bubbles
  // line up cleanly even when only the last one in a run renders the avatar.
  const AVATAR_SIZE = 26;
  const AVATAR_GUTTER = AVATAR_SIZE + 8;
  return (
    <View
      style={[
        styles.partnerRow,
        {
          alignSelf,
          flexDirection: isRtl ? "row-reverse" : "row",
        },
      ]}
    >
      {showPartnerAvatar ? (
        <Avatar
          name={partnerName ?? ""}
          uri={partnerAvatarUri}
          size={AVATAR_SIZE}
        />
      ) : (
        <View style={{ width: AVATAR_SIZE }} />
      )}
      <View style={{ width: 8 }} />
      {/* Inner column intentionally has zero marginBottom — the partnerRow
          owns the vertical rhythm so we don't double-stack spacing. */}
      <View style={styles.partnerInner}>
        <View
          style={[
            styles.bubble,
            bubbleRadius,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.text, { color: colors.foreground }]}>
            {message.text}
          </Text>
        </View>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatTime(message.createdAt, locale)}
        </Text>
      </View>
      {/* AVATAR_GUTTER reserved for layout symmetry. */}
      {AVATAR_GUTTER ? null : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxWidth: "78%",
    marginBottom: 8,
    gap: 4,
  },
  partnerRow: {
    alignItems: "flex-end",
    marginBottom: 8,
    maxWidth: "86%",
  },
  partnerInner: {
    flexShrink: 1,
    gap: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  time: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginHorizontal: 4,
  },
  seen: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    alignSelf: "flex-end",
    marginHorizontal: 4,
  },
  systemWrap: {
    alignSelf: "center",
    maxWidth: "88%",
    marginBottom: 12,
    gap: 4,
    alignItems: "center",
  },
  systemBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 8,
  },
  systemText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 16,
    flexShrink: 1,
    textAlign: "center",
  },
  systemTime: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});
