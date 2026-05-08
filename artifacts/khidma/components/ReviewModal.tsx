import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BrandButton } from "@/components/ui/BrandButton";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

type Props = {
  visible: boolean;
  revieweeName: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment?: string) => Promise<void> | void;
};

export function ReviewModal({
  visible,
  revieweeName,
  submitting = false,
  onClose,
  onSubmit,
}: Props) {
  const colors = useColors();
  const { t, isRtl } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // Reset every time the modal opens so a previous draft never leaks across
  // orders.
  React.useEffect(() => {
    if (visible) {
      setRating(0);
      setComment("");
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (rating < 1) return;
    await onSubmit(rating, comment.trim() || undefined);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.title,
              { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
            ]}
          >
            {t("rateUser").replace("{name}", revieweeName)}
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.mutedForeground,
                textAlign: isRtl ? "right" : "left",
              },
            ]}
          >
            {t("tapStarToRate")}
          </Text>

          <View
            style={[
              styles.starsRow,
              { flexDirection: isRtl ? "row-reverse" : "row" },
            ]}
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = n <= rating;
              return (
                <Pressable
                  key={n}
                  onPress={() => setRating(n)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    padding: 6,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} ${t("stars")}`}
                >
                  <Feather
                    name="star"
                    size={36}
                    color={filled ? colors.warning : colors.border}
                    style={
                      filled
                        ? Platform.OS === "web"
                          ? ({ fill: colors.warning } as any)
                          : undefined
                        : undefined
                    }
                  />
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={t("commentOptional")}
            placeholderTextColor={colors.subtle}
            multiline
            maxLength={500}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.foreground,
                borderColor: colors.border,
                textAlign: isRtl ? "right" : "left",
              },
            ]}
          />

          <View style={[styles.actions, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <Pressable
              onPress={onClose}
              disabled={submitting}
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.cancelText, { color: colors.foreground }]}>
                {t("cancel")}
              </Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <BrandButton
                title={t("submitReview")}
                disabled={rating < 1}
                loading={submitting}
                onPress={handleSubmit}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  sheet: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 14,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_500Medium" },
  starsRow: {
    alignSelf: "center",
    gap: 4,
    marginVertical: 6,
  },
  input: {
    minHeight: 80,
    maxHeight: 140,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  actions: {
    gap: 10,
    alignItems: "center",
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
