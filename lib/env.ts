// NEXT_PUBLIC_* variables must be referenced literally so Next.js can inline them in the client bundle.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

export function getSupabaseEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl),
    publishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", supabasePublishableKey),
  };
}
