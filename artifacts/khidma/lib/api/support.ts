import { requireSupabase } from "@/lib/supabase/client";
import { toAppError } from "@/lib/supabase/errors";
import type { SupportTicket } from "@/lib/types";

export type DbSupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
};

function ticketToUi(t: DbSupportTicket): SupportTicket {
  return {
    id: t.id,
    subject: t.subject,
    message: t.message,
    status: t.status,
    createdAt: new Date(t.created_at).getTime(),
  };
}

export async function createSupportTicket(input: {
  userId: string;
  subject: string;
  message: string;
}): Promise<SupportTicket> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("support_tickets")
    .insert({
      user_id: input.userId,
      subject: input.subject.trim(),
      message: input.message.trim(),
    })
    .select("*")
    .single();
  if (error) throw toAppError(error);
  return ticketToUi(data as DbSupportTicket);
}
