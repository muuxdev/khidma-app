export type Role = "freelancer" | "client";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  bio?: string;
  rating?: number;
  reviewCount?: number;
  completedJobs?: number;
  walletBalance?: number;
  joinedAt: number;
  /** Discoverability tags (Arabic or English), e.g. "تصميم", "Shopify". */
  tags?: string[];
  /** Search keywords used by the discovery layer. */
  keywords?: string[];
  /** Skill list (mostly freelancer-only). */
  skills?: string[];
  /** Freelancer-only — years of professional experience. */
  yearsOfExperience?: number;
};

export type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: number;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: number;
};

export type ServicePackage = {
  tier: "basic" | "standard" | "premium";
  name: string;
  price: number;
  deliveryDays: number;
  revisions: number;
  features: string[];
};

export type ServiceAddOn = {
  id: string;
  title: string;
  titleAr?: string;
  price: number;
  deliveryDays: number;
};

export type ServiceStatus = "published" | "draft";

export type Service = {
  id: string;
  title: string;
  titleAr: string;
  category: ServiceCategory;
  description: string;
  descriptionAr: string;
  cover: string;
  rating: number;
  reviewCount: number;
  ordersInQueue: number;
  freelancerId: string;
  freelancerName: string;
  freelancerAvatar?: string;
  packages: ServicePackage[];
  tags: string[];
  addOns?: ServiceAddOn[];
  status?: ServiceStatus;
  ownerType?: "system" | "user";
  imageUri?: string;
  createdAt?: number;
  updatedAt?: number;
};

export type ServiceCategory =
  | "shopify"
  | "salla"
  | "ads"
  | "seo"
  | "branding"
  | "photography"
  | "content";

export type OrderStatus =
  | "pending_deposit"
  | "deposit_paid"
  | "info_received"
  | "fully_paid"
  | "in_progress"
  | "delivered"
  | "completed"
  | "cancelled";

export type Order = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceCover: string;
  packageTier: "basic" | "standard" | "premium";
  price: number;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  status: OrderStatus;
  progress: number;
  createdAt: number;
  dueAt: number;
  notes?: string;
  depositAmount?: number;
  finalAmount?: number;
  depositPaidAt?: number;
  infoReceivedAt?: number;
  finalPaidAt?: number;
  deliveredAt?: number;
  autoReleaseAt?: number;
};

export type Message = {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  createdAt: number;
  isRead?: boolean;
  isSystem?: boolean;
};

export type ChatThread = {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageAt: number;
  unreadCount: number;
  online?: boolean;
  /** Partner's last_seen timestamp (ms since epoch); used to derive `online`. */
  lastSeenAt?: number;
  /** True once the linked order has completed (or escrow auto-released). When
   *  set, the chat composer is hidden and a closed-conversation banner is
   *  shown — old messages remain readable. */
  isLocked?: boolean;
  /** Order this conversation is scoped to (remote mode only). Used to lock
   *  the right thread on completion when a partner has multiple orders. */
  orderId?: string;
};

export type Transaction = {
  id: string;
  type: "earning" | "withdrawal" | "deposit" | "refund";
  amount: number;
  description: string;
  createdAt: number;
  status: "completed" | "pending";
};
