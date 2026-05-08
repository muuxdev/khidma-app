import { requireSupabase } from "@/lib/supabase/client";
import { toAppError } from "@/lib/supabase/errors";

/** Insert a (follower → freelancer) edge. Idempotent: a duplicate follow
 *  is silently ignored so the UI never sees a unique-violation error. */
export async function follow(
  followerId: string,
  freelancerId: string,
): Promise<void> {
  if (followerId === freelancerId) return;
  const sb = requireSupabase();
  const { error } = await sb
    .from("follows")
    .upsert(
      { follower_id: followerId, freelancer_id: freelancerId },
      { onConflict: "follower_id,freelancer_id", ignoreDuplicates: true },
    );
  if (error) throw toAppError(error);
}

export async function unfollow(
  followerId: string,
  freelancerId: string,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("freelancer_id", freelancerId);
  if (error) throw toAppError(error);
}

export async function isFollowing(
  followerId: string,
  freelancerId: string,
): Promise<boolean> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("follows")
    .select("freelancer_id")
    .eq("follower_id", followerId)
    .eq("freelancer_id", freelancerId)
    .maybeSingle();
  if (error) throw toAppError(error);
  return !!data;
}

export async function getFollowerCount(freelancerId: string): Promise<number> {
  const sb = requireSupabase();
  const { count, error } = await sb
    .from("follows")
    .select("freelancer_id", { count: "exact", head: true })
    .eq("freelancer_id", freelancerId);
  if (error) throw toAppError(error);
  return count ?? 0;
}

