/**
 * Single Supabase client for the whole Khidma app.
 *
 * - Returns `null` (and logs once) when env keys are missing, so the app keeps
 *   booting in mock-fallback mode.
 * - Uses AsyncStorage as the auth-storage adapter (works on iOS, Android, web).
 * - Imports the URL polyfill so React Native Hermes can parse Supabase URLs.
 */
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  getMissingEnvKeys,
  isSupabaseConfigured,
} from "./config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any; // No generated DB types yet; loosened on purpose so query
// builders accept arbitrary inserts/updates without `as any` casts.

let _client: SupabaseClient<Db> | null | undefined;
let _warned = false;

export function getSupabase(): SupabaseClient<Db> | null {
  if (_client !== undefined) return _client;

  if (!isSupabaseConfigured()) {
    if (!_warned) {
      _warned = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[Khidma] Supabase env missing:",
        getMissingEnvKeys().join(", "),
        "— running in mock fallback mode.",
      );
    }
    _client = null;
    return _client;
  }

  _client = createClient<Db>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });
  return _client;
}

/** Throws a friendly error when Supabase is needed but not configured. */
export function requireSupabase(): SupabaseClient<Db> {
  const client = getSupabase();
  if (!client) {
    const err: Error & { code?: string } = new Error(
      "Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in Replit Secrets.",
    );
    err.code = "SUPABASE_NOT_CONFIGURED";
    throw err;
  }
  return client;
}
