import type { ChatThread, Message } from "@/lib/types";

import { requireSupabase } from "@/lib/supabase/client";
import { AppError, toAppError } from "@/lib/supabase/errors";

import {
  conversationToThread,
  messageToUi,
  type DbConversation,
  type DbMessage,
} from "./mappers";

const CONV_JOIN =
  "client:profiles!conversations_client_id_fkey(id, full_name, avatar_url)," +
  "freelancer:profiles!conversations_freelancer_id_fkey(id, full_name, avatar_url)";

type DbConvJoined = DbConversation & {
  client?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  freelancer?: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

export async function getOrCreateConversationByOrder(
  orderId: string,
  clientId: string,
  freelancerId: string,
): Promise<string> {
  const sb = requireSupabase();
  const { data: existing } = await sb
    .from("conversations")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing?.id) return (existing as { id: string }).id;
  const { data, error } = await sb
    .from("conversations")
    .insert({
      order_id: orderId,
      client_id: clientId,
      freelancer_id: freelancerId,
    })
    .select("id")
    .single();
  if (error) throw toAppError(error);
  return (data as { id: string }).id;
}

export async function getOrCreateConversationByPartner(
  meId: string,
  meRole: "client" | "freelancer",
  partnerId: string,
): Promise<string> {
  const sb = requireSupabase();
  const clientId = meRole === "client" ? meId : partnerId;
  const freelancerId = meRole === "freelancer" ? meId : partnerId;
  const { data: existing } = await sb
    .from("conversations")
    .select("id")
    .eq("client_id", clientId)
    .eq("freelancer_id", freelancerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return (existing as { id: string }).id;
  const { data, error } = await sb
    .from("conversations")
    .insert({ client_id: clientId, freelancer_id: freelancerId })
    .select("id")
    .single();
  if (error) throw toAppError(error);
  return (data as { id: string }).id;
}

export async function getConversations(meId: string): Promise<ChatThread[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("conversations")
    .select(`*, ${CONV_JOIN}`)
    .or(`client_id.eq.${meId},freelancer_id.eq.${meId}`)
    .order("created_at", { ascending: false });
  if (error) throw toAppError(error);
  const convos = (data ?? []) as DbConvJoined[];
  if (!convos.length) return [];

  // Fetch the most recent message + unread count per conversation in parallel.
  const enriched = await Promise.all(
    convos.map(async (c) => {
      const partner =
        c.client_id === meId
          ? c.freelancer
          : c.client;
      const partnerInfo = {
        id: partner?.id ?? "",
        name: partner?.full_name ?? "",
        avatar: partner?.avatar_url ?? null,
      };
      const [{ data: lastMsg }, { count }] = await Promise.all([
        sb
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .eq("is_read", false)
          .neq("sender_id", meId),
      ]);
      return conversationToThread(
        c,
        meId,
        partnerInfo,
        (lastMsg as { content: string; created_at: string } | null) ?? null,
        count ?? 0,
      );
    }),
  );
  return enriched.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

export async function getMessagesPaginated(
  conversationId: string,
  opts?: { limit?: number; before?: string },
): Promise<Message[]> {
  const sb = requireSupabase();
  const limit = Math.min(opts?.limit ?? 50, 100);
  let q = sb
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts?.before) q = q.lt("created_at", opts.before);
  const { data, error } = await q;
  if (error) throw toAppError(error);
  return ((data ?? []) as DbMessage[])
    .map((m) => messageToUi(m, conversationId))
    .sort((a, b) => a.createdAt - b.createdAt);
}

let _lastSendAt = 0;
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<Message> {
  // Light client-side throttle: 4 messages/second max.
  const now = Date.now();
  if (now - _lastSendAt < 250)
    throw new AppError("RATE_LIMITED", "Slow down a moment");
  _lastSendAt = now;

  const trimmed = text.trim();
  if (!trimmed) throw new AppError("VALIDATION_ERROR", "Message is empty");
  if (trimmed.length > 2000)
    throw new AppError("VALIDATION_ERROR", "Message too long");

  const sb = requireSupabase();
  const { data, error } = await sb
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: trimmed,
      type: "text",
    })
    .select("*")
    .single();
  if (error) throw toAppError(error);
  return messageToUi(data as DbMessage, conversationId);
}

export async function markMessagesAsRead(
  conversationId: string,
  meId: string,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .eq("is_read", false)
    .neq("sender_id", meId);
  if (error) throw toAppError(error);
}

export function subscribeToMessages(
  conversationId: string,
  onMessage: (m: Message) => void,
): () => void {
  const sb = requireSupabase();
  const channel = sb
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(messageToUi(payload.new as DbMessage, conversationId));
      },
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}
