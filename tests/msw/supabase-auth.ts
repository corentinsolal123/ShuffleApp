import { http, HttpResponse } from "msw";
import { SUPABASE_URL } from "./server";

const USER_ID = "00000000-0000-4000-8000-000000000001";

function fakeJwt(sub: string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub, exp, role: "authenticated" })}.signature`;
}

export const authHandlers = {
  otpSent: () => http.post(`${SUPABASE_URL}/auth/v1/otp`, () => HttpResponse.json({})),

  otpRateLimited: () =>
    http.post(`${SUPABASE_URL}/auth/v1/otp`, () =>
      HttpResponse.json(
        { code: "over_email_send_rate_limit", msg: "email rate limit exceeded" },
        { status: 429, headers: { "x-supabase-api-version": "2024-01-01" } },
      ),
    ),

  // Response of the before-user-created hook for an email that is not invited.
  otpNotInvited: () =>
    http.post(`${SUPABASE_URL}/auth/v1/otp`, () =>
      HttpResponse.json(
        { code: 403, error_code: "unknown", msg: "This email address has not been invited." },
        { status: 403 },
      ),
    ),

  verifySucceeds: (email: string) =>
    http.post(`${SUPABASE_URL}/auth/v1/verify`, () =>
      HttpResponse.json({
        access_token: fakeJwt(USER_ID),
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "refresh-token",
        user: {
          id: USER_ID,
          aud: "authenticated",
          role: "authenticated",
          email,
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      }),
    ),

  verifyRejects: () =>
    http.post(`${SUPABASE_URL}/auth/v1/verify`, () =>
      HttpResponse.json(
        { code: "otp_expired", msg: "Token has expired or is invalid" },
        { status: 403, headers: { "x-supabase-api-version": "2024-01-01" } },
      ),
    ),
};
