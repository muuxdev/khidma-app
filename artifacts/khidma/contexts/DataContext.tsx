import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import {
  chatApi,
  ordersApi,
  servicesApi,
  walletApi,
} from "@/lib/api";
import {
  mockChats,
  mockMessages,
  mockOrders,
  mockServices,
  mockTransactions,
} from "@/lib/mockData";
import {
  clearUserScopedData,
  genId,
  getJson,
  setJson,
  StorageKeys,
} from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  ChatThread,
  Message,
  Order,
  OrderStatus,
  Service,
  Transaction,
} from "@/lib/types";

type DataContextValue = {
  services: Service[];
  orders: Order[];
  chats: ChatThread[];
  messagesByThread: Record<string, Message[]>;
  transactions: Transaction[];
  walletBalance: number;
  createOrder: (
    service: Service,
    tier: "basic" | "standard" | "premium",
    clientName: string,
    clientId: string,
  ) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  sendMessage: (threadId: string, text: string, senderId: string) => void;
  withdraw: (amount: number) => Promise<void>;
  ensureThread: (
    participantId: string,
    participantName: string,
  ) => Promise<ChatThread>;
  loadMessages: (threadId: string) => Promise<void>;
  markThreadRead: (threadId: string) => Promise<void>;
  upsertService: (service: Service) => Promise<Service>;
  deleteService: (id: string) => Promise<void>;
  setServiceStatus: (id: string, status: "published" | "draft") => Promise<void>;
  getServiceById: (id: string) => Service | undefined;
};

const DataContext = createContext<DataContextValue | null>(null);

const seededSystemServices: Service[] = mockServices.map((s) => ({
  ...s,
  status: "published" as const,
  ownerType: "system" as const,
}));

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const useBackend = isSupabaseConfigured();
  const isGuest = user?.email === "guest@khidma.app";
  const remoteEnabled = useBackend && !!user && !isGuest;

  // In backend mode, NEVER seed UI state with mock data — the previous
  // account's mock chats / messages would otherwise be visible to the
  // freshly-logged-in user. Mock data is only used when there is no Supabase
  // backend at all.
  const initialOrders = useBackend ? [] : mockOrders;
  const initialChats = useBackend ? [] : mockChats;
  const initialMessages = useBackend ? {} : mockMessages;
  const initialTxs = useBackend ? [] : mockTransactions;
  const initialBalance = useBackend ? 0 : 4280;

  // Catalog (visible to everyone, including signed-out / guest)
  const [remoteServices, setRemoteServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [chats, setChats] = useState<ChatThread[]>(initialChats);
  const [messagesByThread, setMessagesByThread] =
    useState<Record<string, Message[]>>(initialMessages);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTxs);
  const [walletBalance, setWalletBalance] = useState<number>(initialBalance);
  const [userServices, setUserServices] = useState<Service[]>([]);

  // Track which user the in-memory state belongs to. When the signed-in user
  // changes (login, switch, or logout), we wipe per-user state immediately
  // before the new user's hydration effect runs. This is the single source of
  // truth for session isolation in the UI.
  const ownerIdRef = useRef<string | null>(null);
  useEffect(() => {
    const nextOwner = user?.id ?? null;
    if (ownerIdRef.current === nextOwner) return;
    ownerIdRef.current = nextOwner;
    setOrders([]);
    setChats([]);
    setMessagesByThread({});
    setTransactions([]);
    setUserServices([]);
    setWalletBalance(0);
    if (!nextOwner) {
      // Logout → also nuke the AsyncStorage mirror so the next account boots
      // from a clean slate even before its remote hydration completes.
      void clearUserScopedData();
    }
  }, [user?.id]);

  // ---------------------------------------------------------------------------
  // Mock-mode hydration: mirror the original AsyncStorage behaviour.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (useBackend) return;
    (async () => {
      const [
        storedOrders,
        storedChats,
        storedMessages,
        storedWallet,
        storedServices,
      ] = await Promise.all([
        getJson<Order[]>(StorageKeys.ORDERS),
        getJson<ChatThread[]>(StorageKeys.CHATS),
        getJson<Record<string, Message[]>>(StorageKeys.MESSAGES),
        getJson<number>(StorageKeys.WALLET),
        getJson<Service[]>(StorageKeys.SERVICES),
      ]);
      if (storedOrders?.length) setOrders(storedOrders);
      if (storedChats?.length) setChats(storedChats);
      if (storedMessages && Object.keys(storedMessages).length)
        setMessagesByThread(storedMessages);
      if (typeof storedWallet === "number") setWalletBalance(storedWallet);
      if (storedServices && Array.isArray(storedServices))
        setUserServices(storedServices);
    })();
  }, [useBackend]);

  useEffect(() => {
    if (useBackend) return;
    setJson(StorageKeys.ORDERS, orders);
  }, [orders, useBackend]);

  useEffect(() => {
    if (useBackend) return;
    setJson(StorageKeys.CHATS, chats);
  }, [chats, useBackend]);

  useEffect(() => {
    if (useBackend) return;
    setJson(StorageKeys.MESSAGES, messagesByThread);
  }, [messagesByThread, useBackend]);

  useEffect(() => {
    if (useBackend) return;
    setJson(StorageKeys.WALLET, walletBalance);
  }, [walletBalance, useBackend]);

  useEffect(() => {
    if (useBackend) return;
    setJson(StorageKeys.SERVICES, userServices);
  }, [userServices, useBackend]);

  // ---------------------------------------------------------------------------
  // Backend-mode hydration: catalog + per-user data.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!useBackend) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await servicesApi.listPublishedServices({ limit: 50 });
        if (!cancelled) setRemoteServices(list);
      } catch {
        if (!cancelled) setRemoteServices([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useBackend]);

  useEffect(() => {
    if (!remoteEnabled || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const [ord, mine, conv, txs, balance] = await Promise.all([
          ordersApi.getMyOrders(user.id),
          servicesApi.listMyServices(user.id),
          chatApi.getConversations(user.id),
          walletApi.getWalletTransactions(user.id),
          walletApi.getComputedBalance(user.id),
        ]);
        if (cancelled) return;
        setOrders(ord);
        setUserServices(mine);
        setChats(conv);
        setTransactions(txs);
        setWalletBalance(balance);
      } catch {
        // Keep whatever we already have so the UI never goes blank.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [remoteEnabled, user]);

  // Realtime: incoming messages append into the right thread.
  useEffect(() => {
    if (!remoteEnabled || !user || chats.length === 0) return;
    const unsubs = chats.map((thread) =>
      chatApi.subscribeToMessages(thread.id, (m) => {
        setMessagesByThread((prev) => {
          const existing = prev[thread.id] ?? [];
          if (existing.some((x) => x.id === m.id)) return prev;
          return { ...prev, [thread.id]: [...existing, m] };
        });
        setChats((prev) =>
          prev.map((c) =>
            c.id === thread.id
              ? {
                  ...c,
                  lastMessage: m.text,
                  lastMessageAt: m.createdAt,
                  unreadCount:
                    m.senderId === user.id ? c.unreadCount : c.unreadCount + 1,
                }
              : c,
          ),
        );
      }),
    );
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [remoteEnabled, user, chats]);

  // Combined services list — user services first, then catalog.
  const services = useMemo<Service[]>(() => {
    if (useBackend) {
      const seen = new Set(userServices.map((s) => s.id));
      return [
        ...userServices,
        ...remoteServices.filter((s) => !seen.has(s.id)),
      ];
    }
    return [...userServices, ...seededSystemServices];
  }, [useBackend, userServices, remoteServices]);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const createOrder = useCallback(
    async (
      service: Service,
      tier: "basic" | "standard" | "premium",
      clientName: string,
      clientId: string,
    ) => {
      if (remoteEnabled) {
        const order = await ordersApi.createOrder({
          clientId,
          service,
          tier,
        });
        setOrders((prev) => [order, ...prev]);
        return order;
      }
      const pkg = service.packages.find((p) => p.tier === tier)!;
      const order: Order = {
        id: "ord-" + genId().slice(0, 6),
        serviceId: service.id,
        serviceTitle: service.title,
        serviceCover: service.cover,
        packageTier: tier,
        price: pkg.price,
        clientId,
        clientName,
        freelancerId: service.freelancerId,
        freelancerName: service.freelancerName,
        status: "pending",
        progress: 5,
        createdAt: Date.now(),
        dueAt: Date.now() + pkg.deliveryDays * 24 * 60 * 60 * 1000,
      };
      setOrders((prev) => [order, ...prev]);
      return order;
    },
    [remoteEnabled],
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      if (remoteEnabled) {
        await ordersApi.updateOrderStatus(orderId, status);
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status,
                progress:
                  status === "completed"
                    ? 100
                    : status === "review"
                    ? 85
                    : status === "in_progress"
                    ? Math.max(o.progress, 50)
                    : status === "cancelled"
                    ? 0
                    : o.progress,
              }
            : o,
        ),
      );
    },
    [remoteEnabled],
  );

  const sendMessage = useCallback(
    (threadId: string, text: string, senderId: string) => {
      if (remoteEnabled) {
        // Backend mode: do NOT optimistically insert a fake row — the
        // realtime subscription returns the canonical message to ALL
        // subscribers (including the sender) within a few hundred ms, and
        // we'd otherwise show duplicates with two different ids.
        chatApi
          .sendMessage(threadId, senderId, text)
          .then((sent) => {
            setMessagesByThread((prev) => {
              const list = prev[threadId] ?? [];
              if (list.some((m) => m.id === sent.id)) return prev;
              return { ...prev, [threadId]: [...list, sent] };
            });
            setChats((prev) =>
              prev.map((c) =>
                c.id === threadId
                  ? {
                      ...c,
                      lastMessage: sent.text,
                      lastMessageAt: sent.createdAt,
                      unreadCount: 0,
                    }
                  : c,
              ),
            );
          })
          .catch(() => {
            // Swallow — chat list will reconcile on the next refresh.
          });
        return;
      }
      const msg: Message = {
        id: "m-" + genId().slice(0, 6),
        threadId,
        senderId,
        text,
        createdAt: Date.now(),
      };
      setMessagesByThread((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), msg],
      }));
      setChats((prev) =>
        prev.map((c) =>
          c.id === threadId
            ? {
                ...c,
                lastMessage: text,
                lastMessageAt: Date.now(),
                unreadCount: 0,
              }
            : c,
        ),
      );
    },
    [remoteEnabled],
  );

  const withdraw = useCallback(async (amount: number) => {
    // Withdraw stays client-only — there is no payout backend by design.
    if (amount <= 0) return;
    setWalletBalance((prev) => Math.max(0, prev - amount));
    setTransactions((prev) => [
      {
        id: "tx-" + genId().slice(0, 6),
        type: "withdrawal",
        amount: -amount,
        description: "Withdrawal to bank ****4521",
        createdAt: Date.now(),
        status: "completed",
      },
      ...prev,
    ]);
  }, []);

  const loadMessages = useCallback(
    async (threadId: string) => {
      if (!remoteEnabled) return;
      try {
        const fresh = await chatApi.getMessagesPaginated(threadId, {
          limit: 100,
        });
        setMessagesByThread((prev) => {
          // Merge with anything that arrived via realtime in the meantime,
          // dedupe by id, sort by createdAt ascending.
          const existing = prev[threadId] ?? [];
          const map = new Map<string, Message>();
          for (const m of fresh) map.set(m.id, m);
          for (const m of existing) if (!map.has(m.id)) map.set(m.id, m);
          const merged = Array.from(map.values()).sort(
            (a, b) => a.createdAt - b.createdAt,
          );
          return { ...prev, [threadId]: merged };
        });
      } catch {
        // Keep whatever we have so the screen never goes blank.
      }
    },
    [remoteEnabled],
  );

  const markThreadRead = useCallback(
    async (threadId: string) => {
      // Always zero the local unread badge so the tab updates instantly.
      setChats((prev) =>
        prev.map((c) =>
          c.id === threadId && c.unreadCount > 0
            ? { ...c, unreadCount: 0 }
            : c,
        ),
      );
      setMessagesByThread((prev) => {
        const list = prev[threadId];
        if (!list?.length) return prev;
        let changed = false;
        const next = list.map((m) => {
          if (!m.isRead && user && m.senderId !== user.id) {
            changed = true;
            return { ...m, isRead: true };
          }
          return m;
        });
        return changed ? { ...prev, [threadId]: next } : prev;
      });
      if (!remoteEnabled || !user) return;
      try {
        await chatApi.markMessagesAsRead(threadId, user.id);
      } catch {
        // Best-effort; the next conversation refresh will reconcile.
      }
    },
    [remoteEnabled, user],
  );

  const ensureThread = useCallback(
    async (participantId: string, participantName: string) => {
      if (remoteEnabled && user) {
        const id = await chatApi.getOrCreateConversationByPartner(
          user.id,
          user.role,
          participantId,
        );
        const existing = chats.find((c) => c.id === id);
        if (existing) return existing;
        const next: ChatThread = {
          id,
          participantId,
          participantName,
          lastMessage: "",
          lastMessageAt: Date.now(),
          unreadCount: 0,
          online: false,
        };
        setChats((prev) => [next, ...prev]);
        return next;
      }
      const existing = chats.find((c) => c.participantId === participantId);
      if (existing) return existing;
      const next: ChatThread = {
        id: "thr-" + genId().slice(0, 6),
        participantId,
        participantName,
        lastMessage: "",
        lastMessageAt: Date.now(),
        unreadCount: 0,
        online: true,
      };
      setChats((prev) => [next, ...prev]);
      return next;
    },
    [chats, remoteEnabled, user],
  );

  const upsertService = useCallback(
    async (service: Service) => {
      if (remoteEnabled && user) {
        const existing = userServices.find((s) => s.id === service.id);
        const saved = existing
          ? await servicesApi.updateService(service.id, user.id, service)
          : await servicesApi.createService(user.id, service);
        setUserServices((prev) => {
          const idx = prev.findIndex((s) => s.id === saved.id);
          if (idx === -1) return [saved, ...prev];
          const next = [...prev];
          next[idx] = saved;
          return next;
        });
        return saved;
      }
      const now = Date.now();
      let saved: Service = { ...service, ownerType: "user", updatedAt: now };
      setUserServices((prev) => {
        const idx = prev.findIndex((s) => s.id === service.id);
        if (idx === -1) {
          saved = { ...saved, createdAt: now };
          return [saved, ...prev];
        }
        const next = [...prev];
        next[idx] = { ...prev[idx], ...saved };
        saved = next[idx];
        return next;
      });
      return saved;
    },
    [remoteEnabled, user, userServices],
  );

  const deleteService = useCallback(
    async (id: string) => {
      if (remoteEnabled && user) {
        await servicesApi.softDeleteService(id, user.id);
      }
      setUserServices((prev) => prev.filter((s) => s.id !== id));
    },
    [remoteEnabled, user],
  );

  const setServiceStatus = useCallback(
    async (id: string, status: "published" | "draft") => {
      if (remoteEnabled && user) {
        await servicesApi.setServiceStatus(id, user.id, status);
      }
      setUserServices((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status, updatedAt: Date.now() } : s,
        ),
      );
    },
    [remoteEnabled, user],
  );

  const getServiceById = useCallback(
    (id: string) => services.find((s) => s.id === id),
    [services],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      services,
      orders,
      chats,
      messagesByThread,
      transactions,
      walletBalance,
      createOrder,
      updateOrderStatus,
      sendMessage,
      withdraw,
      ensureThread,
      loadMessages,
      markThreadRead,
      upsertService,
      deleteService,
      setServiceStatus,
      getServiceById,
    }),
    [
      services,
      orders,
      chats,
      messagesByThread,
      transactions,
      walletBalance,
      createOrder,
      updateOrderStatus,
      sendMessage,
      withdraw,
      ensureThread,
      loadMessages,
      markThreadRead,
      upsertService,
      deleteService,
      setServiceStatus,
      getServiceById,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
