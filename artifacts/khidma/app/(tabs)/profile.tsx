import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/Avatar";
import { gradient } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, locale, isRtl, isDark } = useApp();
  const { user, logout } = useAuth();
  const { orders } = useData();

  const isFreelancer = user?.role === "freelancer";
  // Derive completed-job count from live orders rather than the User row,
  // which the profile mapper hard-codes to 0.
  const completedJobs = React.useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "completed" &&
          (isFreelancer ? o.freelancerId === user?.id : o.clientId === user?.id),
      ).length,
    [orders, isFreelancer, user?.id],
  );

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 24) : insets.top;
  const bottomPad = Platform.OS === "web" ? insets.bottom + 100 : 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad }}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("profile")}
          </Text>
        </View>

        {/* Profile card */}
        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <LinearGradient
            colors={gradient.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={[styles.profileTop, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <Avatar name={user?.name || "U"} size={64} online />
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { textAlign: isRtl ? "right" : "left" }]}>
                  {user?.name}
                </Text>
                <Text style={[styles.userEmail, { textAlign: isRtl ? "right" : "left" }]}>
                  {user?.email}
                </Text>
                <View
                  style={[
                    styles.rolePill,
                    { alignSelf: isRtl ? "flex-end" : "flex-start" },
                  ]}
                >
                  <Feather
                    name={isFreelancer ? "briefcase" : "shopping-bag"}
                    size={11}
                    color="#fff"
                  />
                  <Text style={styles.roleText}>
                    {isFreelancer ? t("iAmFreelancer") : t("iAmClient")}
                  </Text>
                </View>
              </View>
            </View>

            {isFreelancer ? (
              <View style={[styles.statsRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
                <Stat value={completedJobs.toString()} label={t("completed")} />
                <View style={styles.statDivider} />
                <Stat
                  value={`${(user?.rating || 0).toFixed(1)} (${user?.reviewCount ?? 0})`}
                  label={t("rating")}
                />
                <View style={styles.statDivider} />
                <Stat value="98%" label={t("responseRate")} />
              </View>
            ) : null}
          </LinearGradient>
        </View>

        {/* Freelancer quick links */}
        {isFreelancer ? (
          <View style={[styles.quickRow, { paddingHorizontal: 20, marginTop: 14, flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <QuickLink
              iconName="bar-chart-2"
              label={t("dashboard")}
              onPress={() => router.push("/dashboard")}
            />
            <QuickLink
              iconName="credit-card"
              label={t("wallet")}
              onPress={() => router.push("/wallet")}
            />
          </View>
        ) : null}

        {/* Settings list */}
        <View style={{ paddingHorizontal: 20, marginTop: 22, gap: 4 }}>
          <SettingRow
            iconName="edit-2"
            label={t("editProfile")}
            onPress={() => router.push("/profile/edit")}
          />
          <SettingRow
            iconName="settings"
            label={t("settings")}
            onPress={() => router.push("/settings")}
          />
          <SettingRow
            iconName="bell"
            label={t("notifications")}
            onPress={() => router.push("/notifications")}
          />
          <SettingRow
            iconName="help-circle"
            label={t("helpSupport")}
            onPress={() => router.push("/help")}
          />
          <SettingRow
            iconName="info"
            label={t("aboutKhidma")}
            value={`v1.0.0`}
          />
          <SettingRow
            iconName="log-out"
            label={t("logout")}
            danger
            onPress={async () => {
              await logout();
              router.replace("/onboarding");
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickLink({
  iconName,
  label,
  onPress,
}: {
  iconName: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickLink,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: colors.primary + "1A" }]}>
        <Feather name={iconName} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.quickLabel, { color: colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SettingRow({
  iconName,
  label,
  value,
  onPress,
  danger,
}: {
  iconName: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const colors = useColors();
  const { isRtl } = useApp();
  const color = danger ? colors.destructive : colors.foreground;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.settingRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          flexDirection: isRtl ? "row-reverse" : "row",
          opacity: pressed && onPress ? 0.92 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.settingIcon,
          {
            backgroundColor: danger
              ? colors.destructive + "1A"
              : colors.surface,
          },
        ]}
      >
        <Feather name={iconName} size={16} color={color} />
      </View>
      <Text style={[styles.settingLabel, { color, flex: 1, textAlign: isRtl ? "right" : "left" }]}>
        {label}
      </Text>
      {value ? (
        <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>
          {value}
        </Text>
      ) : onPress ? (
        <Feather
          name={isRtl ? "chevron-left" : "chevron-right"}
          size={18}
          color={colors.mutedForeground}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  profileCard: {
    borderRadius: 22,
    padding: 18,
    gap: 16,
  },
  profileTop: {
    alignItems: "center",
    gap: 14,
  },
  userName: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  userEmail: {
    color: "#FFFFFFCC",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF26",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  roleText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    paddingTop: 14,
    borderTopColor: "#FFFFFF30",
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  statVal: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    color: "#FFFFFFCC",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#FFFFFF30",
  },
  quickRow: {
    gap: 12,
  },
  quickLink: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  settingRow: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  settingValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
