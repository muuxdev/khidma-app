import type { Order, OrderStatus, Service } from "@/lib/types";

import { requireSupabase } from "@/lib/supabase/client";
import { AppError, toAppError } from "@/lib/supabase/errors";

import * as chatApi from "./chat";
import {
  orderToUi,
  uiOrderStatusToDb,
  type DbOrder,
} from "./mappers";

const JOIN =
  "client:profiles!orders_client_id_fkey(full_name)," +
  "freelancer:profiles!orders_freelancer_id_fkey(full_name)," +
  "service:services!orders_service_id_fkey(title_en, cover)";

const REVIEW_WINDOW_DAYS = 7;

type DbOrderJoined = DbOrder & {
  client?: { full_name: string | null } | null;
  freelancer?: { full_name: string | null } | null;
  service?: { title_en: string | null; cover: string | null } | null;
};

function flatten(o: DbOrderJoined): DbOrder {
  return {
    ...o,
    client_name: o.client?.full_name ?? "",
    freelancer_name: o.freelancer?.full_name ?? "",
    service_title: o.service?.title_en ?? "",
    service_cover: o.service?.cover ?? "shopify",
  };
}

export async function createOrder(args: {
  clientId: string;
  service: Service;
  tier: "basic" | "standard" | "premium";
  requirements?: string;
}): Promise<Order> {
  const { clientId, service, tier, requirements } = args;
  if (service.freelancerId === clientId) {
    throw new AppError("ORDER_NOT_ALLOWED", "Can't order your own service");
  }
  const pkg = service.packages.find((p) => p.tier === tier);
  if (!pkg) throw new AppError("VALIDATION_ERROR", "Invalid package tier");

  const sb = requireSupabase();
  const { data, error } = await sb
    .from("orders")
    .insert({
      client_id: clientId,
      freelancer_id: service.freelancerId,
      service_id: service.id,
      package_type: tier,
      total_price: pkg.price,
      requirements: requirements ?? null,
      status: "pending_deposit",
      due_at: new Date(
        Date.now() + pkg.deliveryDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .select(`*, ${JOIN}`)
    .single();
  if (error) throw toAppError(error);
  const row = data as DbOrderJoined;

  // We do NOT eagerly create the conversation any more — chat is gated on
  // the deposit being paid. payDeposit() opens the conversation and posts
  // the first system message.

  return orderToUi(flatten(row));
}

export async function getMyOrders(userId: string): Promise<Order[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("orders")
    .select(`*, ${JOIN}`)
    .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw toAppError(error);
  return (data ?? []).map((row) => orderToUi(flatten(row as DbOrderJoined)));
}

export async function getOrderById(id: string): Promise<Order | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("orders")
    .select(`*, ${JOIN}`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data ? orderToUi(flatten(data as DbOrderJoined)) : null;
}

/** Generic status setter — kept for cancellation paths. Escrow transitions
 *  should go through the dedicated helpers below so the right side-effects
 *  fire (timestamps, system messages, conversation creation, etc.). */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("orders")
    .update({ status: uiOrderStatusToDb(status) })
    .eq("id", orderId);
  if (error) throw toAppError(error);
}

// ---------------------------------------------------------------------------
// Escrow transitions
//
// Each helper:
//   1. Updates the order row with the new status + timestamp.
//   2. Returns the fresh Order for the caller to apply optimistically.
//   3. Posts an automated system message into the order's conversation so
//      both parties have an audit trail in chat.
// ---------------------------------------------------------------------------

async function transitionOrder(
  orderId: string,
  patch: Partial<DbOrder>,
): Promise<Order> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .select(`*, ${JOIN}`)
    .single();
  if (error) throw toAppError(error);
  return orderToUi(flatten(data as DbOrderJoined));
}

async function postSystemMessage(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<void> {
  try {
    await chatApi.sendSystemMessage(conversationId, senderId, text);
  } catch {
    // Audit trail is best-effort; do not block the state transition.
  }
}

/** Client pays the 15% deposit. Opens the order's conversation if it doesn't
 *  yet exist and posts the first system message. */
export async function payDeposit(order: Order): Promise<Order> {
  if (order.status !== "pending_deposit") {
    throw new AppError(
      "INVALID_STATE",
      `Cannot pay deposit on status ${order.status}`,
    );
  }
  const next = await transitionOrder(order.id, {
    status: "deposit_paid",
    deposit_paid_at: new Date().toISOString(),
  });
  const convId = await chatApi.getOrCreateConversationByOrder(
    order.id,
    order.clientId,
    order.freelancerId,
  );
  await postSystemMessage(
    convId,
    order.clientId,
    `Deposit of ${next.depositAmount ?? 0} SAR paid. The freelancer will reach out for the brief.`,
  );
  return next;
}

/** Freelancer confirms they have enough information to begin work. */
export async function markInfoReceived(order: Order): Promise<Order> {
  if (order.status !== "deposit_paid") {
    throw new AppError(
      "INVALID_STATE",
      `Cannot confirm info on status ${order.status}`,
    );
  }
  const next = await transitionOrder(order.id, {
    status: "info_received",
    info_received_at: new Date().toISOString(),
  });
  const convId = await chatApi.getOrCreateConversationByOrder(
    order.id,
    order.clientId,
    order.freelancerId,
  );
  await postSystemMessage(
    convId,
    order.freelancerId,
    `Freelancer confirmed they have enough information. Awaiting the remaining ${next.finalAmount ?? 0} SAR to begin work.`,
  );
  return next;
}

/** Client pays the remaining 85% — funds are now in escrow waiting for the
 *  freelancer to start work. */
export async function payFinal(order: Order): Promise<Order> {
  if (order.status !== "info_received") {
    throw new AppError(
      "INVALID_STATE",
      `Cannot pay final on status ${order.status}`,
    );
  }
  const now = new Date().toISOString();
  const next = await transitionOrder(order.id, {
    status: "fully_paid",
    final_paid_at: now,
  });
  const convId = await chatApi.getOrCreateConversationByOrder(
    order.id,
    order.clientId,
    order.freelancerId,
  );
  await postSystemMessage(
    convId,
    order.clientId,
    `Remaining ${next.finalAmount ?? 0} SAR paid into escrow. Awaiting the freelancer to begin work.`,
  );
  return next;
}

/** Freelancer acknowledges the funds and begins work. */
export async function startWork(order: Order): Promise<Order> {
  if (order.status !== "fully_paid") {
    throw new AppError(
      "INVALID_STATE",
      `Cannot start work on status ${order.status}`,
    );
  }
  const next = await transitionOrder(order.id, { status: "in_progress" });
  const convId = await chatApi.getOrCreateConversationByOrder(
    order.id,
    order.clientId,
    order.freelancerId,
  );
  await postSystemMessage(
    convId,
    order.freelancerId,
    `Freelancer started work on the order.`,
  );
  return next;
}

/** Freelancer marks the work delivered, opening the 7-day review window. */
export async function markDelivered(order: Order): Promise<Order> {
  if (order.status !== "in_progress") {
    throw new AppError(
      "INVALID_STATE",
      `Cannot deliver on status ${order.status}`,
    );
  }
  const now = Date.now();
  const release = new Date(
    now + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const next = await transitionOrder(order.id, {
    status: "delivered",
    delivered_at: new Date(now).toISOString(),
    auto_release_at: release,
  });
  const convId = await chatApi.getOrCreateConversationByOrder(
    order.id,
    order.clientId,
    order.freelancerId,
  );
  await postSystemMessage(
    convId,
    order.freelancerId,
    `Work delivered. The client has 7 days to confirm — funds release automatically after that.`,
  );
  return next;
}

/** Client confirms delivery — releases funds via the existing earnings
 *  trigger that fires on status='completed'. */
export async function confirmDelivery(order: Order): Promise<Order> {
  if (order.status !== "delivered") {
    throw new AppError(
      "INVALID_STATE",
      `Cannot confirm on status ${order.status}`,
    );
  }
  const next = await transitionOrder(order.id, { status: "completed" });
  const convId = await chatApi.getOrCreateConversationByOrder(
    order.id,
    order.clientId,
    order.freelancerId,
  );
  await postSystemMessage(
    convId,
    order.clientId,
    `Client confirmed delivery. Funds released to the freelancer.`,
  );
  return next;
}
