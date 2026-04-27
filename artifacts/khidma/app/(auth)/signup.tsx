import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { ScreenHeader } from "@/components/ScreenHeader";
import { BrandButton } from "@/components/ui/BrandButton";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { Role } from "@/lib/types";

export default function SignupScreen() {
  const colors = useColors();
  const { t, isRtl } = useApp();
  const { signup } = useAuth();
  const params = useLocalSearchParams<{ role?: string }>();
  const role: Role = params.role === "freelancer" ? "freelancer" : "client";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const valid = name.length >= 2 && email.includes("@") && password.length >= 6;

  const onSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    await signup(name, email, password, role);
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="" showBack transparent />
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
        contentContainerStyle={styles.scroll}
      >
        <Text
          style={[
            styles.title,
            { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
          ]}
        >
          {t("signup")}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
          ]}
        >
          {role === "freelancer" ? t("iAmFreelancer") : t("iAmClient")}
        </Text>

        <View style={styles.form}>
          <FieldLabel label={t("fullName")} />
          <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Feather name="user" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
              placeholder={t("fullName")}
              placeholderTextColor={colors.subtle}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
          </View>

          <FieldLabel label={t("email")} />
          <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Feather name="mail" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.subtle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <FieldLabel label={t("password")} />
          <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Feather name="lock" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}
              placeholder="••••••••"
              placeholderTextColor={colors.subtle}
              secureTextEntry={!showPwd}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPwd((s) => !s)} hitSlop={8}>
              <Feather name={showPwd ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <BrandButton
            title={t("signup")}
            onPress={onSubmit}
            loading={loading}
            disabled={!valid}
            style={{ marginTop: 24 }}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={{ color: colors.mutedForeground }}>{t("haveAccount")} </Text>
          <Pressable onPress={() => router.push("/(auth)/login")} hitSlop={8}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              {t("login")}
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  const colors = useColors();
  const { isRtl } = useApp();
  return (
    <Text
      style={[
        styles.fieldLabel,
        { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.6 },
  subtitle: { fontSize: 16, fontFamily: "Inter_500Medium", marginTop: 6 },
  form: { marginTop: 28, gap: 8 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginTop: 14,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  footerRow: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  linkText: { fontFamily: "Inter_600SemiBold" },
});
