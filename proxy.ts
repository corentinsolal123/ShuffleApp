import type { NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import { contentSecurityPolicy, createNonce } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const csp = contentSecurityPolicy({
    nonce: createNonce(),
    supabaseUrl: getSupabaseEnv().url,
    isDev: process.env.NODE_ENV === "development",
  });
  // Next.js reads the nonce from the request header and adds it to its scripts.
  request.headers.set("Content-Security-Policy", csp);

  const response = await updateSession(request);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, PWA files and image optimisation.
    "/((?!_next/static|_next/image|serwist/|icons/|manifest.webmanifest|icon.png|apple-icon.png|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
