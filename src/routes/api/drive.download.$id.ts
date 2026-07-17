import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/drive/download/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        // Authenticate the caller via Supabase before proxying any Drive file.
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const supabaseKey =
          process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          return new Response("Auth not configured", { status: 500 });
        }
        const sb = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userData.user?.email) {
          return new Response("Unauthorized", { status: 401 });
        }
        const allowed = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
        if (!allowed || userData.user.email.toLowerCase().trim() !== allowed) {
          return new Response("Forbidden", { status: 403 });
        }

        const lovableKey = process.env.LOVABLE_API_KEY;
        const driveKey = process.env.GOOGLE_DRIVE_API_KEY;
        if (!lovableKey || !driveKey) {
          return new Response("Drive not configured", { status: 500 });
        }
        const id = encodeURIComponent(params.id);
        const url = `https://connector-gateway.lovable.dev/google_drive/drive/v3/files/${id}?alt=media`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": driveKey,
          },
        });
        if (!res.ok) return new Response("Download failed", { status: res.status });
        const headers = new Headers();
        const ct = res.headers.get("content-type");
        if (ct) headers.set("content-type", ct);
        const cl = res.headers.get("content-length");
        if (cl) headers.set("content-length", cl);
        headers.set("content-disposition", `attachment`);
        return new Response(res.body, { status: 200, headers });
      },
    },
  },
});
