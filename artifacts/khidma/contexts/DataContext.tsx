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
  reviewsApi,
  servicesApi,
  walletApi,
} from "@/lib/api";
import type { Review } from "@/lib/api/reviews";
import { orderProgressFor } from "@/lib/api/mappers";
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
  payDeposit: (orderId: string) => Promise<void>;
  markInfoReceived: (orderId: string) => Promise<void>;
  payFinal: (orderId: string) => Promise<void>;
  startWork: (orderId: string) => Promise<void>;
  markDelivered: (orderId: string) => Promise<void>;
  confirmDelivery: (orderId: string) => Promise<void>;
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
  /** Order ids the current user has already reviewed — used to hide the
   *  "Leave a review" CTA after submission. */
  reviewedOrderIds: Set<string>;
  submitReview: (input: {
    orderId: string;
    revieweeId: string;
    rating: number;
    comment?: string;
  }) => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

const seededSystemServices: Service[] = mockServices.map((s) => ({
  ...s,
  status: "published" as const,
  ownerType: "system" as const,
}));

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();
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
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const reviewedOrderIds = useMemo(
    () => new Set(myReviews.map((r) => r.orderId)),
    [myReviews],
  );

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
    setMyReviews([]);
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
        storedReviews,
      ] = await Promise.all([
        getJson<Order[]>(StorageKeys.ORDERS),
        getJson<ChatThread[]>(StorageKeys.CHATS),
        getJson<Record<string, Message[]>>(StorageKeys.MESSAGES),
        getJson<number>(StorageKeys.WALLET),
        getJson<Service[]>(StorageKeys.SERVICES),
        getJson<Review[]>(StorageKeys.REVIEWS),
      ]);
      if (storedOrders?.length) setOrders(storedOrders);
      if (storedChats?.length) setChats(storedChats);
      if (storedMessages && Object.keys(storedMessages).length)
        setMessagesByThread(storedMessages);
      if (typeof storedWallet === "number") setWalletBalance(storedWallet);
      if (storedServices && Array.isArray(storedServices))
        setUserServices(storedServices);
      if (storedReviews && Array.isArray(storedReviews))
        setMyReviews(storedReviews);
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

  useEffect(() => {
    if (useBackend) return;
    setJson(StorageKeys.REVIEWS, myReviews);
  }, [myReviews, useBackend]);

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
        const [ord, mine, conv, txs, balance, revs] = await Promise.all([
          ordersApi.getMyOrders(user.id),
          servicesApi.listMyServices(user.id),
          chatApi.getConversations(user.id),
          walletApi.getWalletTransactions(user.id),
          walletApi.getComputedBalance(user.id),
          reviewsApi.getMyReviews(user.id).catch(() => [] as Review[]),
        ]);
        if (cancelled) return;
        setOrders(ord);
        setUserServices(mine);
        setChats(conv);
        setTransactions(txs);
        setWalletBalance(balance);
        setMyReviews(revs);
        // Trigger-derived profile fields (rating, review_count) only refresh
        // at sign-in by default — pull them again whenever per-user data
        // hydrates so home / profile / dashboard cards stay current.
        void refreshUser();
      } catch {
        // Keep whatever we already have so the UI never goes blank.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [remoteEnabled, user, refreshUser]);

  // Realtime: incoming messages append into the right thread.
  //
  // We deliberately key this effect on the *set of conversation IDs* (joined
  // into a stable string) rather than on the full `chats` array. Otherwise
  // every realtime message — which calls setChats() to bump lastMessage /
  // unreadCount — would tear down and recreate every channel, opening a
  // window where subsequent messages are lost and the unread badge stops
  // updating.
  const meIdForRt = user?.id ?? null;
  const conversationIdsKey = useMemo(
    () =>
      chats
        .map((c) => c.id)
        .sort()
        .join(","),
    [chats],
  );
  useEffect(() => {
    if (!remoteEnabled || !meIdForRt || !conversationIdsKey) return;
    const ids = conversationIdsKey.split(",");
    const unsubs = ids.map((conversationId) =>
      chatApi.subscribeToMessages(conversationId, (m) => {
        setMessagesByThread((prev) => {
          const existing = prev[conversationId] ?? [];
          if (existing.some((x) => x.id === m.id)) return prev;
          return { ...prev, [conversationId]: [...existing, m] };
        });
        setChats((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessage: m.text,
                  lastMessageAt: m.createdAt,
                  unreadCount:
                    m.senderId === meIdForRt
                      ? c.unreadCount
                      : c.unreadCount + 1,
                }
              : c,
          ),
        );
      }),
    );
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [remoteEnabled, meIdForRt, conversationIdsKey]);

  // Realtime: when the partner sends the very first message in a brand-new
  // conversation, that conversation is not yet in our local `chats` array, so
  // the messages-channel effect above has no subscription for it and the
  // unread badge never lights up. Listen for new conversations the user is a
  // party to and refresh the list so the messages subscription picks it up.
  useEffect(() => {
    if (!remoteEnabled || !meIdForRt) return;
    let cancelled = false;
    const unsub = chatApi.subscribeToMyConversations(meIdForRt, async () => {
      try {
        const fresh = await chatApi.getConversations(meIdForRt);
        // Guard against late responses after the signed-in user has changed
        // (logout / account switch) — otherwise we would briefly leak the
        // previous user's threads into the new session.
        if (cancelled || ownerIdRef.current !== meIdForRt) return;
        setChats(fresh);
      } catch (err) {
        console.warn("[chat] refresh conversations failed", err);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [remoteEnabled, meIdForRt]);

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
        status: "pending_deposit",
        progress: orderProgressFor("pending_deposit"),
        createdAt: Date.now(),
        dueAt: Date.now() + pkg.deliveryDays * 24 * 60 * 60 * 1000,
        depositAmount: Math.round(pkg.price * 0.15 * 100) / 100,
        finalAmount: Math.round(pkg.price * 0.85 * 100) / 100,
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
            ? { ...o, status, progress: orderProgressFor(status) }
            : o,
        ),
      );
    },
    [remoteEnabled],
  );

  // ---------------------------------------------------------------------------
  // Escrow transitions.
  //
  // In backend mode the API helpers update the row, post the system message,
  // and return a fresh Order which we splice into local state. In mock mode
  // we just patch the in-memory order and append a local system message so
  // the chat screen has something to show.
  // ---------------------------------------------------------------------------
  const applyOptimistic = useCallback((next: Order) => {
    setOrders((prev) => prev.map((o) => (o.id === next.id ? next : o)));
  }, []);

  const localTransition = useCallback(
    (
      orderId: string,
      patch: Partial<Order>,
      systemText: string,
      systemSenderId: string,
    ) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const next: Order = {
            ...o,
            ...patch,
            progress: patch.status
              ? orderProgressFor(patch.status)
              : o.progress,
          };
          return next;
        }),
      );
      // Append a local system message into the order's thread (keyed by the
      // partner). This mirrors what payDeposit() does on the backend so the
      // mock-mode demo also sees the audit trail.
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      const partnerId =
        systemSenderId === order.clientId
          ? order.freelancerId
          : order.clientId;
      const partnerName =
        systemSenderId === order.clientId
          ? order.freelancerName
          : order.clientName;
      const thread = chats.find((c) => c.participantId === partnerId);
      const threadId = thread?.id ?? "thr-" + genId().slice(0, 6);
      if (!thread) {
        setChats((prev) => [
          {
            id: threadId,
            participantId: partnerId,
            participantName: partnerName,
            lastMessage: systemText,
            lastMessageAt: Date.now(),
            unreadCount: 0,
            online: true,
          },
          ...prev,
        ]);
      }
      const msg: Message = {
        id: "m-" + genId().slice(0, 6),
        threadId,
        senderId: systemSenderId,
        text: systemText,
        createdAt: Date.now(),
        isSystem: true,
      };
      setMessagesByThread((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), msg],
      }));
    },
    [orders, chats],
  );

  const payDeposit = useCallback(
    async (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      if (remoteEnabled) {
        const next = await ordersApi.payDeposit(order);
        applyOptimistic(next);
        return;
      }
      const dep = order.depositAmount ?? Math.round(order.price * 0.15);
      localTransition(
        orderId,
        { status: "deposit_paid", depositPaidAt: Date.now() },
        `Deposit of ${dep} SAR paid. The freelancer will reach out for the brief.`,
        order.clientId,
      );
    },
    [orders, remoteEnabled, applyOptimistic, localTransition],
  );

  const markInfoReceived = useCallback(
    async (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      if (remoteEnabled) {
        const next = await ordersApi.markInfoReceived(order);
        applyOptimistic(next);
        return;
      }
      const fin = order.finalAmount ?? Math.round(order.price * 0.85);
      localTransition(
        orderId,
        { status: "info_received", infoReceivedAt: Date.now() },
        `Freelancer confirmed they have enough information. Awaiting the remaining ${fin} SAR.`,
        order.freelancerId,
      );
    },
    [orders, remoteEnabled, applyOptimistic, localTransition],
  );

  const payFinal = useCallback(
    async (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      if (remoteEnabled) {
        const next = await ordersApi.payFinal(order);
        applyOptimistic(next);
        return;
      }
      const fin = order.finalAmount ?? Math.round(order.price * 0.85);
      localTransition(
        orderId,
        { status: "fully_paid", finalPaidAt: Date.now() },
        `Remaining ${fin} SAR paid into escrow. Awaiting the freelancer to begin work.`,
        order.clientId,
      );
    },
    [orders, remoteEnabled, applyOptimistic, localTransition],
  );

  const startWork = useCallback(
    async (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      if (remoteEnabled) {
        const next = await ordersApi.startWork(order);
        applyOptimistic(next);
        return;
      }
      localTransition(
        orderId,
        { status: "in_progress" },
        `Freelancer started work on the order.`,
        order.freelancerId,
      );
    },
    [orders, remoteEnabled, applyOptimistic, localTransition],
  );

  const markDelivered = useCallback(
    async (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      if (remoteEnabled) {
        const next = await ordersApi.markDelivered(order);
        applyOptimistic(next);
        return;
      }
      const now = Date.now();
      localTransition(
        orderId,
        {
          status: "delivered",
          deliveredAt: now,
          autoReleaseAt: now + 7 * 24 * 60 * 60 * 1000,
        },
        `Work delivered. The client has 7 days to confirm — funds release automatically after that.`,
        order.freelancerId,
      );
    },
    [orders, remoteEnabled, applyOptimistic, localTransition],
  );

  const lockChatForOrder = useCallback(
    (order: Order) => {
      // Lock whichever thread is scoped to this order so the composer
      // disappears and the closed banner replaces it. Old messages remain
      // readable.
      //
      // Remote mode: each conversation has an order_id, so we match precisely
      // even if the same partner has other active orders. Mock mode: threads
      // are per-partner with no orderId, so we only lock the partner thread
      // when no other in-progress orders with that partner remain.
      const meId = user?.id ?? "";
      const partnerId =
        meId === order.clientId ? order.freelancerId : order.clientId;
      const otherActiveExists = orders.some(
        (o) =>
          o.id !== order.id &&
          o.status !== "completed" &&
          o.status !== "cancelled" &&
          (meId === o.clientId
            ? o.freelancerId === partnerId
            : o.clientId === partnerId),
      );
      setChats((prev) =>
        prev.map((c) => {
          if (c.orderId) {
            return c.orderId === order.id ? { ...c, isLocked: true } : c;
          }
          // In backend mode the trigger handles locking precisely via order_id;
          // never fall back to partner-matching here (would risk locking an
          // unrelated, non-order conversation with the same partner).
          if (remoteEnabled) return c;
          if (otherActiveExists) return c;
          return c.participantId === partnerId ? { ...c, isLocked: true } : c;
        }),
      );
    },
    [user?.id, orders, remoteEnabled],
  );

  const confirmDelivery = useCallback(
    async (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      if (remoteEnabled) {
        const next = await ordersApi.confirmDelivery(order);
        applyOptimistic(next);
        // Earnings credited via the wallet trigger — pull the fresh balance
        // and rating, and reflect the chat lock that the DB trigger applies.
        lockChatForOrder(next);
        try {
          if (user?.id) {
            const [bal, fresh] = await Promise.all([
              walletApi.getComputedBalance(user.id),
              chatApi.getConversations(user.id),
            ]);
            setWalletBalance(bal);
            setChats(fresh);
          }
        } catch {
          // Ignore — local state already reflects the lock.
        }
        void refreshUser();
        return;
      }
      localTransition(
        orderId,
        { status: "completed" },
        `Client confirmed delivery. Funds released to the freelancer.`,
        order.clientId,
      );
      lockChatForOrder(order);
    },
    [
      orders,
      remoteEnabled,
      applyOptimistic,
      localTransition,
      lockChatForOrder,
      refreshUser,
      user?.id,
    ],
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
      } catch (err) {
        // Keep whatever we have so the screen never goes blank, but surface
        // the failure so it shows up in the Metro / dev console — silent
        // catches were masking RLS/network errors during chat debugging.
        console.warn("[chat] loadMessages failed", { threadId, err });
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

  const submitReview = useCallback(
    async (input: {
      orderId: string;
      revieweeId: string;
      rating: number;
      comment?: string;
    }) => {
      if (!user) throw new Error("Not signed in");
      if (input.rating < 1 || input.rating > 5)
        throw new Error("Rating must be between 1 and 5");
      if (remoteEnabled) {
        const review = await reviewsApi.createReview({
          orderId: input.orderId,
          reviewerId: user.id,
          revieweeId: input.revieweeId,
          rating: input.rating,
          comment: input.comment,
        });
        setMyReviews((prev) => [review, ...prev]);
        return;
      }
      // Mock mode: keep a local-only review record so the CTA disappears.
      const local: Review = {
        id: "rev-" + genId().slice(0, 6),
        orderId: input.orderId,
        reviewerId: user.id,
        revieweeId: input.revieweeId,
        rating: input.rating,
        comment: input.comment,
        createdAt: Date.now(),
      };
      setMyReviews((prev) => [local, ...prev]);
    },
    [remoteEnabled, user],
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
      payDeposit,
      markInfoReceived,
      payFinal,
      startWork,
      markDelivered,
      confirmDelivery,
      sendMessage,
      withdraw,
      ensureThread,
      loadMessages,
      markThreadRead,
      upsertService,
      deleteService,
      setServiceStatus,
      getServiceById,
      reviewedOrderIds,
      submitReview,
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
      payDeposit,
      markInfoReceived,
      payFinal,
      startWork,
      markDelivered,
      confirmDelivery,
      sendMessage,
      withdraw,
      ensureThread,
      loadMessages,
      markThreadRead,
      upsertService,
      deleteService,
      setServiceStatus,
      getServiceById,
      reviewedOrderIds,
      submitReview,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
