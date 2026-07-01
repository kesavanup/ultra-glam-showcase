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
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const e = data.user?.email?.toLowerCase();
      if (e === ADMIN_EMAIL) await router.navigate({ to: "/admin" });
    })();
  }, [router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setInfo(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      setErr("This account is not authorized.");
      return;
    }
    await router.navigate({ to: "/admin" });
  }

  async function createAccount() {
    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      setErr(`Only ${ADMIN_EMAIL} can be created here.`);
      return;
    }
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setBusy(true); setErr(null); setInfo(null);
    const { error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setInfo("Account created. You can now sign in.");
  }

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={signIn} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card/80 p-8 backdrop-blur-xl">
        <div>
          <h1 className="font-display text-2xl text-foreground">Admin</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">Sign in</p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
            required
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <button
          type="button"
          onClick={createAccount}
          disabled={busy}
          className="w-full rounded-md border border-border px-4 py-2 text-[11px] uppercase tracking-[0.25em] hover:bg-background disabled:opacity-40"
        >
          First time? Create admin account
        </button>

        {err && <p className="text-xs text-destructive">{err}</p>}
        {info && <p className="text-xs text-emerald-400">{info}</p>}

        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Only {ADMIN_EMAIL} can access this area.
        </p>
      </form>
    </main>
  );
}
