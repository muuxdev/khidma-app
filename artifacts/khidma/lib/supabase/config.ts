/**
 * Centralised Supabase env detection.
 *
 * Expo exposes env vars to the client bundle only when prefixed with EXPO_PUBLIC_.
 * The app reads them lazily so missing keys never crash the JS bundle — every
 * call site is expected to check `isSupabaseConfigured()` first.
 */

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY);
}

export function getMissingEnvKeys(): string[] {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  return missing;
}
