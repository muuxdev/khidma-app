/**
 * Translators between the Supabase row shapes and the existing UI types.
 * Keeping all mapping in one place means lib/types.ts and every screen stay
 * untouched. Adjust here if the schema or UI shape ever drifts.
 */
import type {
  ChatThread,
  Message,
  Order,
  OrderStatus,
  Service,
  ServiceCategory,
  Transaction,
  User,
} from "@/lib/types";

export type DbProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "client" | "freelancer";
  avatar_url: string | null;
  bio: string | null;
  skills: unknown;
  tags: string[] | null;
  keywords: string[] | null;
  years_of_experience: number | null;
  rating: number | null;
  review_count: number | null;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
};

export type DbService = {
  id: string;
  freelancer_id: string;
  freelancer_name?: string | null;
  freelancer_avatar?: string | null;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  category: string;
  slug: string;
  status: "draft" | "published";
  basic_price: number | null;
  standard_price: number | null;
  premium_price: number | null;
  basic_description: string | null;
  standard_description: string | null;
  premium_description: string | null;
  packages: unknown; // Service["packages"] in jsonb
  add_ons: unknown; // Service["addOns"] in jsonb
  tags: string[] | null;
  images: string[] | null;
  cover: string | null;
  rating: number | null;
  review_count: number | null;
  orders_in_queue: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbOrderStatus =
  | "pending_deposit"
  | "deposit_paid"
  | "info_received"
  | "fully_paid"
  | "in_progress"
  | "delivered"
  | "completed"
  | "cancelled";

export type DbOrder = {
  id: string;
  client_id: string;
  client_name?: string | null;
  freelancer_id: string;
  freelancer_name?: string | null;
  service_id: string;
  service_title?: string | null;
  service_cover?: string | null;
  package_type: "basic" | "standard" | "premium" | "custom";
  total_price: number;
  platform_fee: number | null;
  freelancer_earnings: number | null;
  status: DbOrderStatus;
  requirements: string | null;
  due_at: string | null;
  deposit_amount: number | null;
  final_amount: number | null;
  deposit_paid_at: string | null;
  info_received_at: string | null;
  final_paid_at: string | null;
  delivered_at: string | null;
  auto_release_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbConversation = {
  id: string;
  order_id: string | null;
  quote_request_id: string | null;
  client_id: string;
  freelancer_id: string;
  is_locked?: boolean | null;
  created_at: string;
};

export type DbMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: "text" | "file";
  attachment_url: string | null;
  is_read: boolean;
  is_system?: boolean;
  created_at: string;
};

export type DbWalletTx = {
  id: string;
  freelancer_id: string;
  order_id: string | null;
  type: "earning" | "refund" | "adjustment";
  amount: number;
  status: "pending" | "available" | "cancelled";
  description: string | null;
  created_at: string;
};

/* ---------- profiles ---------- */

function asStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const out = value.filter((v): v is string => typeof v === "string");
    return out.length ? out : undefined;
  }
  return undefined;
}

export function profileToUser(p: DbProfile): User {
  return {
    id: p.id,
    name: p.full_name ?? "",
    email: p.email ?? "",
    role: p.role,
    avatar: p.avatar_url ?? undefined,
    bio: p.bio ?? undefined,
    rating: typeof p.rating === "number" ? p.rating : 0,
    reviewCount: typeof p.review_count === "number" ? p.review_count : 0,
    completedJobs: 0, // derived elsewhere if needed
    walletBalance: 0, // derived from wallet_transactions
    joinedAt: new Date(p.created_at).getTime(),
    tags: asStringArray(p.tags),
    keywords: asStringArray(p.keywords),
    skills: asStringArray(p.skills),
    yearsOfExperience:
      typeof p.years_of_experience === "number"
        ? p.years_of_experience
        : undefined,
  };
}

/* ---------- services ---------- */

const validCategories = new Set<ServiceCategory>([
  "shopify",
  "salla",
  "ads",
  "seo",
  "branding",
  "photography",
  "content",
]);

function asCategory(c: string): ServiceCategory {
  return validCategories.has(c as ServiceCategory)
    ? (c as ServiceCategory)
    : "shopify";
}

export function serviceToUi(s: DbService): Service {
  const packages = Array.isArray(s.packages)
    ? (s.packages as Service["packages"])
    : [
        {
          tier: "basic" as const,
          name: "Basic",
          price: s.basic_price ?? 0,
          deliveryDays: 3,
          revisions: 1,
          features: s.basic_description ? [s.basic_description] : [],
        },
        {
          tier: "standard" as const,
          name: "Standard",
          price: s.standard_price ?? 0,
          deliveryDays: 5,
          revisions: 2,
          features: s.standard_description ? [s.standard_description] : [],
        },
        {
          tier: "premium" as const,
          name: "Premium",
          price: s.premium_price ?? 0,
          deliveryDays: 7,
          revisions: 3,
          features: s.premium_description ? [s.premium_description] : [],
        },
      ];

  return {
    id: s.id,
    title: s.title_en,
    titleAr: s.title_ar,
    category: asCategory(s.category),
    description: s.description_en ?? "",
    descriptionAr: s.description_ar ?? "",
    cover: s.cover ?? s.category,
    rating: s.rating ?? 0,
    reviewCount: s.review_count ?? 0,
    ordersInQueue: s.orders_in_queue ?? 0,
    freelancerId: s.freelancer_id,
    freelancerName: s.freelancer_name ?? "",
    freelancerAvatar: s.freelancer_avatar ?? undefined,
    packages,
    tags: s.tags ?? [],
    addOns: Array.isArray(s.add_ons)
      ? (s.add_ons as Service["addOns"])
      : undefined,
    status: s.status,
    ownerType: "user",
    imageUri: s.images?.[0],
    createdAt: new Date(s.created_at).getTime(),
    updatedAt: new Date(s.updated_at).getTime(),
  };
}

export function uiServiceToInsert(s: Service, freelancerId: string): Partial<DbService> {
  const find = (tier: "basic" | "standard" | "premium") =>
    s.packages.find((p) => p.tier === tier);
  return {
    freelancer_id: freelancerId,
    title_en: s.title,
    title_ar: s.titleAr,
    description_en: s.description,
    description_ar: s.descriptionAr,
    category: s.category,
    slug:
      s.id ||
      `${s.category}-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
    status: s.status ?? "draft",
    basic_price: find("basic")?.price ?? null,
    standard_price: find("standard")?.price ?? null,
    premium_price: find("premium")?.price ?? null,
    basic_description: find("basic")?.features?.join(" • ") ?? null,
    standard_description: find("standard")?.features?.join(" • ") ?? null,
    premium_description: find("premium")?.features?.join(" • ") ?? null,
    packages: s.packages as unknown,
    add_ons: (s.addOns ?? []) as unknown,
    tags: s.tags ?? [],
    cover: s.cover,
    images: s.imageUri ? [s.imageUri] : [],
  };
}

/* ---------- orders ---------- */

// DB and UI use the same status names now that the escrow lifecycle is in
// place. These helpers stay around for callers that still pass through them
// so a future divergence is a one-line change.
export function dbOrderStatusToUi(s: DbOrderStatus): OrderStatus {
  return s;
}
export function uiOrderStatusToDb(s: OrderStatus): DbOrderStatus {
  return s;
}

export function orderProgressFor(status: OrderStatus): number {
  switch (status) {
    case "pending_deposit":
      return 5;
    case "deposit_paid":
      return 18;
    case "info_received":
      return 30;
    case "fully_paid":
      return 45;
    case "in_progress":
      return 60;
    case "delivered":
      return 85;
    case "completed":
      return 100;
    case "cancelled":
      return 0;
  }
}

export function orderToUi(o: DbOrder): Order {
  const status = dbOrderStatusToUi(o.status);
  const ts = (s: string | null | undefined) =>
    s ? new Date(s).getTime() : undefined;
  return {
    id: o.id,
    serviceId: o.service_id,
    serviceTitle: o.service_title ?? "",
    serviceCover: o.service_cover ?? "shopify",
    packageTier:
      o.package_type === "custom"
        ? "standard"
        : (o.package_type as "basic" | "standard" | "premium"),
    price: Number(o.total_price),
    clientId: o.client_id,
    clientName: o.client_name ?? "",
    freelancerId: o.freelancer_id,
    freelancerName: o.freelancer_name ?? "",
    status,
    progress: orderProgressFor(status),
    createdAt: new Date(o.created_at).getTime(),
    dueAt: o.due_at ? new Date(o.due_at).getTime() : Date.now(),
    notes: o.requirements ?? undefined,
    depositAmount:
      o.deposit_amount != null ? Number(o.deposit_amount) : undefined,
    finalAmount: o.final_amount != null ? Number(o.final_amount) : undefined,
    depositPaidAt: ts(o.deposit_paid_at),
    infoReceivedAt: ts(o.info_received_at),
    finalPaidAt: ts(o.final_paid_at),
    deliveredAt: ts(o.delivered_at),
    autoReleaseAt: ts(o.auto_release_at),
  };
}

/* ---------- chat ---------- */

export function messageToUi(m: DbMessage, threadId: string): Message {
  return {
    id: m.id,
    threadId,
    senderId: m.sender_id,
    text: m.content,
    createdAt: new Date(m.created_at).getTime(),
    isRead: m.is_read,
    isSystem: m.is_system === true,
  };
}

/** A user is considered "online" if their last_seen heartbeat fired within the
 *  last 5 minutes. Centralised so chat list, header, and avatar dot agree. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;
export function isOnlineFromLastSeen(lastSeenAt?: number | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - lastSeenAt < ONLINE_WINDOW_MS;
}

export function conversationToThread(
  c: DbConversation,
  meId: string,
  partner: {
    id: string;
    name: string;
    avatar?: string | null;
    lastSeen?: string | null;
  },
  lastMessage: { content: string; created_at: string } | null,
  unreadCount: number,
): ChatThread {
  const lastSeenAt = partner.lastSeen
    ? new Date(partner.lastSeen).getTime()
    : undefined;
  return {
    id: c.id,
    participantId: partner.id,
    participantName: partner.name,
    participantAvatar: partner.avatar ?? undefined,
    lastMessage: lastMessage?.content ?? "",
    lastMessageAt: lastMessage
      ? new Date(lastMessage.created_at).getTime()
      : new Date(c.created_at).getTime(),
    unreadCount,
    online: isOnlineFromLastSeen(lastSeenAt),
    lastSeenAt,
    isLocked: c.is_locked === true,
    orderId: c.order_id ?? undefined,
  };
}

/* ---------- wallet ---------- */

export function walletTxToTransaction(t: DbWalletTx): Transaction {
  return {
    id: t.id,
    type: t.type === "refund" ? "refund" : t.type === "adjustment" ? "deposit" : "earning",
    amount: Number(t.amount),
    description: t.description ?? "",
    createdAt: new Date(t.created_at).getTime(),
    status: t.status === "available" ? "completed" : "pending",
  };
}
