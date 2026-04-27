import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const useBackend = isSupabaseConfigured();

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
    () => ({ user, ready, login, signup, setRole, logout, guestMode, updateUser }),
    [user, ready, login, signup, setRole, logout, guestMode, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
