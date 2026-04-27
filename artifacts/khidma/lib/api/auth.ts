import type { Session } from "@supabase/supabase-js";

import type { Role, User } from "@/lib/types";

import { requireSupabase } from "@/lib/supabase/client";
import { AppError, toAppError } from "@/lib/supabase/errors";

import { profileToUser, type DbProfile } from "./mappers";

async function fetchProfile(userId: string): Promise<User> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw toAppError(error);
  return profileToUser(data as DbProfile);
}

/**
 * Create an account via Supabase Auth and return the freshly-created profile.
 * The `handle_new_user` trigger inserts the profile row; we upsert again here
 * so role/full_name are guaranteed to match the form even on retries.
 */
export async function signUp(args: {
  fullName: string;
  email: string;
  password: string;
  role: Role;
}): Promise<User> {
  const sb = requireSupabase();
  try {
    const { data, error } = await sb.auth.signUp({
      email: args.email.trim(),
      password: args.password,
      options: { data: { full_name: args.fullName, role: args.role } },
    });
    if (error) throw error;
    if (!data.user) throw new AppError("UNKNOWN", "Signup returned no user");

    await sb
      .from("profiles")
      .upsert(
        {
          id: data.user.id,
          full_name: args.fullName,
          email: args.email.trim(),
          role: args.role,
        },
        { onConflict: "id" },
      );

    return fetchProfile(data.user.id);
  } catch (err) {
    throw toAppError(err);
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  const sb = requireSupabase();
  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    if (!data.session || !data.user)
      throw new AppError("AUTH_INVALID_CREDENTIALS", "No session returned");
    return fetchProfile(data.user.id);
  } catch (err) {
    throw toAppError(err);
  }
}

export async function signOut(): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.auth.signOut();
  if (error) throw toAppError(error);
}

export async function getSession(): Promise<Session | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.getSession();
  if (error) throw toAppError(error);
  return data.session;
}

/** Returns the current profile or null if no session. Never throws on missing auth. */
export async function getCurrentProfile(): Promise<User | null> {
  const sb = requireSupabase();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  try {
    return await fetchProfile(data.user.id);
  } catch {
    return null;
  }
}

/**
 * Subscribe to auth events and emit the corresponding User profile (or null
 * on sign-out). Returns an unsubscribe function.
 */
export function onAuthStateChange(cb: (user: User | null) => void): () => void {
  const sb = requireSupabase();
  const { data } = sb.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      cb(null);
      return;
    }
    try {
      cb(await fetchProfile(session.user.id));
    } catch {
      cb(null);
    }
  });
  return () => data.subscription.unsubscribe();
}
