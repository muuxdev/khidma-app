import { requireSupabase } from "@/lib/supabase/client";
import { AppError, toAppError } from "@/lib/supabase/errors";

export type DbQuoteRequest = {
  id: string;
  client_id: string;
  freelancer_id: string | null;
  service_id: string | null;
  title: string;
  description: string;
  budget: number | null;
  proposed_price: number | null;
  status: "pending" | "responded" | "accepted" | "rejected" | "converted";
  created_at: string;
  updated_at: string;
};

export async function createQuoteRequest(args: {
  clientId: string;
  freelancerId?: string | null;
  serviceId?: string | null;
  title: string;
  description: string;
  budget?: number | null;
}): Promise<DbQuoteRequest> {
  if (!args.title?.trim() || !args.description?.trim()) {
    throw new AppError("VALIDATION_ERROR", "Title and description are required");
  }
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("quote_requests")
    .insert({
      client_id: args.clientId,
      freelancer_id: args.freelancerId ?? null,
      service_id: args.serviceId ?? null,
      title: args.title.trim(),
      description: args.description.trim(),
      budget: args.budget ?? null,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw toAppError(error);
  return data as DbQuoteRequest;
}

export async function listMyQuoteRequests(userId: string): Promise<DbQuoteRequest[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("quote_requests")
    .select("*")
    .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw toAppError(error);
  return (data ?? []) as DbQuoteRequest[];
}

export async function respondToQuote(
  quoteId: string,
  freelancerId: string,
  proposedPrice: number,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("quote_requests")
    .update({
      proposed_price: proposedPrice,
      status: "responded",
      freelancer_id: freelancerId,
    })
    .eq("id", quoteId);
  if (error) throw toAppError(error);
}

export async function setQuoteStatus(
  quoteId: string,
  status: DbQuoteRequest["status"],
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("quote_requests")
    .update({ status })
    .eq("id", quoteId);
  if (error) throw toAppError(error);
}

/**
 * Convert an accepted quote into an order. Commission is computed by the DB
 * trigger; we only insert (client_id, freelancer_id, service_id?, total_price).
 * Returns the new order id.
 */
export async function convertQuoteToOrder(quoteId: string): Promise<string> {
  const sb = requireSupabase();
  const { data: q, error: qe } = await sb
    .from("quote_requests")
    .select("*")
    .eq("id", quoteId)
    .single();
  if (qe) throw toAppError(qe);
  const quote = q as DbQuoteRequest;
  if (quote.status !== "accepted")
    throw new AppError("QUOTE_NOT_ALLOWED", "Quote must be accepted first");
  if (!quote.freelancer_id)
    throw new AppError("QUOTE_NOT_ALLOWED", "Quote has no freelancer");
  if (!quote.proposed_price)
    throw new AppError("VALIDATION_ERROR", "Quote has no proposed price");

  const { data: order, error: oe } = await sb
    .from("orders")
    .insert({
      client_id: quote.client_id,
      freelancer_id: quote.freelancer_id,
      service_id: quote.service_id, // may be null for open briefs
      package_type: "custom",
      total_price: quote.proposed_price,
      requirements: quote.description,
    })
    .select("id")
    .single();
  if (oe) throw toAppError(oe);

  await sb
    .from("quote_requests")
    .update({ status: "converted" })
    .eq("id", quoteId);

  return (order as { id: string }).id;
}
