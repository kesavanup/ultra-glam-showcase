import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminEmail } from "./admin-auth";

export type PageSection = {
  id: string;
  page: string;
  section_type: string;
  title: string;
  data: Record<string, any>;
  sort_order: number;
  visible: boolean;
};

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  if (!url || !key) throw new Error("Supabase env vars missing on server");
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const listSections = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await publicClient();
  const { data, error } = await sb
    .from("page_sections")
    .select("id, page, section_type, title, data, sort_order, visible")
    .eq("page", "home")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PageSection[];
});

export const listAllSections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdminEmail(context.claims as any);
    const sb = await adminClient();
    const { data, error } = await sb
      .from("page_sections")
      .select("id, page, section_type, title, data, sort_order, visible")
      .order("page", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PageSection[];
  });

export const upsertSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<PageSection> & { id?: string }) => {
    if (!d?.section_type) throw new Error("section_type required");
    return d;
  })
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const sb = await adminClient();
    const payload: any = {
      page: data.page ?? "home",
      section_type: data.section_type,
      title: data.title ?? "",
      data: data.data ?? {},
      sort_order: data.sort_order ?? 0,
      visible: data.visible ?? true,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await sb.from("page_sections").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb
      .from("page_sections")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return { id: row!.id };
  });

export const deleteSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const sb = await adminClient();
    const { error } = await sb.from("page_sections").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const reorderSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { items: { id: string; sort_order: number }[] }) => d)
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const sb = await adminClient();
    await Promise.all(
      data.items.map((i) =>
        sb.from("page_sections").update({ sort_order: i.sort_order }).eq("id", i.id),
      ),
    );
    return { ok: true };
  });
