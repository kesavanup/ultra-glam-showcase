/**
 * Browser-native CMS data layer.
 *
 * Every read and write here goes straight from the browser to the database,
 * secured by row-level rules (`public.is_admin()`), so the admin panel works
 * identically in Lovable preview, on the Lovable-published URL and on any
 * external host (Vercel/GitHub) — no server runtime required.
 */
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ types */

export type DisplayType =
  | "image"
  | "gallery"
  | "before_after"
  | "album"
  | "mockup"
  | "youtube"
  | "video"
  | "pdf"
  | "gif"
  | "html";

export type PortfolioItem = {
  id: string;
  category: string;
  categories: string[];
  title: string;
  description: string;
  media_url: string;
  media_type: "image" | "video";
  thumbnail_url: string | null;
  display_type: DisplayType;
  config: Record<string, any>;
  hover_effect: string;
  featured: boolean;
  client: string | null;
  project_date: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type PortfolioCategory = { id: string; name: string; slug: string; sort_order: number };

export type PageSection = {
  id: string;
  page: string;
  section_type: string;
  title: string;
  data: Record<string, any>;
  sort_order: number;
  visible: boolean;
};

export type SiteContentMap = Record<string, string>;

/**
 * Identity passthrough so existing call sites keep their shape after moving
 * off server functions. Not a real hook — it just returns the function.
 */
export const useServerFn = <T,>(fn: T): T => fn;

/* -------------------------------------------------------------- media refs */

const BUCKET = "portfolio";
const SIGN_TTL = 60 * 60 * 24 * 7;

const signCache = new Map<string, string>();

async function signOne(raw: string | null | undefined, version?: string): Promise<string | null> {
  if (!raw) return null;
  const bust = (u: string) =>
    version ? u + (u.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(version) : u;
  if (!raw.startsWith("storage:")) return bust(raw);
  const path = raw.slice("storage:".length);
  const cached = signCache.get(path);
  if (cached) return bust(cached);
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL);
  if (!data?.signedUrl) return null;
  signCache.set(path, data.signedUrl);
  return bust(data.signedUrl);
}

async function signDeep(value: any, version?: string): Promise<any> {
  if (typeof value === "string")
    return value.startsWith("storage:") ? ((await signOne(value, version)) ?? "") : value;
  if (Array.isArray(value)) return Promise.all(value.map((v) => signDeep(v, version)));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await signDeep(v, version);
    return out;
  }
  return value;
}

/** Signed URLs expire — convert them back to durable `storage:` refs on save. */
function toRef(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.match(/\/object\/sign\/portfolio\/([^?]+)/);
  if (m) return `storage:${decodeURIComponent(m[1])}`;
  return value.replace(/([?&])v=[^&]*/g, "$1").replace(/[?&]$/, "");
}

function derefDeep(value: any): any {
  if (typeof value === "string") return toRef(value) ?? "";
  if (Array.isArray(value)) return value.map(derefDeep);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = derefDeep(v);
    return out;
  }
  return value;
}

async function hydrate(row: any): Promise<PortfolioItem> {
  const version = row.updated_at ?? row.created_at ?? "";
  return {
    ...(row as PortfolioItem),
    categories: row.categories?.length ? row.categories : [row.category].filter(Boolean),
    display_type: (row.display_type ?? "image") as DisplayType,
    config: await signDeep(row.config ?? {}, version),
    media_url: (await signOne(row.media_url, version)) ?? "",
    thumbnail_url: await signOne(row.thumbnail_url, version),
  };
}

async function uploadFile(file: File, prefix = ""): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return `storage:${path}`;
}

/* --------------------------------------------------------------- portfolio */

export async function listPortfolio(): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(hydrate));
}

export async function listAllPortfolio(): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return Promise.all((data ?? []).map(hydrate));
}

export async function uploadPortfolioMedia(arg: { data: FormData }) {
  const file = arg.data.get("file") as File | null;
  if (!file) throw new Error("No file");
  return { storageRef: await uploadFile(file), size: file.size, contentType: file.type };
}

export async function upsertPortfolio(arg: { data: Partial<PortfolioItem> & { id?: string } }) {
  const d = arg.data;
  const payload: any = {
    category: d.category,
    categories: d.categories?.length ? d.categories : [d.category].filter(Boolean),
    title: d.title ?? "",
    description: d.description ?? "",
    media_url: toRef(d.media_url),
    media_type: d.media_type ?? "image",
    thumbnail_url: toRef(d.thumbnail_url) ?? null,
    display_type: d.display_type ?? "image",
    config: derefDeep(d.config ?? {}),
    hover_effect: d.hover_effect ?? "zoom",
    featured: d.featured ?? false,
    client: d.client ?? null,
    project_date: d.project_date || null,
    sort_order: d.sort_order ?? 0,
    published: d.published ?? true,
  };
  if (d.id) {
    const { error } = await supabase.from("portfolio_items").update(payload).eq("id", d.id);
    if (error) throw error;
    return { id: d.id };
  }
  const { data: row, error } = await supabase
    .from("portfolio_items")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return { id: row!.id };
}

export async function deletePortfolio(arg: { data: { id: string } }) {
  const { error } = await supabase.from("portfolio_items").delete().eq("id", arg.data.id);
  if (error) throw error;
  return { ok: true };
}

export async function reorderPortfolio(arg: { data: { items: { id: string; sort_order: number }[] } }) {
  await Promise.all(
    arg.data.items.map((i) =>
      supabase.from("portfolio_items").update({ sort_order: i.sort_order }).eq("id", i.id),
    ),
  );
  return { ok: true };
}

/* -------------------------------------------------------------- categories */

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function listCategories(): Promise<PortfolioCategory[]> {
  const { data, error } = await supabase
    .from("portfolio_categories")
    .select("id, name, slug, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PortfolioCategory[];
}

export async function upsertCategory(arg: {
  data: { id?: string; name: string; sort_order?: number };
}) {
  const d = arg.data;
  if (!d?.name?.trim()) throw new Error("Name required");
  const payload = { name: d.name.trim(), slug: slugify(d.name), sort_order: d.sort_order ?? 0 };
  if (d.id) {
    const { error } = await supabase.from("portfolio_categories").update(payload).eq("id", d.id);
    if (error) throw error;
    return { id: d.id };
  }
  const { data: row, error } = await supabase
    .from("portfolio_categories")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return { id: row!.id };
}

export async function deleteCategory(arg: { data: { id: string } }) {
  const { error } = await supabase.from("portfolio_categories").delete().eq("id", arg.data.id);
  if (error) throw error;
  return { ok: true };
}

/* ---------------------------------------------------------------- sections */

const SECTION_COLS = "id, page, section_type, title, data, sort_order, visible";

export async function listSections(): Promise<PageSection[]> {
  const { data, error } = await supabase
    .from("page_sections")
    .select(SECTION_COLS)
    .eq("page", "home")
    .eq("visible", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return await Promise.all(
    ((data ?? []) as PageSection[]).map(async (s) => ({ ...s, data: await signDeep(s.data ?? {}) })),
  );
}

export async function listAllSections(): Promise<PageSection[]> {
  const { data, error } = await supabase
    .from("page_sections")
    .select(SECTION_COLS)
    .order("page", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return await Promise.all(
    ((data ?? []) as PageSection[]).map(async (s) => ({ ...s, data: await signDeep(s.data ?? {}) })),
  );
}

export async function upsertSection(arg: { data: Partial<PageSection> & { id?: string } }) {
  const d = arg.data;
  if (!d?.section_type) throw new Error("section_type required");
  const payload: any = {
    page: d.page ?? "home",
    section_type: d.section_type,
    title: d.title ?? "",
    data: derefDeep(d.data ?? {}),
    sort_order: d.sort_order ?? 0,
    visible: d.visible ?? true,
    updated_at: new Date().toISOString(),
  };
  if (d.id) {
    const { error } = await supabase.from("page_sections").update(payload).eq("id", d.id);
    if (error) throw error;
    return { id: d.id };
  }
  const { data: row, error } = await supabase
    .from("page_sections")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return { id: row!.id };
}

export async function deleteSection(arg: { data: { id: string } }) {
  const { error } = await supabase.from("page_sections").delete().eq("id", arg.data.id);
  if (error) throw error;
  return { ok: true };
}

export async function reorderSections(arg: { data: { items: { id: string; sort_order: number }[] } }) {
  await Promise.all(
    arg.data.items.map((i) =>
      supabase.from("page_sections").update({ sort_order: i.sort_order }).eq("id", i.id),
    ),
  );
  return { ok: true };
}

/* ------------------------------------------------------------ site content */

export async function listSiteContent(): Promise<SiteContentMap> {
  const { data, error } = await supabase.from("site_content").select("key, value");
  if (error) throw error;
  const out: SiteContentMap = {};
  for (const row of data ?? []) {
    const v = (row.value ?? "") as string;
    out[row.key as string] = v.startsWith("storage:") ? ((await signOne(v)) ?? "") : v;
  }
  return out;
}

export async function upsertSiteContent(arg: { data: { entries: { key: string; value: string }[] } }) {
  const rows = arg.data.entries.map((e) => ({ key: e.key, value: toRef(e.value) ?? "" }));
  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
  if (error) throw error;
  return { ok: true };
}

export async function uploadSiteImage(arg: { data: FormData }) {
  const file = arg.data.get("file") as File | null;
  if (!file) throw new Error("No file");
  return { storageRef: await uploadFile(file, "site/") };
}

/* ------------------------------------------------------------------- admin */

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return Boolean(data);
}
