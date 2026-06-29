import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";


const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? "dot3up@gmail.com").toLowerCase();

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin · BLACK PIXAL" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If a session already exists for the admin email, jump straight in.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email?.toLowerCase();
      if (email === ADMIN_EMAIL) {
        await router.navigate({ to: "/admin" });
      } else if (data.user) {
        // signed in as the wrong account
        setErr(`Signed in as ${data.user.email}. Sign out and use the admin Google account.`);
      }
    })();
  }, [router]);

  async function signInGoogle() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/admin/login",
        queryParams: { prompt: "select_account", login_hint: ADMIN_EMAIL },
      },
    });
    if (error) {
      setErr(error.message ?? "Sign-in failed");
      setBusy(false);
    }
    // Browser will redirect to Google; on return the useEffect above verifies and routes.
  }

  async function signOut() {
    await supabase.auth.signOut();
    setErr(null);
  }

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card/80 p-8 backdrop-blur-xl">
        <div>
          <h1 className="font-display text-2xl text-foreground">Admin</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Restricted — Google sign-in
          </p>
        </div>

        <button
          onClick={signInGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-md bg-primary px-4 py-3 text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.5 6.5 28.9 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.3-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.5 6.5 28.9 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13.1-5.1l-6-5.1c-2 1.4-4.5 2.2-7.1 2.2-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.2 5.5l6 5.1c-.4.4 6.4-4.6 6.4-14.6 0-1.2-.1-2.4-.3-3.5z"/>
          </svg>
          {busy ? "Signing in…" : "Sign in with Google"}
        </button>

        {err && (
          <div className="space-y-2">
            <p className="text-xs text-destructive">{err}</p>
            <button
              onClick={signOut}
              className="w-full rounded-md border border-border px-3 py-2 text-[11px] uppercase tracking-[0.25em] hover:bg-background"
            >
              Sign out current account
            </button>
          </div>
        )}

        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Only the authorized admin Gmail can access this area.
        </p>
      </div>
    </main>
  );
}
