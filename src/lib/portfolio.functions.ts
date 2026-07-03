import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminEmail } from "./admin-auth";

export type PortfolioItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  media_url: string;
  media_type: "image" | "video";
  thumbnail_url: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

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

async function signMediaWith(sb: any, item: any): Promise<PortfolioItem> {
  const version = encodeURIComponent(item.updated_at ?? item.created_at ?? String(Date.now()));
  const bust = (u: string | null): string | null =>
    u ? u + (u.includes("?") ? "&" : "?") + "v=" + version : null;
  const signOne = async (raw: string | null): Promise<string | null> => {
    if (!raw) return null;
    if (!raw.startsWith("storage:")) return bust(raw);
    const path = raw.slice("storage:".length);
    const { data } = await sb.storage.from("portfolio").createSignedUrl(path, 60 * 60 * 24 * 7);
    return bust(data?.signedUrl ?? null);
  };
  return {
    ...(item as PortfolioItem),
    media_url: (await signOne(item.media_url)) ?? "",
    thumbnail_url: await signOne(item.thumbnail_url),
  };
}

export const listPortfolio = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await publicClient();
  const { data, error } = await sb
    .from("portfolio_items")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map((row: any) => signMediaWith(sb, row)));
});


export const listAllPortfolio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdminEmail(context.claims as any);
    const sb = await admin();
    const { data, error } = await sb
      .from("portfolio_items")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return Promise.all((data ?? []).map((row: any) => signMediaWith(sb, row)));
  });

export const uploadPortfolioMedia = createServerFn({ method: "POST" })
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
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = new Uint8Array(await file.arrayBuffer());
    const { error } = await sb.storage.from("portfolio").upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw error;
    return { storageRef: `storage:${path}`, size: file.size, contentType: file.type };
  });

export const upsertPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<PortfolioItem> & { id?: string }) => d)
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const sb = await admin();
    const payload: any = {
      category: data.category,
      title: data.title ?? "",
      description: data.description ?? "",
      media_url: data.media_url,
      media_type: data.media_type ?? "image",
      thumbnail_url: data.thumbnail_url ?? null,
      sort_order: data.sort_order ?? 0,
      published: data.published ?? true,
    };
    if (data.id) {
      const { error } = await sb.from("portfolio_items").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb.from("portfolio_items").insert(payload).select("id").single();
    if (error) throw error;
    return { id: row!.id };
  });

export const deletePortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const sb = await admin();
    const { error } = await sb.from("portfolio_items").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const reorderPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { items: { id: string; sort_order: number }[] }) => d)
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const sb = await admin();
    await Promise.all(
      data.items.map((i) =>
        sb.from("portfolio_items").update({ sort_order: i.sort_order }).eq("id", i.id),
      ),
    );
    return { ok: true };
  });
