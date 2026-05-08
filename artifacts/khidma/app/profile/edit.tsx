import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { Avatar } from "@/components/ui/Avatar";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { profilesApi } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const BIO_MAX = 300;

function fromCsv(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function toCsv(arr?: string[]): string {
  return Array.isArray(arr) ? arr.join(", ") : "";
}

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRtl } = useApp();
  const { user, updateUser, refreshUser } = useAuth();
  const remoteEnabled =
    isSupabaseConfigured() && !!user && user.email !== "guest@khidma.app";
  const isFreelancer = user?.role === "freelancer";

  const [avatarUri, setAvatarUri] = useState<string | undefined>(user?.avatar);
  const [bio, setBio] = useState(user?.bio ?? "");
  const [tags, setTags] = useState(toCsv(user?.tags));
  const [keywords, setKeywords] = useState(toCsv(user?.keywords));
  const [skills, setSkills] = useState(toCsv(user?.skills));
  const [years, setYears] = useState(
    user?.yearsOfExperience !== undefined
      ? String(user.yearsOfExperience)
      : "",
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(
    () => !saving && !uploading && bio.length <= BIO_MAX,
    [saving, uploading, bio.length],
  );

  const onPickPhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];

      // Mock / guest mode: just preview locally; real upload requires backend.
      if (!remoteEnabled || !user) {
        setAvatarUri(asset.uri);
        return;
      }

      setUploading(true);
      const url = await profilesApi.uploadAvatar(user.id, {
        uri: asset.uri,
        name: asset.fileName ?? `avatar.${asset.uri.split(".").pop() || "jpg"}`,
        type: asset.mimeType ?? undefined,
      });
      setAvatarUri(url);
      await updateUser({ avatar: url });
    } catch (e: unknown) {
      Alert.alert(t("photoPickError"), (e as Error)?.message ?? "");
    } finally {
      setUploading(false);
    }
  }, [remoteEnabled, user, updateUser, t]);

  const onSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    const yearsNum = years.trim() === "" ? undefined : Number(years);
    const tagsArr = fromCsv(tags);
    const keywordsArr = fromCsv(keywords);
    const skillsArr = fromCsv(skills);

    try {
      if (remoteEnabled) {
        // Persist remotely first; refreshUser() then syncs the server
        // truth into AuthContext (single write path, no optimistic drift).
        await profilesApi.updateProfile(user.id, {
          bio: bio.trim(),
          tags: tagsArr,
          keywords: keywordsArr,
          ...(isFreelancer
            ? {
                skills: skillsArr,
                years_of_experience:
                  Number.isFinite(yearsNum) && yearsNum !== undefined
                    ? yearsNum
                    : null,
              }
            : {}),
        });
        await refreshUser();
      } else {
        // Mock / guest mode — only place updates can land is the local cache.
        await updateUser({
          bio: bio.trim() || undefined,
          avatar: avatarUri,
          tags: tagsArr.length ? tagsArr : undefined,
          keywords: keywordsArr.length ? keywordsArr : undefined,
          skills: isFreelancer && skillsArr.length ? skillsArr : undefined,
          yearsOfExperience:
            isFreelancer && Number.isFinite(yearsNum) && yearsNum !== undefined
              ? yearsNum
              : undefined,
        });
      }

      Alert.alert(t("profileSaved"));
      router.back();
    } catch (e: unknown) {
      Alert.alert(t("profileSaveError"), (e as Error)?.message ?? "");
    } finally {
      setSaving(false);
    }
  }, [
    user,
    years,
    tags,
    keywords,
    skills,
    bio,
    avatarUri,
    isFreelancer,
    remoteEnabled,
    updateUser,
    refreshUser,
    t,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t("editProfile")} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 32 + insets.bottom,
            gap: 18,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={{ alignItems: "center", gap: 10 }}>
            <Pressable
              onPress={onPickPhoto}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={[
                    styles.avatar,
                    { borderColor: colors.border },
                  ]}
                />
              ) : (
                <Avatar name={user?.name ?? "U"} size={92} />
              )}
              <View
                style={[
                  styles.cameraBadge,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.background,
                  },
                ]}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Feather name="camera" size={14} color="#fff" />
                )}
              </View>
            </Pressable>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {t("profilePhoto")}
            </Text>
          </View>

          {/* Bio */}
          <Field
            label={t("bio")}
            hint={t("bioHint")}
            isRtl={isRtl}
            colors={colors}
          >
            <TextInput
              value={bio}
              onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
              multiline
              placeholder={t("bio")}
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
            <Text
              style={[
                styles.counter,
                {
                  color: colors.subtle,
                  textAlign: isRtl ? "left" : "right",
                },
              ]}
            >
              {bio.length}/{BIO_MAX}
            </Text>
          </Field>

          {/* Tags */}
          <Field
            label={t("tags")}
            hint={t("tagsHint")}
            isRtl={isRtl}
            colors={colors}
          >
            <TextInput
              value={tags}
              onChangeText={setTags}
              placeholder="تصميم, Shopify, تسويق"
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
          </Field>

          {/* Keywords */}
          <Field
            label={t("keywords")}
            hint={t("keywordsHint")}
            isRtl={isRtl}
            colors={colors}
          >
            <TextInput
              value={keywords}
              onChangeText={setKeywords}
              placeholder="ecommerce, dropshipping, sales"
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
          </Field>

          {/* Freelancer-only */}
          {isFreelancer ? (
            <>
              <Field
                label={t("skills")}
                hint={t("tagsHint")}
                isRtl={isRtl}
                colors={colors}
              >
                <TextInput
                  value={skills}
                  onChangeText={setSkills}
                  placeholder="React, Figma, SEO"
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
              </Field>
              <Field
                label={t("yearsOfExperience")}
                isRtl={isRtl}
                colors={colors}
              >
                <TextInput
                  value={years}
                  onChangeText={(v) => setYears(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="3"
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
              </Field>
            </>
          ) : null}

          {/* Save */}
          <Pressable
            onPress={onSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: canSave ? colors.primary : colors.surface,
                opacity: pressed && canSave ? 0.9 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[
                  styles.saveBtnText,
                  { color: canSave ? "#fff" : colors.mutedForeground },
                ]}
              >
                {t("save")}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label,
  hint,
  isRtl,
  colors,
  children,
}: {
  label: string;
  hint?: string;
  isRtl: boolean;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={[
          styles.fieldLabel,
          { color: colors.foreground, textAlign: isRtl ? "right" : "left" },
        ]}
      >
        {label}
      </Text>
      {children}
      {hint ? (
        <Text
          style={[
            styles.hint,
            { color: colors.mutedForeground, textAlign: isRtl ? "right" : "left" },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
  },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  textarea: { minHeight: 100 },
  counter: { fontSize: 11, fontFamily: "Inter_500Medium" },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
