import type { Service } from "@/lib/types";

import { requireSupabase } from "@/lib/supabase/client";
import { AppError, toAppError } from "@/lib/supabase/errors";

import { serviceToUi, uiServiceToInsert, type DbService } from "./mappers";

const PROFILE_JOIN = "freelancer:profiles!services_freelancer_id_fkey(full_name, avatar_url)";

type DbServiceJoined = DbService & {
  freelancer?: { full_name: string | null; avatar_url: string | null } | null;
};

function flattenJoin(s: DbServiceJoined): DbService {
  return {
    ...s,
    freelancer_name: s.freelancer?.full_name ?? "",
    freelancer_avatar: s.freelancer?.avatar_url ?? null,
  };
}

export async function listPublishedServices(opts?: {
  limit?: number;
  offset?: number;
  category?: string;
  search?: string;
}): Promise<Service[]> {
  const sb = requireSupabase();
  const limit = Math.min(opts?.limit ?? 50, 100);
  const offset = opts?.offset ?? 0;
  let q = sb
    .from("services")
    .select(`*, ${PROFILE_JOIN}`)
    .is("deleted_at", null)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (opts?.category) q = q.eq("category", opts.category);
  if (opts?.search) {
    const t = opts.search.replace(/[%_]/g, "");
    q = q.or(`title_en.ilike.%${t}%,title_ar.ilike.%${t}%`);
  }
  const { data, error } = await q;
  if (error) throw toAppError(error);
  return (data ?? []).map((row) => serviceToUi(flattenJoin(row as DbServiceJoined)));
}

export async function listMyServices(freelancerId: string): Promise<Service[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("services")
    .select(`*, ${PROFILE_JOIN}`)
    .is("deleted_at", null)
    .eq("freelancer_id", freelancerId)
    .order("updated_at", { ascending: false });
  if (error) throw toAppError(error);
  return (data ?? []).map((row) => serviceToUi(flattenJoin(row as DbServiceJoined)));
}

export async function getServiceById(id: string): Promise<Service | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("services")
    .select(`*, ${PROFILE_JOIN}`)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data ? serviceToUi(flattenJoin(data as DbServiceJoined)) : null;
}

export async function createService(
  freelancerId: string,
  service: Service,
): Promise<Service> {
  const sb = requireSupabase();
  const insert = uiServiceToInsert(service, freelancerId);
  delete (insert as { id?: string }).id;
  const { data, error } = await sb
    .from("services")
    .insert(insert)
    .select(`*, ${PROFILE_JOIN}`)
    .single();
  if (error) throw toAppError(error);
  return serviceToUi(flattenJoin(data as DbServiceJoined));
}

export async function updateService(
  id: string,
  freelancerId: string,
  service: Service,
): Promise<Service> {
  const sb = requireSupabase();
  const patch = uiServiceToInsert(service, freelancerId);
  const { data, error } = await sb
    .from("services")
    .update(patch)
    .eq("id", id)
    .eq("freelancer_id", freelancerId)
    .select(`*, ${PROFILE_JOIN}`)
    .single();
  if (error) throw toAppError(error);
  return serviceToUi(flattenJoin(data as DbServiceJoined));
}

export async function publishService(id: string, freelancerId: string) {
  return setServiceStatus(id, freelancerId, "published");
}

export async function setServiceStatus(
  id: string,
  freelancerId: string,
  status: "published" | "draft",
) {
  const sb = requireSupabase();
  const { error } = await sb
    .from("services")
    .update({ status })
    .eq("id", id)
    .eq("freelancer_id", freelancerId);
  if (error) throw toAppError(error);
}

export async function softDeleteService(id: string, freelancerId: string) {
  const sb = requireSupabase();
  const { error } = await sb
    .from("services")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("freelancer_id", freelancerId);
  if (error) throw toAppError(error);
}

export async function searchServices(text: string, limit = 20) {
  return listPublishedServices({ search: text, limit });
}

export function assertCanOrder(service: Service, clientId: string) {
  if (service.freelancerId === clientId) {
    throw new AppError("ORDER_NOT_ALLOWED", "You can't order your own service");
  }
}
