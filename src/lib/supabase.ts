import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Surfaced early so a missing .env is obvious during dev.
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — set them in .env",
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Current user id, for inserts whose RLS WITH CHECK requires user_id = auth.uid().
// getSession() refreshes a stale token without the extra round trip getUser()
// costs; the id needn't be authentic client-side since RLS re-checks it.
export async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}

// "The token we sent isn't accepted" — as opposed to a real data error.
const AUTH_ERROR_RE =
  /jwt|token is expired|bad_jwt|invalid claim|PGRST301|Not authenticated|Auth session missing/i;

export function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return AUTH_ERROR_RE.test(msg);
}

// Force a token refresh; false means the session is dead (supabase-js then emits
// SIGNED_OUT and the router bounces to /login). Concurrent callers are deduped.
export async function refreshAuthSession(): Promise<boolean> {
  const { data, error } = await supabase.auth.refreshSession();
  return !error && !!data.session;
}
