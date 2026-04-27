export type Role = "freelancer" | "client";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  bio?: string;
  rating?: number;
  completedJobs?: number;
  walletBalance?: number;
  joinedAt: number;
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
  | "pending"
  | "in_progress"
  | "review"
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
};

export type Message = {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  createdAt: number;
  isRead?: boolean;
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
};

export type Transaction = {
  id: string;
  type: "earning" | "withdrawal" | "deposit" | "refund";
  amount: number;
  description: string;
  createdAt: number;
  status: "completed" | "pending";
};
