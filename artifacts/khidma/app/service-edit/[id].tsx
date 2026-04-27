import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CATEGORIES } from "@/components/CategoryCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { BrandButton } from "@/components/ui/BrandButton";
import { brand } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useColors } from "@/hooks/useColors";
import { genId } from "@/lib/storage";
import type {
  Service,
  ServiceAddOn,
  ServiceCategory,
  ServicePackage,
} from "@/lib/types";

type DraftPackage = {
  tier: "basic" | "standard" | "premium";
  name: string;
  price: string;
  deliveryDays: string;
  revisions: string;
  features: string;
};

const TIER_DEFAULTS: Record<DraftPackage["tier"], string> = {
  basic: "Starter",
  standard: "Growth",
  premium: "Pro",
};

const DEFAULT_PRICES: Record<DraftPackage["tier"], string> = {
  basic: "300",
  standard: "750",
  premium: "1500",
};

const DEFAULT_DAYS: Record<DraftPackage["tier"], string> = {
  basic: "3",
  standard: "5",
  premium: "10",
};

function makeEmptyPackages(): DraftPackage[] {
  return (["basic", "standard", "premium"] as const).map((tier) => ({
    tier,
    name: TIER_DEFAULTS[tier],
    price: DEFAULT_PRICES[tier],
    deliveryDays: DEFAULT_DAYS[tier],
    revisions: tier === "basic" ? "1" : tier === "standard" ? "3" : "5",
    features: "",
  }));
}

export default function ServiceEditScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, locale, isRtl } = useApp();
  const { user } = useAuth();
  const { getServiceById, upsertService, deleteService } = useData();
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = !params.id || params.id === "new";

  const existing = !isNew ? getServiceById(params.id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState<ServiceCategory>(
    (existing?.category as ServiceCategory) ?? "shopify",
  );
  const [packages, setPackages] = useState<DraftPackage[]>(() => {
    if (existing) {
      return existing.packages.map((p) => ({
        tier: p.tier,
        name: p.name,
        price: p.price.toString(),
        deliveryDays: p.deliveryDays.toString(),
        revisions: p.revisions.toString(),
        features: p.features.join("\n"),
      }));
    }
    return makeEmptyPackages();
  });
  const [addOns, setAddOns] = useState<ServiceAddOn[]>(existing?.addOns ?? []);
  const [published, setPublished] = useState<boolean>(
    existing ? existing.status !== "draft" : true,
  );
  const [saving, setSaving] = useState(false);

  const headerTitle = isNew ? t("newService") : t("editService");

  const updatePackage = (idx: number, patch: Partial<DraftPackage>) => {
    setPackages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    );
  };

  const addAddon = () => {
    setAddOns((prev) => [
      ...prev,
      {
        id: "ao-" + genId().slice(0, 6),
        title: "",
        price: 0,
        deliveryDays: 1,
      },
    ]);
  };

  const updateAddon = (id: string, patch: Partial<ServiceAddOn>) => {
    setAddOns((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  };

  const removeAddon = (id: string) => {
    setAddOns((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert(t("requiredFields"), t("serviceTitle") + " · " + t("description"));
      return;
    }
    const builtPackages: ServicePackage[] = packages.map((p) => ({
      tier: p.tier,
      name: p.name.trim() || TIER_DEFAULTS[p.tier],
      price: Math.max(0, parseInt(p.price || "0", 10) || 0),
      deliveryDays: Math.max(1, parseInt(p.deliveryDays || "1", 10) || 1),
      revisions: Math.max(0, parseInt(p.revisions || "0", 10) || 0),
      features: p.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
    }));

    const cleanAddons: ServiceAddOn[] = addOns
      .filter((a) => a.title.trim())
      .map((a) => ({
        ...a,
        title: a.title.trim(),
        price: Math.max(0, Number(a.price) || 0),
        deliveryDays: Math.max(1, Number(a.deliveryDays) || 1),
      }));

    const id = existing?.id ?? "svc-u-" + genId().slice(0, 6);
    const payload: Service = {
      id,
      title: title.trim(),
      titleAr: existing?.titleAr || title.trim(),
      category,
      description: description.trim(),
      descriptionAr: existing?.descriptionAr || description.trim(),
      cover: category,
      rating: existing?.rating ?? 5,
      reviewCount: existing?.reviewCount ?? 0,
      ordersInQueue: existing?.ordersInQueue ?? 0,
      freelancerId: user?.id ?? "me",
      freelancerName: user?.name ?? "You",
      packages: builtPackages,
      tags: existing?.tags ?? [],
      addOns: cleanAddons,
      status: published ? "published" : "draft",
      ownerType: "user",
    };

    setSaving(true);
    try {
      await upsertService(payload);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    const doDelete = async () => {
      await deleteService(existing.id);
      router.back();
    };
    if (Platform.OS === "web") {
      // @ts-ignore
      if (typeof window !== "undefined" && window.confirm(t("deleteConfirm"))) {
        doDelete();
      }
      return;
    }
    Alert.alert(t("deleteConfirm"), t("deleteConfirmDesc"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: doDelete },
    ]);
  };

  const inputStyle = useMemo(
    () => ({
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      color: colors.foreground,
      textAlign: (isRtl ? "right" : "left") as "right" | "left",
    }),
    [colors, isRtl],
  );

  const bottomPad =
    (Platform.OS === "web" ? insets.bottom + 32 : insets.bottom + 16) + 90;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={headerTitle} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover image placeholder */}
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <Pressable
              style={({ pressed }) => [
                styles.coverWrap,
                { opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <LinearGradient
                colors={
                  CATEGORIES.find((c) => c.key === category)?.gradient ?? [
                    brand.purple,
                    brand.blue,
                  ]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.coverGradient}
              >
                <Feather
                  name={
                    CATEGORIES.find((c) => c.key === category)?.iconName ??
                    "image"
                  }
                  size={42}
                  color="#FFFFFFCC"
                />
                <View style={styles.coverPill}>
                  <Feather name="image" size={14} color="#fff" />
                  <Text style={styles.coverPillText}>
                    {t("coverImageHint")}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Title */}
          <Field label={t("serviceTitle")} required>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("serviceTitlePh")}
              placeholderTextColor={colors.subtle}
              style={[styles.input, inputStyle]}
              maxLength={120}
            />
          </Field>

          {/* Category picker */}
          <Field label={t("category")} required>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
              inverted={isRtl}
            >
              {CATEGORIES.map((c) => {
                const active = c.key === category;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setCategory(c.key as ServiceCategory)}
                    style={({ pressed }) => [
                      styles.catChip,
                      {
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    {active ? (
                      <LinearGradient
                        colors={c.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.catChipInner}
                      >
                        <Feather name={c.iconName} size={14} color="#fff" />
                        <Text style={[styles.catChipText, { color: "#fff" }]}>
                          {t(c.labelKey)}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View
                        style={[
                          styles.catChipInner,
                          {
                            backgroundColor: colors.card,
                            borderWidth: 1,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Feather
                          name={c.iconName}
                          size={14}
                          color={colors.foreground}
                        />
                        <Text
                          style={[
                            styles.catChipText,
                            { color: colors.foreground },
                          ]}
                        >
                          {t(c.labelKey)}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Field>

          {/* Description */}
          <Field label={t("description")} required>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("descriptionPh")}
              placeholderTextColor={colors.subtle}
              multiline
              numberOfLines={5}
              style={[
                styles.input,
                inputStyle,
                {
                  height: 120,
                  paddingTop: 14,
                  textAlignVertical: "top",
                },
              ]}
              maxLength={600}
            />
          </Field>

          {/* Packages */}
          <SectionTitle>{t("packages")}</SectionTitle>
          <View style={{ paddingHorizontal: 20, gap: 14 }}>
            {packages.map((pkg, idx) => (
              <PackageEditor
                key={pkg.tier}
                pkg={pkg}
                onChange={(patch) => updatePackage(idx, patch)}
              />
            ))}
          </View>

          {/* Add-ons */}
          <SectionTitle>{t("addOns")}</SectionTitle>
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {addOns.map((ao) => (
              <AddOnEditor
                key={ao.id}
                addOn={ao}
                onChange={(patch) => updateAddon(ao.id, patch)}
                onRemove={() => removeAddon(ao.id)}
              />
            ))}
            <Pressable
              onPress={addAddon}
              style={({ pressed }) => [
                styles.addAddonBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  opacity: pressed ? 0.92 : 1,
                  flexDirection: isRtl ? "row-reverse" : "row",
                },
              ]}
            >
              <Feather name="plus" size={16} color={colors.primary} />
              <Text style={[styles.addAddonText, { color: colors.primary }]}>
                {t("addAddon")}
              </Text>
            </Pressable>
          </View>

          {/* Status toggle */}
          <SectionTitle>{t("status")}</SectionTitle>
          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={[
                styles.statusCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  flexDirection: isRtl ? "row-reverse" : "row",
                },
              ]}
            >
              <View
                style={[
                  styles.statusIcon,
                  {
                    backgroundColor: published
                      ? brand.mint + "26"
                      : colors.surface,
                  },
                ]}
              >
                <Feather
                  name={published ? "globe" : "edit-3"}
                  size={18}
                  color={published ? brand.mint : colors.mutedForeground}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.statusTitle,
                    {
                      color: colors.foreground,
                      textAlign: isRtl ? "right" : "left",
                    },
                  ]}
                >
                  {published ? t("publish") : t("draft")}
                </Text>
                <Text
                  style={[
                    styles.statusHint,
                    {
                      color: colors.mutedForeground,
                      textAlign: isRtl ? "right" : "left",
                    },
                  ]}
                >
                  {published ? t("publishedHint") : t("draftHint")}
                </Text>
              </View>
              <Switch
                value={published}
                onValueChange={setPublished}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                trackColor={{
                  false: colors.border,
                  true: colors.primary,
                }}
              />
            </View>
          </View>

          {/* Delete (edit mode only) */}
          {existing ? (
            <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  {
                    backgroundColor: colors.destructive + "12",
                    opacity: pressed ? 0.9 : 1,
                    flexDirection: isRtl ? "row-reverse" : "row",
                  },
                ]}
              >
                <Feather
                  name="trash-2"
                  size={16}
                  color={colors.destructive}
                />
                <Text
                  style={[styles.deleteText, { color: colors.destructive }]}
                >
                  {t("deleteService")}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        {/* Sticky save bar */}
        <View
          style={[
            styles.saveBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.divider,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <BrandButton
            title={published ? t("publishService") : t("saveService")}
            onPress={handleSave}
            loading={saving}
            iconLeft={
              <Feather
                name={published ? "send" : "save"}
                size={16}
                color="#fff"
              />
            }
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const { isRtl } = useApp();
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
      <Text
        style={[
          styles.label,
          {
            color: colors.foreground,
            textAlign: isRtl ? "right" : "left",
          },
        ]}
      >
        {label}
        {required ? (
          <Text style={{ color: colors.destructive }}> *</Text>
        ) : null}
      </Text>
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { isRtl } = useApp();
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 26, marginBottom: 12 }}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: colors.foreground,
            textAlign: isRtl ? "right" : "left",
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const TIER_GRADIENT: Record<DraftPackage["tier"], [string, string]> = {
  basic: [brand.blue, brand.mint],
  standard: [brand.purple, brand.blue],
  premium: [brand.pink, brand.purple],
};

function PackageEditor({
  pkg,
  onChange,
}: {
  pkg: DraftPackage;
  onChange: (patch: Partial<DraftPackage>) => void;
}) {
  const colors = useColors();
  const { t, isRtl } = useApp();
  const tierLabel = t(pkg.tier);

  const inputStyle = {
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    color: colors.foreground,
    textAlign: (isRtl ? "right" : "left") as "right" | "left",
  };

  return (
    <View
      style={[
        styles.pkgCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.pkgHeader,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        <LinearGradient
          colors={TIER_GRADIENT[pkg.tier]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pkgBadge}
        >
          <Text style={styles.pkgBadgeText}>{tierLabel}</Text>
        </LinearGradient>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
          {t("packageName")}
        </Text>
        <TextInput
          value={pkg.name}
          onChangeText={(v) => onChange({ name: v })}
          placeholder={t("packageNamePh")}
          placeholderTextColor={colors.subtle}
          style={[styles.input, inputStyle, { marginTop: 6 }]}
        />
      </View>

      <View
        style={[
          styles.pkgRow,
          { flexDirection: isRtl ? "row-reverse" : "row", marginTop: 10 },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
            {t("price")} ({t("sar")})
          </Text>
          <TextInput
            value={pkg.price}
            onChangeText={(v) => onChange({ price: v.replace(/[^0-9]/g, "") })}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.subtle}
            style={[styles.input, inputStyle, { marginTop: 6 }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
            {t("deliveryTime")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
            <TextInput
              value={pkg.deliveryDays}
              onChangeText={(v) =>
                onChange({ deliveryDays: v.replace(/[^0-9]/g, "") })
              }
              keyboardType="number-pad"
              placeholder="3"
              placeholderTextColor={colors.subtle}
              style={[styles.input, inputStyle, { flex: 1 }]}
            />
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }}>
              {t("days")}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
          {t("revisionsLabel")}
        </Text>
        <TextInput
          value={pkg.revisions}
          onChangeText={(v) =>
            onChange({ revisions: v.replace(/[^0-9]/g, "") })
          }
          keyboardType="number-pad"
          placeholder="2"
          placeholderTextColor={colors.subtle}
          style={[styles.input, inputStyle, { marginTop: 6 }]}
        />
      </View>

      <View style={{ marginTop: 10 }}>
        <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
          {t("whatsIncluded")}
        </Text>
        <TextInput
          value={pkg.features}
          onChangeText={(v) => onChange({ features: v })}
          placeholder={t("featuresPh")}
          placeholderTextColor={colors.subtle}
          multiline
          style={[
            styles.input,
            inputStyle,
            {
              marginTop: 6,
              height: 100,
              paddingTop: 12,
              textAlignVertical: "top",
            },
          ]}
        />
      </View>
    </View>
  );
}

function AddOnEditor({
  addOn,
  onChange,
  onRemove,
}: {
  addOn: ServiceAddOn;
  onChange: (patch: Partial<ServiceAddOn>) => void;
  onRemove: () => void;
}) {
  const colors = useColors();
  const { t, isRtl } = useApp();

  const inputStyle = {
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    color: colors.foreground,
    textAlign: (isRtl ? "right" : "left") as "right" | "left",
  };

  return (
    <View
      style={[
        styles.addonCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.addonHead,
          { flexDirection: isRtl ? "row-reverse" : "row" },
        ]}
      >
        <Text style={[styles.subLabel, { color: colors.mutedForeground, flex: 1 }]}>
          {t("addOnTitle")}
        </Text>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Feather name="x" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <TextInput
        value={addOn.title}
        onChangeText={(v) => onChange({ title: v })}
        placeholder={t("addOnTitlePh")}
        placeholderTextColor={colors.subtle}
        style={[styles.input, inputStyle, { marginTop: 6 }]}
      />
      <View
        style={[
          styles.pkgRow,
          { flexDirection: isRtl ? "row-reverse" : "row", marginTop: 10 },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
            {t("price")} ({t("sar")})
          </Text>
          <TextInput
            value={addOn.price ? String(addOn.price) : ""}
            onChangeText={(v) =>
              onChange({ price: parseInt(v.replace(/[^0-9]/g, "") || "0", 10) })
            }
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.subtle}
            style={[styles.input, inputStyle, { marginTop: 6 }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
            {t("deliveryTime")}
          </Text>
          <TextInput
            value={addOn.deliveryDays ? String(addOn.deliveryDays) : ""}
            onChangeText={(v) =>
              onChange({
                deliveryDays: parseInt(v.replace(/[^0-9]/g, "") || "1", 10),
              })
            }
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={colors.subtle}
            style={[styles.input, inputStyle, { marginTop: 6 }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  coverWrap: {
    borderRadius: 20,
    overflow: "hidden",
    height: 170,
  },
  coverGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  coverPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#00000066",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  coverPillText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  subLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  catChip: { marginRight: 8 },
  catChipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  catChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  pkgCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  pkgHeader: { alignItems: "center" },
  pkgBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pkgBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pkgRow: { gap: 10 },
  addonCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  addonHead: { alignItems: "center" },
  addAddonBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addAddonText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statusCard: {
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statusHint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  deleteBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  deleteText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
