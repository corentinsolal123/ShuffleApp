import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inject } from "vitest";
import type { Database } from "@/lib/db/types";

export const localSupabase = inject("supabase");

export type TestUser = {
  id: string;
  email: string;
  client: SupabaseClient<Database>;
};

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

function adminClient(): SupabaseClient<Database> {
  if (!localSupabase) throw new Error("Local Supabase is not available");
  return createClient<Database>(localSupabase.url, localSupabase.secretKey, clientOptions);
}

export function anonClient(): SupabaseClient<Database> {
  if (!localSupabase) throw new Error("Local Supabase is not available");
  return createClient<Database>(localSupabase.url, localSupabase.publishableKey, clientOptions);
}

/** Creates a confirmed user through the admin API and returns a client signed in as them. */
export async function createTestUser(label: string): Promise<TestUser> {
  const email = `${label}-${crypto.randomUUID()}@rls.test`;
  const password = crypto.randomUUID();

  const { data, error } = await adminClient().auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("User creation failed");

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { id: data.user.id, email, client };
}

export async function deleteTestUser(user: TestUser | undefined) {
  if (user) await adminClient().auth.admin.deleteUser(user.id);
}
