// Content-Security-Policy sent by proxy.ts. Scripts need the per-request nonce,
// which Next.js adds to its own tags, so every page must be rendered on demand.

const OPEN_METEO_ORIGINS = ["https://api.open-meteo.com", "https://geocoding-api.open-meteo.com"];

export type CspOptions = {
  nonce: string;
  /** Supabase project URL: auth and data calls, photo uploads and signed photo URLs. */
  supabaseUrl: string;
  /** `next dev` needs eval for its debugging tools. */
  isDev: boolean;
};

export function createNonce(): string {
  return btoa(crypto.randomUUID());
}

export function contentSecurityPolicy({ nonce, supabaseUrl, isDev }: CspOptions): string {
  const supabase = new URL(supabaseUrl).origin;
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    // Inline style attributes (colour swatches) cannot carry a nonce.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", supabase],
    "font-src": ["'self'"],
    "connect-src": ["'self'", supabase, ...OPEN_METEO_ORIGINS],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}
