import type { Role, User } from "@/lib/types";

import { requireSupabase } from "@/lib/supabase/client";
import { toAppError } from "@/lib/supabase/errors";

import { profileToUser, type DbProfile } from "./mappers";

export async function getProfile(userId: string): Promise<User | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data ? profileToUser(data as DbProfile) : null;
}

export async function updateProfile(
  userId: string,
  patch: Partial<{
    full_name: string;
    avatar_url: string;
    bio: string;
    skills: string[];
    tags: string[];
    keywords: string[];
    years_of_experience: number | null;
    role: Role;
  }>,
): Promise<User> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw toAppError(error);
  return profileToUser(data as DbProfile);
}

/** Bump the signed-in user's last_seen so others can render an online dot.
 *  Best-effort: errors are swallowed (the heartbeat re-runs every minute). */
export async function heartbeat(userId: string): Promise<void> {
  const sb = requireSupabase();
  try {
    await sb
      .from("profiles")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", userId);
  } catch {
    // intentional: heartbeat is fire-and-forget
  }
}

export async function uploadAvatar(
  userId: string,
  file: { uri: string; name: string; type?: string; size?: number },
): Promise<string> {
  const sb = requireSupabase();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().split("?")[0];
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  // React Native quirk: passing a `Blob` from `fetch(localUri).blob()` to
  // supabase-js results in a 0-byte upload because the blob's underlying
  // bytes aren't accessible to the request body serializer. Reading the
  // file as an ArrayBuffer and uploading that yields the real bytes on
  // every platform (web, iOS, Android).
  const res = await fetch(file.uri);
  const arrayBuffer = await res.arrayBuffer();
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error("Selected image is empty (0 bytes).");
  }

  const contentType =
    file.type ??
    (ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "gif"
          ? "image/gif"
          : "image/jpeg");

  const { error } = await sb.storage
    .from("avatars")
    .upload(path, arrayBuffer, { contentType, upsert: true });
  if (error) throw toAppError(error);
  const { data } = sb.storage.from("avatars").getPublicUrl(path);
  await updateProfile(userId, { avatar_url: data.publicUrl });
  return data.publicUrl;
}
