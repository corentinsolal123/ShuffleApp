import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Invitation } from "./model";

/** Invitations, newest first. RLS only returns rows to admins. */
export async function listInvitations(): Promise<Invitation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("email, created_at, accepted_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load invitations: ${error.message}`);
  return data.map((row) => ({ email: row.email, createdAt: row.created_at, acceptedAt: row.accepted_at }));
}
