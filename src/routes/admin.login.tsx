import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { unlockAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin · BLACK PIXAL" }, { name: "robots", content: "noindex" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const router = useRouter();
  const unlock = useServerFn(unlockAdmin);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await unlock({ data: { password: pw } });
    setBusy(false);
    if (res.ok) {
      await router.navigate({ to: "/admin" });
    } else {
      setErr(res.reason === "not_configured" ? "Admin password is not configured." : "Incorrect password.");
    }
  }

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card/80 p-8 backdrop-blur-xl">
        <div>
          <h1 className="font-display text-2xl text-foreground">Admin</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">Restricted area</p>
        </div>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          className="w-full rounded-md border border-border bg-input/60 px-4 py-3 text-foreground outline-none focus:border-primary"
        />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button
          type="submit"
          disabled={busy || !pw}
          className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium uppercase tracking-[0.25em] text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Verifying…" : "Enter"}
        </button>
      </form>
    </main>
  );
}
