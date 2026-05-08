import {
  pgTable,
  text,
  uuid,
  numeric,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    full_name: text("full_name"),
    email: text("email").unique(),
    role: text("role").notNull(),
    avatar_url: text("avatar_url"),
    bio: text("bio"),
    skills: jsonb("skills").notNull().default([]),
    rating: numeric("rating").notNull().default("0"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const insertProfileSchema = createInsertSchema(profiles);
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// ---------------------------------------------------------------------------
// services
// ---------------------------------------------------------------------------
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    freelancer_id: uuid("freelancer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title_ar: text("title_ar").notNull(),
    title_en: text("title_en").notNull(),
    description_ar: text("description_ar"),
    description_en: text("description_en"),
    category: text("category").notNull(),
    slug: text("slug").unique().notNull(),
    status: text("status").notNull().default("draft"),
    basic_price: numeric("basic_price"),
    standard_price: numeric("standard_price"),
    premium_price: numeric("premium_price"),
    basic_description: text("basic_description"),
    standard_description: text("standard_description"),
    premium_description: text("premium_description"),
    packages: jsonb("packages").notNull().default([]),
    add_ons: jsonb("add_ons").notNull().default([]),
    tags: text("tags").array().notNull().default([]),
    cover: text("cover"),
    images: text("images").array().notNull().default([]),
    rating: numeric("rating").notNull().default("0"),
    review_count: integer("review_count").notNull().default(0),
    orders_in_queue: integer("orders_in_queue").notNull().default(0),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_services_slug").on(t.slug),
    index("idx_services_freelancer_id").on(t.freelancer_id),
  ],
);

export const insertServiceSchema = createInsertSchema(services);
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// ---------------------------------------------------------------------------
// orders
// ---------------------------------------------------------------------------
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    client_id: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    freelancer_id: uuid("freelancer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    service_id: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    package_type: text("package_type").notNull(),
    total_price: numeric("total_price").notNull(),
    platform_fee: numeric("platform_fee"),
    freelancer_earnings: numeric("freelancer_earnings"),
    status: text("status").notNull().default("pending"),
    requirements: text("requirements"),
    due_at: timestamp("due_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_orders_client_id").on(t.client_id),
    index("idx_orders_freelancer_id").on(t.freelancer_id),
    index("idx_orders_service_id").on(t.service_id),
    index("idx_orders_status").on(t.status),
  ],
);

export const insertOrderSchema = createInsertSchema(orders);
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// ---------------------------------------------------------------------------
// wallet_transactions
// ---------------------------------------------------------------------------
export const wallet_transactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    freelancer_id: uuid("freelancer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    order_id: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    amount: numeric("amount").notNull(),
    status: text("status").notNull().default("pending"),
    description: text("description"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_wallet_freelancer").on(t.freelancer_id)],
);

export const insertWalletTransactionSchema =
  createInsertSchema(wallet_transactions);
export type InsertWalletTransaction = z.infer<
  typeof insertWalletTransactionSchema
>;
export type WalletTransaction = typeof wallet_transactions.$inferSelect;

// ---------------------------------------------------------------------------
// quote_requests
// ---------------------------------------------------------------------------
export const quote_requests = pgTable(
  "quote_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    client_id: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    freelancer_id: uuid("freelancer_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    service_id: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    budget: numeric("budget"),
    proposed_price: numeric("proposed_price"),
    status: text("status").notNull().default("pending"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_quotes_client").on(t.client_id),
    index("idx_quotes_freelancer").on(t.freelancer_id),
    index("idx_quotes_status").on(t.status),
  ],
);

export const insertQuoteRequestSchema = createInsertSchema(quote_requests);
export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;
export type QuoteRequest = typeof quote_requests.$inferSelect;

// ---------------------------------------------------------------------------
// conversations
// ---------------------------------------------------------------------------
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    quote_request_id: uuid("quote_request_id").references(
      () => quote_requests.id,
      { onDelete: "set null" },
    ),
    client_id: uuid("client_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    freelancer_id: uuid("freelancer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_conv_pair").on(t.client_id, t.freelancer_id),
    index("idx_conv_order").on(t.order_id),
  ],
);

export const insertConversationSchema = createInsertSchema(conversations);
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// ---------------------------------------------------------------------------
// messages
// ---------------------------------------------------------------------------
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversation_id: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sender_id: uuid("sender_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    type: text("type").notNull().default("text"),
    attachment_url: text("attachment_url"),
    is_read: boolean("is_read").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_messages_conv").on(t.conversation_id, t.created_at)],
);

export const insertMessageSchema = createInsertSchema(messages);
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    is_read: boolean("is_read").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_notifications_user").on(t.user_id, t.is_read)],
);

export const insertNotificationSchema = createInsertSchema(notifications);
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ---------------------------------------------------------------------------
// audit_logs
// ---------------------------------------------------------------------------
export const audit_logs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entity_id: uuid("entity_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_audit_entity").on(t.entity, t.entity_id),
    index("idx_audit_user").on(t.user_id),
  ],
);

export const insertAuditLogSchema = createInsertSchema(audit_logs);
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof audit_logs.$inferSelect;
