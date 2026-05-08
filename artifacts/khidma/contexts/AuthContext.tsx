import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { authApi, profilesApi } from "@/lib/api";
import {
  clearUserScopedData,
  genId,
  getJson,
  removeKey,
  setJson,
  StorageKeys,
} from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Role, User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (
    name: string,
    email: string,
    password: string,
    role: Role,
  ) => Promise<User>;
  setRole: (role: Role) => Promise<void>;
  logout: () => Promise<void>;
  guestMode: (role: Role) => Promise<User>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  /** Re-fetch the signed-in user's profile from the backend so trigger-derived
   *  fields (rating, review_count) reflect their latest values. No-op for
   *  guests / mock mode. */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const useBackend = isSupabaseConfigured();

  // Mirror current user into a ref so callbacks (notably refreshUser) stay
  // referentially stable across re-renders — otherwise consumers like
  // DataContext that depend on `refreshUser` would re-run their effects
  // every time we persist().
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const persist = useCallback(async (next: User | null) => {
    setUser(next);
    if (next) await setJson(StorageKeys.USER, next);
    else await removeKey(StorageKeys.USER);
  }, []);

  // Bootstrap: in backend mode, hydrate from session; in mock mode, from storage.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        if (useBackend) {
          const profile = await authApi.getCurrentProfile();
          if (profile) await persist(profile);
          unsub = authApi.onAuthStateChange(async (next) => {
            await persist(next);
          });
        } else {
          const stored = await getJson<User>(StorageKeys.USER);
          if (stored) setUser(stored);
        }
      } catch {
        // Ignore — we'll show whatever we have.
      } finally {
        setReady(true);
      }
    })();
    return () => unsub?.();
  }, [useBackend, persist]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (useBackend) {
        const next = await authApi.signIn(email, password);
        await persist(next);
        return next;
      }
      const existing = await getJson<User>(StorageKeys.USER);
      const next: User =
        existing && existing.email === email
          ? existing
          : {
              id: genId(),
              name: email.split("@")[0] || "User",
              email,
              role: "client",
              joinedAt: Date.now(),
              walletBalance: 0,
              completedJobs: 0,
              rating: 0,
            };
      await persist(next);
      return next;
    },
    [persist, useBackend],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string, role: Role) => {
      if (useBackend) {
        const next = await authApi.signUp({
          fullName: name,
          email,
          password,
          role,
        });
        await persist(next);
        return next;
      }
      const next: User = {
        id: genId(),
        name,
        email,
        role,
        joinedAt: Date.now(),
        walletBalance: role === "freelancer" ? 4280 : 0,
        completedJobs: role === "freelancer" ? 12 : 0,
        rating: role === "freelancer" ? 4.9 : 0,
      };
      await persist(next);
      return next;
    },
    [persist, useBackend],
  );

  const setRole = useCallback(
    async (role: Role) => {
      if (!user) return;
      if (useBackend) {
        const updated = await profilesApi.updateProfile(user.id, { role });
        await persist({ ...user, ...updated });
        return;
      }
      await persist({ ...user, role });
    },
    [user, persist, useBackend],
  );

  const guestMode = useCallback(
    async (role: Role) => {
      // Guest mode is always local — no backend account is created.
      const next: User = {
        id: genId(),
        name: role === "freelancer" ? "Guest Pro" : "Guest",
        email: "guest@khidma.app",
        role,
        joinedAt: Date.now(),
        walletBalance: role === "freelancer" ? 4280 : 0,
        completedJobs: role === "freelancer" ? 12 : 0,
        rating: role === "freelancer" ? 4.9 : 0,
      };
      await persist(next);
      return next;
    },
    [persist],
  );

  const updateUser = useCallback(
    async (patch: Partial<User>) => {
      if (!user) return;
      if (useBackend && user.email !== "guest@khidma.app") {
        const dbPatch: Parameters<typeof profilesApi.updateProfile>[1] = {};
        if (patch.name !== undefined) dbPatch.full_name = patch.name;
        if (patch.avatar !== undefined && patch.avatar !== null)
          dbPatch.avatar_url = patch.avatar;
        if (patch.role !== undefined) dbPatch.role = patch.role;
        if (Object.keys(dbPatch).length) {
          const updated = await profilesApi.updateProfile(user.id, dbPatch);
          await persist({ ...user, ...patch, ...updated });
          return;
        }
      }
      await persist({ ...user, ...patch });
    },
    [user, persist, useBackend],
  );

  // ---------------------------------------------------------------------------
  // Presence heartbeat: bump profiles.last_seen on app foreground + every 60s
  // while the app is active. Anything older than 5 minutes is rendered as
  // offline by the chat list / chat header.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!useBackend) return;
    if (!user || user.email === "guest@khidma.app") return;
    const userId = user.id;
    let cancelled = false;
    const ping = () => {
      if (cancelled) return;
      void profilesApi.heartbeat(userId);
    };
    ping();
    const interval = setInterval(ping, 60_000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") ping();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
    };
  }, [useBackend, user]);

  // Stable across renders (no `user` in deps); reads from the ref instead.
  // Also short-circuits when the trigger-derived fields haven't changed so
  // we don't churn state and re-trigger downstream hydration effects.
  const refreshUser = useCallback(async () => {
    if (!useBackend) return;
    const current = userRef.current;
    if (!current || current.email === "guest@khidma.app") return;
    try {
      const fresh = await profilesApi.getProfile(current.id);
      if (!fresh) return;
      const sameArr = (a?: string[], b?: string[]) =>
        (a?.length ?? 0) === (b?.length ?? 0) &&
        (a ?? []).every((v, i) => v === (b ?? [])[i]);
      const same =
        current.name === fresh.name &&
        current.avatar === fresh.avatar &&
        current.bio === fresh.bio &&
        current.rating === fresh.rating &&
        current.reviewCount === fresh.reviewCount &&
        current.yearsOfExperience === fresh.yearsOfExperience &&
        sameArr(current.tags, fresh.tags) &&
        sameArr(current.keywords, fresh.keywords) &&
        sameArr(current.skills, fresh.skills);
      if (same) return;
      await persist({
        ...current,
        name: fresh.name,
        avatar: fresh.avatar,
        bio: fresh.bio,
        rating: fresh.rating,
        reviewCount: fresh.reviewCount,
        tags: fresh.tags,
        keywords: fresh.keywords,
        skills: fresh.skills,
        yearsOfExperience: fresh.yearsOfExperience,
      });
    } catch {
      // Best-effort.
    }
  }, [persist, useBackend]);

  const logout = useCallback(async () => {
    if (useBackend) {
      try {
        await authApi.signOut();
      } catch {
        // Even if remote sign-out fails, drop the local session.
      }
    }
    // Wipe every per-user AsyncStorage key BEFORE clearing the user, so the
    // next account never sees stale orders / chats / messages / wallet.
    await clearUserScopedData();
    await persist(null);
  }, [persist, useBackend]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, login, signup, setRole, logout, guestMode, updateUser, refreshUser }),
    [user, ready, login, signup, setRole, logout, guestMode, updateUser, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
