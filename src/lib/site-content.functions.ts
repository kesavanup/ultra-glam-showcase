import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminEmail } from "./admin-auth";

export type SiteContentMap = Record<string, string>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  if (!url || !key) throw new Error("Supabase env vars missing on server");
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function signOne(sb: any, raw: string | null): Promise<string | null> {
  if (!raw) return null;
  if (!raw.startsWith("storage:")) return raw;
  const path = raw.slice("storage:".length);
  const { data } = await sb.storage.from("portfolio").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export const listSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await publicClient();
  const { data, error } = await sb.from("site_content").select("key, value");
  if (error) throw error;
  const out: SiteContentMap = {};
  for (const row of data ?? []) {
    const v = row.value as string;
    // Sign storage: refs so images resolve in the browser.
    out[row.key as string] = v.startsWith("storage:")
      ? ((await signOne(sb, v)) ?? "")
      : v;
  }
  return out;
});

export const upsertSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { entries: { key: string; value: string }[] }) => {
    if (!Array.isArray(d?.entries)) throw new Error("entries required");
    return d;
  })
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const sb = await admin();
    const rows = data.entries.map((e) => ({ key: e.key, value: e.value }));
    const { error } = await sb.from("site_content").upsert(rows, { onConflict: "key" });
    if (error) throw error;
    return { ok: true };
  });

export const uploadSiteImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: FormData) => {
    if (!(d instanceof FormData)) throw new Error("FormData required");
    return d;
  })
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const file = data.get("file") as File | null;
    if (!file) throw new Error("No file");
    const sb = await admin();
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
    const path = `site/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = new Uint8Array(await file.arrayBuffer());
    const { error } = await sb.storage.from("portfolio").upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw error;
    return { storageRef: `storage:${path}` };
  });
