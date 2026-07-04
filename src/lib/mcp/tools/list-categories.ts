import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "list_categories",
  title: "List portfolio categories",
  description: "List distinct categories that currently have published portfolio items.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
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
    const { data, error } = await sb
      .from("portfolio_items")
      .select("category")
      .eq("published", true);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const categories = Array.from(new Set((data ?? []).map((r: any) => r.category))).sort();
    return {
      content: [{ type: "text", text: JSON.stringify(categories, null, 2) }],
      structuredContent: { categories },
    };
  },
});
