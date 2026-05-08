import { Feather } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { supportApi } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const FAQ_KEYS = [
  { q: "faq1Q", a: "faq1A" },
  { q: "faq2Q", a: "faq2A" },
  { q: "faq3Q", a: "faq3A" },
  { q: "faq4Q", a: "faq4A" },
  { q: "faq5Q", a: "faq5A" },
  { q: "faq6Q", a: "faq6A" },
] as const;

export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useApp();
  const { user } = useAuth();
  const remoteEnabled =
    isSupabaseConfigured() && !!user && user.email !== "guest@khidma.app";

  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canSubmit = useMemo(
    () => subject.trim().length > 0 && message.trim().length > 0 && !sending,
    [subject, message, sending],
  );

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSending(true);
    try {
      if (remoteEnabled && user) {
        await supportApi.createSupportTicket({
          userId: user.id,
          subject,
          message,
        });
      } else {
        // Mock / guest mode — pretend it landed.
        await new Promise((r) => setTimeout(r, 400));
      }
      setSubject("");
      setMessage("");
      setSent(true);
    } catch (e: unknown) {
      const msg = (e as Error)?.message || t("supportSendError");
      Alert.alert(t("supportSendError"), msg);
    } finally {
      setSending(false);
    }
  }, [canSubmit, remoteEnabled, user, subject, message, t]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("helpCenter")} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 32 + insets.bottom,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* FAQ */}
          <Text
            style={[
              styles.sectionLabel,
              {
                color: colors.mutedForeground,
                textAlign: isRtl ? "right" : "left",
              },
            ]}
          >
            {t("faq")}
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {FAQ_KEYS.map((row, i) => {
              const open = openIdx === i;
              return (
                <View
                  key={row.q}
                  style={{
                    borderBottomWidth:
                      i < FAQ_KEYS.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: colors.divider,
                  }}
                >
                  <Pressable
                    onPress={() => setOpenIdx(open ? null : i)}
                    style={({ pressed }) => [
                      styles.qRow,
                      {
                        flexDirection: isRtl ? "row-reverse" : "row",
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.q,
                        {
                          color: colors.foreground,
                          flex: 1,
                          textAlign: isRtl ? "right" : "left",
                        },
                      ]}
                    >
                      {t(row.q)}
                    </Text>
                    <Feather
                      name={open ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                  {open ? (
                    <Text
                      style={[
                        styles.a,
                        {
                          color: colors.mutedForeground,
                          textAlign: isRtl ? "right" : "left",
                        },
                      ]}
                    >
                      {t(row.a)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Contact */}
          <Text
            style={[
              styles.sectionLabel,
              {
                color: colors.mutedForeground,
                marginTop: 26,
                textAlign: isRtl ? "right" : "left",
              },
            ]}
          >
            {t("contactSupport")}
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                padding: 14,
                gap: 12,
              },
            ]}
          >
            <FieldLabel label={t("subject")} isRtl={isRtl} colors={colors} />
            <TextInput
              value={subject}
              onChangeText={(v) => {
                setSent(false);
                setSubject(v);
              }}
              maxLength={200}
              placeholder={t("subject")}
              placeholderTextColor={colors.subtle}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.surface,
                  textAlign: isRtl ? "right" : "left",
                },
              ]}
            />
            <FieldLabel label={t("message")} isRtl={isRtl} colors={colors} />
            <TextInput
              value={message}
              onChangeText={(v) => {
                setSent(false);
                setMessage(v);
              }}
              maxLength={4000}
              multiline
              placeholder={t("message")}
              placeholderTextColor={colors.subtle}
              style={[
                styles.input,
                styles.textarea,
                {
                  color: colors.foreground,
                  backgroundColor: colors.surface,
                  textAlign: isRtl ? "right" : "left",
                  textAlignVertical: "top",
                },
              ]}
            />
            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: canSubmit
                    ? colors.primary
                    : colors.surface,
                  opacity: pressed && canSubmit ? 0.9 : 1,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.sendBtnText,
                    {
                      color: canSubmit ? "#fff" : colors.mutedForeground,
                    },
                  ]}
                >
                  {t("sendMessage")}
                </Text>
              )}
            </Pressable>
            {sent ? (
              <View
                style={[
                  styles.successPill,
                  {
                    backgroundColor: colors.primary + "15",
                    flexDirection: isRtl ? "row-reverse" : "row",
                  },
                ]}
              >
                <Feather name="check-circle" size={14} color={colors.primary} />
                <Text style={[styles.successText, { color: colors.primary }]}>
                  {t("supportSent")}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FieldLabel({
  label,
  isRtl,
  colors,
}: {
  label: string;
  isRtl: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Text
      style={[
        styles.fieldLabel,
        { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 8,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  qRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 10,
  },
  q: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  a: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  textarea: { minHeight: 120 },
  sendBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sendBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  successPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
    gap: 6,
  },
  successText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
