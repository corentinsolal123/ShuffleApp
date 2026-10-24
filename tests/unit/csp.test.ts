import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, createNonce } from "@/lib/security/csp";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name!, sources];
    }),
  );
}

const options = { nonce: "abc123", supabaseUrl: "https://ref.supabase.co/", isDev: false };

describe("contentSecurityPolicy", () => {
  it("only runs scripts carrying the request nonce", () => {
    const scripts = directives(contentSecurityPolicy(options)).get("script-src");
    expect(scripts).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
  });

  it("allows eval in development only", () => {
    expect(directives(contentSecurityPolicy({ ...options, isDev: true })).get("script-src")).toContain("'unsafe-eval'");
  });

  it("lets the browser reach Supabase and Open-Meteo, and nothing else", () => {
    const policy = directives(contentSecurityPolicy(options));
    expect(policy.get("connect-src")).toEqual([
      "'self'",
      "https://ref.supabase.co",
      "https://api.open-meteo.com",
      "https://geocoding-api.open-meteo.com",
    ]);
    expect(policy.get("img-src")).toEqual(["'self'", "blob:", "data:", "https://ref.supabase.co"]);
  });

  it("forbids framing, plugins and foreign form targets", () => {
    const policy = directives(contentSecurityPolicy(options));
    expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
    expect(policy.get("object-src")).toEqual(["'none'"]);
    expect(policy.get("form-action")).toEqual(["'self'"]);
    expect(policy.get("base-uri")).toEqual(["'self'"]);
  });
});

describe("createNonce", () => {
  it("returns a fresh base64 value each time", () => {
    const nonce = createNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(createNonce()).not.toBe(nonce);
  });
});
