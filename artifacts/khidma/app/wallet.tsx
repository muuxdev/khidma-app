import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ScreenHeader";
import { BrandButton } from "@/components/ui/BrandButton";
import { gradient } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { formatPrice, formatRelative } from "@/lib/format";
import type { Transaction } from "@/lib/types";

const TYPE_KEY: Record<Transaction["type"], any> = {
  earning: "earning",
  withdrawal: "withdrawal",
  deposit: "deposit",
  refund: "refund",
};

const TYPE_ICON: Record<Transaction["type"], any> = {
  earning: "arrow-down-left",
  withdrawal: "arrow-up-right",
  deposit: "plus-circle",
  refund: "refresh-cw",
};

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, locale, isRtl } = useApp();
  const { walletBalance, transactions, withdraw } = useData();
  const [withdrawing, setWithdrawing] = useState(false);

  const pending = transactions
    .filter((tx) => tx.status === "pending" && tx.type === "earning")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const handleWithdraw = async () => {
    if (walletBalance <= 0) return;
    setWithdrawing(true);
    await withdraw(walletBalance);
    setWithdrawing(false);
    if (Platform.OS !== "web") {
      Alert.alert(t("done"), `${t("sar")} ${formatPrice(walletBalance, locale)}`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("wallet")} showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <LinearGradient
            colors={gradient.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <Text style={[styles.balLabel, { textAlign: isRtl ? "right" : "left" }]}>
              {t("availableBalance")}
            </Text>
            <Text style={[styles.balValue, { textAlign: isRtl ? "right" : "left" }]}>
              {t("sar")} {formatPrice(walletBalance, locale)}
            </Text>
            <Text style={[styles.balPending, { textAlign: isRtl ? "right" : "left" }]}>
              {t("pendingClearance")}: {t("sar")} {formatPrice(pending, locale)}
            </Text>
            <View style={{ marginTop: 18 }}>
              <BrandButton
                title={t("withdraw")}
                variant="secondary"
                onPress={handleWithdraw}
                loading={withdrawing}
                disabled={walletBalance <= 0}
                iconLeft={
                  <Feather name="arrow-up-right" size={16} color={colors.foreground} />
                }
                style={{ backgroundColor: "#FFFFFFE6" }}
              />
            </View>
          </LinearGradient>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 22, marginBottom: 12 }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("transactions")}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          {transactions.map((tx) => {
            const isPositive = tx.amount > 0;
            return (
              <View
                key={tx.id}
                style={[
                  styles.txRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    flexDirection: isRtl ? "row-reverse" : "row",
                  },
                ]}
              >
                <View
                  style={[
                    styles.txIcon,
                    {
                      backgroundColor: isPositive
                        ? colors.success + "20"
                        : colors.warning + "20",
                    },
                  ]}
                >
                  <Feather
                    name={TYPE_ICON[tx.type]}
                    size={16}
                    color={isPositive ? colors.success : colors.warning}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.txDesc,
                      { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
                    ]}
                    numberOfLines={1}
                  >
                    {tx.description}
                  </Text>
                  <Text
                    style={[
                      styles.txMeta,
                      { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
                    ]}
                  >
                    {t(TYPE_KEY[tx.type])} · {formatRelative(tx.createdAt, locale)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    {
                      color: isPositive ? colors.success : colors.foreground,
                    },
                  ]}
                >
                  {isPositive ? "+" : ""}
                  {formatPrice(tx.amount, locale)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    borderRadius: 22,
    padding: 22,
    gap: 6,
  },
  balLabel: {
    color: "#FFFFFFCC",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  balValue: {
    color: "#fff",
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    marginTop: 2,
  },
  balPending: {
    color: "#FFFFFFCC",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  txRow: {
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  txDesc: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  txMeta: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
