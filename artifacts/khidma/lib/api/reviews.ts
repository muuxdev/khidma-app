import { requireSupabase } from "@/lib/supabase/client";
import { toAppError } from "@/lib/supabase/errors";

export type Review = {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  createdAt: number;
};

type DbReview = {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

function toUi(r: DbReview): Review {
  return {
    id: r.id,
    orderId: r.order_id,
    reviewerId: r.reviewer_id,
    revieweeId: r.reviewee_id,
    rating: r.rating,
    comment: r.comment ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
  };
}

export async function createReview(input: {
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
}): Promise<Review> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("reviews")
    .insert({
      order_id: input.orderId,
      reviewer_id: input.reviewerId,
      reviewee_id: input.revieweeId,
      rating: input.rating,
      comment: input.comment ?? null,
    })
    .select("*")
    .single();
  if (error) throw toAppError(error);
  return toUi(data as DbReview);
}

/** All reviews authored by a given reviewer — used to know which orders they've
 *  already reviewed so the UI can disable the button. */
export async function getMyReviews(reviewerId: string): Promise<Review[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("reviews")
    .select("*")
    .eq("reviewer_id", reviewerId);
  if (error) throw toAppError(error);
  return ((data ?? []) as DbReview[]).map(toUi);
}

export async function getReviewsForUser(revieweeId: string): Promise<Review[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("reviews")
    .select("*")
    .eq("reviewee_id", revieweeId)
    .order("created_at", { ascending: false });
  if (error) throw toAppError(error);
  return ((data ?? []) as DbReview[]).map(toUi);
}
