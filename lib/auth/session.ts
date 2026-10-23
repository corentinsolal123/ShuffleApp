import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Verified JWT claims of the current request, read once per request. */
const getClaims = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
});

/** Returns the signed-in user's id, or redirects to /login. */
export async function requireUserId(): Promise<string> {
  const userId = (await getClaims())?.sub;
  if (!userId) {
    redirect("/login");
  }
  return userId;
}

/** Email of the signed-in user, for display. */
export async function getSessionEmail(): Promise<string | null> {
  const email = (await getClaims())?.email;
  return typeof email === "string" ? email : null;
}
