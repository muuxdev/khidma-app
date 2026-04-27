import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { gradient } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatTime } from "@/lib/format";
import type { Message } from "@/lib/types";

type Props = {
  message: Message;
  mine: boolean;
};

export function ChatBubble({ message, mine }: Props) {
  const colors = useColors();
  const { locale, isRtl } = useApp();

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
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { alignSelf }]}>
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
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxWidth: "78%",
    marginBottom: 8,
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
});
