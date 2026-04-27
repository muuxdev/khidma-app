import { requireSupabase } from "@/lib/supabase/client";
import { toAppError } from "@/lib/supabase/errors";

export type DbNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

export async function getNotifications(
  userId: string,
  opts?: { limit?: number; unreadOnly?: boolean },
): Promise<DbNotification[]> {
  const sb = requireSupabase();
  let q = sb
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(opts?.limit ?? 50, 100));
  if (opts?.unreadOnly) q = q.eq("is_read", false);
  const { data, error } = await q;
  if (error) throw toAppError(error);
  return (data ?? []) as DbNotification[];
}

export async function markAsRead(notificationId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
  if (error) throw toAppError(error);
}

export async function markAllAsRead(userId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw toAppError(error);
}

export function subscribeToNotifications(
  userId: string,
  onNew: (n: DbNotification) => void,
): () => void {
  const sb = requireSupabase();
  const channel = sb
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNew(payload.new as DbNotification),
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}
