import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReviewModal } from "@/components/ReviewModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Avatar } from "@/components/ui/Avatar";
import { BrandButton } from "@/components/ui/BrandButton";
import { CategoryThumb } from "@/components/ui/CategoryThumb";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

const STATUS_KEY: Record<OrderStatus, any> = {
  pending_deposit: "pendingDeposit",
  deposit_paid: "depositPaid",
  info_received: "infoReceived",
  fully_paid: "fullyPaid",
  in_progress: "inProgress",
  delivered: "delivered",
  completed: "completed",
  cancelled: "cancelled",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending_deposit: "#FF7A1A",
  deposit_paid: "#F59E0B",
  info_received: "#FACC15",
  fully_paid: "#06B6D4",
  in_progress: "#2F6BFF",
  delivered: "#9333EA",
  completed: "#39E2C2",
  cancelled: "#FF3B30",
};

// Steps shown in the progress strip — one per state in the escrow lifecycle
// (cancelled is rendered as a banner instead of a step).
const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "pending_deposit", label: "pendingDeposit" },
  { key: "deposit_paid", label: "depositPaid" },
  { key: "info_received", label: "infoReceived" },
  { key: "fully_paid", label: "fullyPaid" },
  { key: "in_progress", label: "inProgress" },
  { key: "delivered", label: "delivered" },
  { key: "completed", label: "completed" },
];

function statusRank(s: OrderStatus): number {
  const order: OrderStatus[] = [
    "pending_deposit",
    "deposit_paid",
    "info_received",
    "fully_paid",
    "in_progress",
    "delivered",
    "completed",
  ];
  const i = order.indexOf(s);
  return i === -1 ? -1 : i;
}

function formatCountdown(ms: number, t: (k: any) => string): string {
  if (ms <= 0) return "0" + t("hoursShort");
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  if (days >= 1) {
    const remH = hours - days * 24;
    return `${days}${t("daysShort2")} ${remH}${t("hoursShort")}`;
  }
  return `${hours}${t("hoursShort")}`;
}

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, locale, isRtl } = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    orders,
    ensureThread,
    payDeposit,
    markInfoReceived,
    payFinal,
    startWork,
    markDelivered,
    confirmDelivery,
    reviewedOrderIds,
    submitReview,
  } = useData();
  const { user } = useAuth();
  const order = orders.find((o) => o.id === id);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);

  // Re-render once a minute so the auto-release countdown ticks. Cheap.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (order?.status !== "delivered") return;
    const i = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(i);
  }, [order?.status]);

  const [busy, setBusy] = useState(false);

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ScreenHeader title="" showBack />
        <Text style={{ color: colors.foreground }}>Order not found</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLOR[order.status];
  const isClient = user?.id === order.clientId;
  const isFreelancer = user?.id === order.freelancerId;
  const chatUnlocked =
    order.status !== "pending_deposit" && order.status !== "cancelled";

  // The freelancer view shows the client; the client view shows the
  // freelancer. We only render the relevant counterparty.
  const counterpartyName = isClient ? order.freelancerName : order.clientName;
  const counterpartyId = isClient ? order.freelancerId : order.clientId;
  const counterpartyLabel = isClient ? t("seller") : t("client");

  const orderRank = statusRank(order.status);

  const openChat = async () => {
    // Prefer an order-scoped thread so multiple orders between the same pair
    // each carry their own escrow audit trail. ensureThread() is partner-
    // keyed in mock mode (a known limitation we accept for the demo) but
    // backed by the order_id conversation in remote mode via the orders API.
    const thread = await ensureThread(counterpartyId, counterpartyName);
    router.push(`/chat/${thread.id}`);
  };

  // Confirmation dialog shared by all "pay" buttons. We don't actually move
  // money — the wallet is simulated for the MVP — but we want the UX to
  // feel like a payment step.
  const confirmPay = (amount: number, onYes: () => Promise<void>) => {
    const desc = t("payConfirmDesc").replace(
      "{amount}",
      formatPrice(amount, locale),
    );
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (typeof window !== "undefined" && window.confirm(`${t("payConfirmTitle")}\n\n${desc}`)) {
        void onYes();
      }
      return;
    }
    Alert.alert(t("payConfirmTitle"), desc, [
      { text: t("cancel"), style: "cancel" },
      { text: t("pay"), onPress: () => void onYes() },
    ]);
  };

  const runAction = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (err: any) {
      const msg = err?.message ?? t("errorGeneric");
      if (Platform.OS === "web") {
        // eslint-disable-next-line no-alert
        if (typeof window !== "undefined") window.alert(msg);
      } else {
        Alert.alert(t("errorGeneric"), msg);
      }
    } finally {
      setBusy(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Action button derivation per (role, status). Returns null if no action is
  // available to the current viewer.
  // ---------------------------------------------------------------------------
  const renderActions = (): React.ReactNode => {
    if (order.status === "cancelled") return null;
    if (order.status === "completed") {
      const alreadyReviewed = reviewedOrderIds.has(order.id);
      return (
        <BrandButton
          title={alreadyReviewed ? t("reviewed") : t("leaveReview")}
          variant="outline"
          disabled={alreadyReviewed}
          onPress={() => setReviewOpen(true)}
          iconLeft={
            <Feather
              name={alreadyReviewed ? "check" : "star"}
              size={18}
              color={colors.foreground}
            />
          }
        />
      );
    }

    if (isClient) {
      if (order.status === "pending_deposit") {
        const dep = order.depositAmount ?? Math.round(order.price * 0.15);
        return (
          <BrandButton
            title={`${t("payDeposit")} · ${t("sar")} ${formatPrice(dep, locale)}`}
            loading={busy}
            onPress={() =>
              confirmPay(dep, () => runAction(() => payDeposit(order.id)))
            }
            iconLeft={<Feather name="lock" size={18} color="#fff" />}
          />
        );
      }
      if (order.status === "info_received") {
        const fin = order.finalAmount ?? Math.round(order.price * 0.85);
        return (
          <BrandButton
            title={`${t("payRemaining")} · ${t("sar")} ${formatPrice(fin, locale)}`}
            loading={busy}
            onPress={() =>
              confirmPay(fin, () => runAction(() => payFinal(order.id)))
            }
            iconLeft={<Feather name="credit-card" size={18} color="#fff" />}
          />
        );
      }
      if (order.status === "delivered") {
        return (
          <BrandButton
            title={t("confirmDelivery")}
            loading={busy}
            onPress={() => runAction(() => confirmDelivery(order.id))}
            iconLeft={<Feather name="check-circle" size={18} color="#fff" />}
          />
        );
      }
      return null;
    }

    if (isFreelancer) {
      if (order.status === "deposit_paid") {
        return (
          <BrandButton
            title={t("confirmInfoReceived")}
            loading={busy}
            onPress={() => runAction(() => markInfoReceived(order.id))}
            iconLeft={<Feather name="check" size={18} color="#fff" />}
          />
        );
      }
      if (order.status === "fully_paid") {
        return (
          <BrandButton
            title={t("startWork")}
            loading={busy}
            onPress={() => runAction(() => startWork(order.id))}
            iconLeft={<Feather name="play" size={18} color="#fff" />}
          />
        );
      }
      if (order.status === "in_progress") {
        return (
          <BrandButton
            title={t("markDelivered")}
            loading={busy}
            onPress={() => runAction(() => markDelivered(order.id))}
            iconLeft={<Feather name="upload" size={18} color="#fff" />}
          />
        );
      }
      return null;
    }
    return null;
  };

  // Auto-release countdown banner shown while in `delivered`.
  const releaseBanner = (() => {
    if (order.status !== "delivered" || !order.autoReleaseAt) return null;
    const remaining = order.autoReleaseAt - Date.now();
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: STATUS_COLOR.delivered + "1A",
            borderColor: STATUS_COLOR.delivered + "55",
            flexDirection: isRtl ? "row-reverse" : "row",
          },
        ]}
      >
        <Feather name="clock" size={16} color={STATUS_COLOR.delivered} />
        <Text style={[styles.bannerText, { color: STATUS_COLOR.delivered }]}>
          {remaining > 0
            ? `${t("autoReleaseIn")} ${formatCountdown(remaining, t)}`
            : t("autoReleasedNow")}
        </Text>
      </View>
    );
  })();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("orderId") + " #" + order.id.slice(-6).toUpperCase()} showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        {/* Service summary */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <CategoryThumb category={order.serviceCover} size={64} rounded={14} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={[
                styles.title,
                { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
              ]}
              numberOfLines={2}
            >
              {order.serviceTitle}
            </Text>
            <View
              style={[
                styles.metaRow,
                { flexDirection: isRtl ? "row-reverse" : "row" },
              ]}
            >
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: statusColor + "20" },
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {t(STATUS_KEY[order.status])}
                </Text>
              </View>
              <Text style={[styles.tierBadge, { color: colors.mutedForeground }]}>
                {t(order.packageTier)}
              </Text>
            </View>
          </View>
        </View>

        {releaseBanner ? (
          <View style={{ paddingHorizontal: 20, marginTop: 14 }}>{releaseBanner}</View>
        ) : null}

        {/* Progress steps */}
        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("orderProgress")}
          </Text>
          <View
            style={[
              styles.stepsRow,
              { flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            {STEPS.map((s, i) => {
              const reached = statusRank(s.key) <= orderRank;
              return (
                <React.Fragment key={s.key}>
                  <View style={styles.stepWrap}>
                    <View
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: reached ? statusColor : colors.divider,
                        },
                      ]}
                    >
                      {reached ? (
                        <Feather name="check" size={11} color="#fff" />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        {
                          color: reached ? colors.foreground : colors.mutedForeground,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {t(s.label)}
                    </Text>
                  </View>
                  {i < STEPS.length - 1 ? (
                    <View
                      style={[
                        styles.stepBar,
                        {
                          backgroundColor:
                            statusRank(STEPS[i + 1].key) <= orderRank
                              ? statusColor
                              : colors.divider,
                        },
                      ]}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Counterparty */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {counterpartyLabel}
          </Text>
          <View
            style={[
              styles.sellerCard,
              { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            <Avatar name={counterpartyName} size={44} online />
            <Text
              style={[
                styles.sellerName,
                { color: colors.foreground, flex: 1, textAlign: isRtl ? "right" : "left" },
              ]}
            >
              {counterpartyName}
            </Text>
            {chatUnlocked ? (
              <BrandButton
                title={t("openChat")}
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={openChat}
                iconLeft={<Feather name="message-circle" size={14} color={colors.foreground} />}
              />
            ) : (
              <View
                style={[
                  styles.lockedPill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Feather name="lock" size={12} color={colors.mutedForeground} />
                <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>
                  {t("chatLockedTitle")}
                </Text>
              </View>
            )}
          </View>
          {!chatUnlocked ? (
            <Text
              style={[
                styles.lockedHint,
                { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
              ]}
            >
              {t("chatLockedDesc")}
            </Text>
          ) : null}
        </View>

        {/* Details */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <View
            style={[
              styles.detailCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <DetailRow label={t("orderId")} value={"#" + order.id.slice(-6).toUpperCase()} />
            <DetailRow label={t("package")} value={t(order.packageTier)} />
            <DetailRow label={t("deliveryDate")} value={formatDate(order.dueAt, locale)} />
            <DetailRow
              label={t("deposit15")}
              value={`${t("sar")} ${formatPrice(order.depositAmount ?? Math.round(order.price * 0.15), locale)}`}
            />
            <DetailRow
              label={t("final85")}
              value={`${t("sar")} ${formatPrice(order.finalAmount ?? Math.round(order.price * 0.85), locale)}`}
            />
            <DetailRow
              label={t("total")}
              value={`${t("sar")} ${formatPrice(order.price, locale)}`}
              highlight
            />
          </View>
        </View>

        {/* Action */}
        {(() => {
          const action = renderActions();
          if (!action) return null;
          return (
            <View style={{ paddingHorizontal: 20, marginTop: 22 }}>{action}</View>
          );
        })()}
      </ScrollView>
      <ReviewModal
        visible={reviewOpen}
        revieweeName={counterpartyName}
        submitting={reviewBusy}
        onClose={() => (!reviewBusy ? setReviewOpen(false) : undefined)}
        onSubmit={async (rating, comment) => {
          if (reviewBusy) return;
          setReviewBusy(true);
          try {
            await submitReview({
              orderId: order.id,
              revieweeId: counterpartyId,
              rating,
              comment,
            });
            setReviewOpen(false);
          } catch (err: any) {
            const msg = err?.message ?? t("errorGeneric");
            if (Platform.OS === "web") {
              if (typeof window !== "undefined") window.alert(msg);
            } else {
              Alert.alert(t("errorGeneric"), msg);
            }
          } finally {
            setReviewBusy(false);
          }
        }}
      />
    </View>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const colors = useColors();
  const { isRtl } = useApp();
  return (
    <View
      style={[
        styles.detailRow,
        { flexDirection: isRtl ? "row-reverse" : "row" },
      ]}
    >
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.detailValue,
          {
            color: highlight ? colors.primary : colors.foreground,
            fontFamily: highlight ? "Inter_700Bold" : "Inter_600SemiBold",
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  summaryCard: {
    margin: 20,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    alignItems: "center",
  },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  metaRow: { alignItems: "center", gap: 8, marginTop: 4 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tierBadge: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  stepsRow: { alignItems: "center" },
  stepWrap: { alignItems: "center", gap: 6, width: 56 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  stepBar: { flex: 1, height: 2, marginHorizontal: -8, marginBottom: 18 },
  sellerCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  sellerName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  lockedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lockedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  lockedHint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 8,
    lineHeight: 16,
  },
  detailCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  detailRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  detailValue: { fontSize: 14 },
  banner: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  bannerText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
});
