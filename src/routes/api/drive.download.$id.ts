import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/drive/download/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
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
