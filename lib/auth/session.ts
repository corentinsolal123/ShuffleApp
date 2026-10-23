import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Returns the signed-in user's id, or redirects to /login. Deduplicated per request. */
export const requireUserId = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) {
    redirect("/login");
  }
  return userId;
});
