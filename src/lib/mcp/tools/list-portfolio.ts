import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "list_portfolio",
  title: "List portfolio items",
  description:
    "List published BLACK PIXAL portfolio items (title, description, category, media URL, type). Optionally filter by category.",
  inputSchema: {
    category: z
      .string()
      .optional()
      .describe("Optional category name to filter by, e.g. 'Logo Design'."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max items to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, limit }) => {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const key =
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return {
        content: [{ type: "text", text: "Supabase env vars not configured on server." }],
        isError: true,
      };
    }
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = sb
      .from("portfolio_items")
      .select("id,category,title,description,media_url,media_type,thumbnail_url,created_at")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const items = (data ?? []).map((r: any) => {
      const raw = r.media_url as string | null;
      const media = raw?.startsWith("storage:")
        ? `${url}/storage/v1/object/public/portfolio/${raw.slice("storage:".length)}`
        : raw;
      return { ...r, media_url: media };
    });
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { items },
    };
  },
});
