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
      due_at: new Date(
        Date.now() + pkg.deliveryDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .select(`*, ${JOIN}`)
    .single();
  if (error) throw toAppError(error);
  const row = data as DbOrderJoined;

  // Open the conversation for this order eagerly so both parties can chat
  // immediately. One conversation per order is enforced by the lookup below.
  try {
    await chatApi.getOrCreateConversationByOrder(
      row.id,
      row.client_id,
      row.freelancer_id,
    );
  } catch {
    // Non-fatal: chat can still be opened lazily from the order screen.
  }

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
