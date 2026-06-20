import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Mirrors the shape the app consumed from Better Auth: useSession() returns
// { data: session | null, isPending }, where session.user has name/email.
export interface AppSession {
  user: { id: string; name: string; email: string };
}

function toAppSession(session: Session | null): AppSession | null {
  const u = session?.user;
  if (!u) return null;
  const name =
    (u.user_metadata?.display_name as string | undefined) ?? u.email ?? "User";
  return { user: { id: u.id, name, email: u.email ?? "" } };
}

export function useSession() {
  const [data, setData] = useState<AppSession | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setData(toAppSession(data.session));
      setIsPending(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setData(toAppSession(session));
      setIsPending(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { data, isPending };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signUp(
  email: string,
  password: string,
  displayName?: string,
) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName ?? email } },
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await supabase.auth.signOut();
}
