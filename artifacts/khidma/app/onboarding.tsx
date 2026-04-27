import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandButton } from "@/components/ui/BrandButton";
import { brand, gradient } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { Role } from "@/lib/types";

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, locale, setLocale, isRtl } = useApp();
  const { guestMode } = useAuth();
  const [role, setRole] = useState<Role | null>(null);

  const handleContinue = () => {
    if (!role) return;
    router.push({ pathname: "/(auth)/signup", params: { role } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.background === "#10121A" ? "light" : "dark"} />
      <LinearGradient
        colors={[brand.purple + "26", "transparent"]}
        style={[styles.bgGlow, { top: -120 + insets.top }]}
      />

      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            flexDirection: isRtl ? "row-reverse" : "row",
          },
        ]}
      >
        <LinearGradient
          colors={gradient.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logo}
        >
          <Text style={styles.logoText}>K</Text>
        </LinearGradient>
        <Pressable
          onPress={() => setLocale(locale === "en" ? "ar" : "en")}
          style={[styles.langPill, { backgroundColor: colors.surface }]}
          hitSlop={8}
        >
          <Feather name="globe" size={14} color={colors.foreground} />
          <Text style={[styles.langText, { color: colors.foreground }]}>
            {locale === "en" ? t("arabic") : t("english")}
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={[styles.appName, { color: colors.foreground, textAlign: isRtl ? "right" : "left" }]}>
          {t("appName")}
        </Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" }]}>
          {t("tagline")}
        </Text>

        <Text
          style={[
            styles.sectionLabel,
            {
              color: colors.foreground,
              textAlign: isRtl ? "right" : "left",
              marginTop: 36,
            },
          ]}
        >
          {t("chooseRole")}
        </Text>

        <RoleCard
          selected={role === "client"}
          onPress={() => setRole("client")}
          title={t("iAmClient")}
          subtitle={t("iAmClientDesc")}
          iconName="shopping-bag"
          gradientColors={[brand.purple, brand.blue]}
        />
        <RoleCard
          selected={role === "freelancer"}
          onPress={() => setRole("freelancer")}
          title={t("iAmFreelancer")}
          subtitle={t("iAmFreelancerDesc")}
          iconName="briefcase"
          gradientColors={[brand.orange, brand.pink]}
        />
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <BrandButton
          title={t("continue")}
          onPress={handleContinue}
          disabled={!role}
          iconRight={
            <Feather
              name={isRtl ? "arrow-left" : "arrow-right"}
              size={18}
              color="#fff"
            />
          }
        />
        <Pressable
          onPress={async () => {
            if (!role) return;
            await guestMode(role);
            router.replace("/(tabs)");
          }}
          hitSlop={8}
        >
          <Text style={[styles.guest, { color: colors.mutedForeground }]}>
            {t("continueAsGuest")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function RoleCard({
  selected,
  onPress,
  title,
  subtitle,
  iconName,
  gradientColors,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  subtitle: string;
  iconName: React.ComponentProps<typeof Feather>["name"];
  gradientColors: [string, string];
}) {
  const colors = useColors();
  const { isRtl } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleCard,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
          flexDirection: isRtl ? "row-reverse" : "row",
          opacity: pressed ? 0.96 : 1,
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.roleIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Feather name={iconName} size={22} color="#fff" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.roleTitle,
            { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.roleSub,
            { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
          ]}
        >
          {subtitle}
        </Text>
      </View>
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.primary : "transparent",
          },
        ]}
      >
        {selected ? <Feather name="check" size={14} color="#fff" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlow: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: 250,
    alignSelf: "center",
  },
  topBar: {
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  langText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
  },
  appName: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    marginTop: 8,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    opacity: 0.7,
  },
  roleCard: {
    borderRadius: 18,
    padding: 16,
    gap: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  roleSub: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
    lineHeight: 18,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 20,
    gap: 14,
    alignItems: "center",
  },
  guest: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    paddingVertical: 4,
  },
});
