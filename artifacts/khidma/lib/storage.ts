import AsyncStorage from "@react-native-async-storage/async-storage";

export const StorageKeys = {
  USER: "khidma:user",
  LOCALE: "khidma:locale",
  THEME: "khidma:theme",
  ORDERS: "khidma:orders",
  CHATS: "khidma:chats",
  MESSAGES: "khidma:messages",
  WALLET: "khidma:wallet",
  SERVICES: "khidma:services",
  REVIEWS: "khidma:reviews",
} as const;

// Keys that hold data tied to the currently signed-in user.
// They MUST be cleared on logout so the next account starts clean.
export const UserScopedKeys: readonly string[] = [
  StorageKeys.USER,
  StorageKeys.ORDERS,
  StorageKeys.CHATS,
  StorageKeys.MESSAGES,
  StorageKeys.WALLET,
  StorageKeys.SERVICES,
  StorageKeys.REVIEWS,
];

export async function clearUserScopedData(): Promise<void> {
  await Promise.all(UserScopedKeys.map((k) => removeKey(k)));
}

export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
