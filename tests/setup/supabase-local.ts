import { execFileSync } from "node:child_process";
import type { TestProject } from "vitest/node";

export type LocalSupabase = {
  url: string;
  publishableKey: string;
  secretKey: string;
};

declare module "vitest" {
  export interface ProvidedContext {
    supabase: LocalSupabase | null;
  }
}

/** Reads credentials from SUPABASE_* env vars, or from `supabase status`. */
function readCredentials(): LocalSupabase | null {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY } = process.env;
  if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && SUPABASE_SECRET_KEY) {
    return { url: SUPABASE_URL, publishableKey: SUPABASE_PUBLISHABLE_KEY, secretKey: SUPABASE_SECRET_KEY };
  }
  try {
    const output = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const status = JSON.parse(output.slice(output.indexOf("{"))) as Record<string, string | undefined>;
    const url = status.API_URL;
    const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
    const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
    return url && publishableKey && secretKey ? { url, publishableKey, secretKey } : null;
  } catch {
    return null;
  }
}

async function isReachable({ url, publishableKey }: LocalSupabase): Promise<boolean> {
  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: publishableKey },
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default async function setup(project: TestProject) {
  const credentials = readCredentials();
  const available = credentials !== null && (await isReachable(credentials));
  if (!available) {
    console.warn("[rls] No local Supabase reachable: RLS tests are skipped. Run `pnpm supabase start`.");
  }
  project.provide("supabase", available ? credentials : null);
}
