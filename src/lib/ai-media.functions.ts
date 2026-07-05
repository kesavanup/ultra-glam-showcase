import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminEmail } from "./admin-auth";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function uploadBytesToPortfolio(bytes: Uint8Array, contentType: string, ext: string) {
  const sb = await admin();
  const path = `ai/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from("portfolio").upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return `storage:${path}`;
}

async function insertPortfolio(row: {
  category: string;
  title: string;
  description: string;
  media_url: string;
  media_type: "image" | "video";
}) {
  const sb = await admin();
  const { data, error } = await sb
    .from("portfolio_items")
    .insert({
      category: row.category,
      title: row.title,
      description: row.description,
      media_url: row.media_url,
      media_type: row.media_type,
      sort_order: 0,
      published: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data!.id as string;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function callImageGateway(body: unknown): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(`${GATEWAY}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit reached. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
    throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
  }
  const json: any = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("AI returned no image");
  return b64;
}

// Returns a base64 PNG without publishing. Client shows it as a preview
// and then calls uploadAndPublish with the converted file if user confirms.
export const aiPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: FormData) => {
    if (!(d instanceof FormData)) throw new Error("FormData required");
    return d;
  })
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const prompt = String(data.get("prompt") ?? "").trim();
    if (!prompt) throw new Error("Prompt required");
    const ref = data.get("reference") as File | null;

    const content: any[] = [{ type: "text", text: prompt }];
    if (ref && ref.size > 0) {
      const buf = new Uint8Array(await ref.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const dataUrl = `data:${ref.type || "image/png"};base64,${btoa(bin)}`;
      content.push({ type: "image_url", image_url: { url: dataUrl } });
    }

    const b64 = await callImageGateway({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    });
    return { b64, contentType: "image/png" };
  });

export const aiGenerateAndPublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prompt: string; category: string; title?: string; description?: string }) => {
    if (!d?.prompt?.trim()) throw new Error("Prompt required");
    if (!d?.category?.trim()) throw new Error("Category required");
    return d;
  })
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const b64 = await callImageGateway({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: data.prompt }],
      modalities: ["image", "text"],
    });
    const ref = await uploadBytesToPortfolio(b64ToBytes(b64), "image/png", "png");
    const id = await insertPortfolio({
      category: data.category,
      title: data.title ?? "",
      description: data.description ?? data.prompt.slice(0, 200),
      media_url: ref,
      media_type: "image",
    });
    return { id };
  });

export const aiEditAndPublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: FormData) => {
    if (!(d instanceof FormData)) throw new Error("FormData required");
    return d;
  })
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const file = data.get("file") as File | null;
    const prompt = String(data.get("prompt") ?? "").trim();
    const category = String(data.get("category") ?? "").trim();
    const title = String(data.get("title") ?? "");
    const description = String(data.get("description") ?? "");
    if (!file) throw new Error("Image required");
    if (!prompt) throw new Error("Prompt required");
    if (!category) throw new Error("Category required");

    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const inputB64 = btoa(bin);
    const dataUrl = `data:${file.type || "image/png"};base64,${inputB64}`;

    const b64 = await callImageGateway({
      model: "google/gemini-2.5-flash-image",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      modalities: ["image", "text"],
    });
    const ref = await uploadBytesToPortfolio(b64ToBytes(b64), "image/png", "png");
    const id = await insertPortfolio({
      category,
      title,
      description: description || prompt.slice(0, 200),
      media_url: ref,
      media_type: "image",
    });
    return { id };
  });

export const uploadAndPublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: FormData) => {
    if (!(d instanceof FormData)) throw new Error("FormData required");
    return d;
  })
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const file = data.get("file") as File | null;
    const category = String(data.get("category") ?? "").trim();
    const title = String(data.get("title") ?? "");
    const description = String(data.get("description") ?? "");
    if (!file) throw new Error("File required");
    if (!category) throw new Error("Category required");
    const isVideo = (file.type || "").startsWith("video/");
    const ext = (file.name.split(".").pop() ?? (isVideo ? "mp4" : "png")).toLowerCase();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ref = await uploadBytesToPortfolio(bytes, file.type || "application/octet-stream", ext);
    const id = await insertPortfolio({
      category,
      title,
      description,
      media_url: ref,
      media_type: isVideo ? "video" : "image",
    });
    return { id };
  });
