import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminEmail } from "./admin-auth";

const GW = "https://connector-gateway.lovable.dev/google_drive";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
];

function authHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const driveKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lovableKey || !driveKey) throw new Error("Drive connector not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": driveKey,
  };
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
};

export const listDriveDownloads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdminEmail(context.claims as any);
    const folder = process.env.DRIVE_DOWNLOAD_FOLDER_ID;
    if (!folder) return [] as DriveFile[];
    const q = encodeURIComponent(`'${folder}' in parents and trashed=false`);
    const fields = encodeURIComponent("files(id,name,mimeType,size,modifiedTime)");
    const url = `${GW}/drive/v3/files?q=${q}&fields=${fields}&pageSize=200&orderBy=modifiedTime desc`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Drive list failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { files?: DriveFile[] };
    return json.files ?? [];
  });

export const uploadToDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: FormData) => {
    if (!(d instanceof FormData)) throw new Error("FormData required");
    return d;
  })
  .handler(async ({ data, context }) => {
    assertAdminEmail(context.claims as any);
    const folder = process.env.DRIVE_UPLOAD_FOLDER_ID;
    if (!folder) throw new Error("DRIVE_UPLOAD_FOLDER_ID not set");
    const file = data.get("file") as File | null;
    if (!file) throw new Error("No file");

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`File too large. Max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
    }
    const mime = (file.type || "").toLowerCase();
    if (!ALLOWED_MIME.includes(mime)) {
      throw new Error(`File type not allowed: ${mime || "unknown"}`);
    }

    const metadata = {
      name: file.name,
      parents: [folder],
    };
    const boundary = "bp" + Math.random().toString(36).slice(2);
    const delimiter = `--${boundary}`;
    const closeDelim = `--${boundary}--`;
    const buf = new Uint8Array(await file.arrayBuffer());
    const head =
      `${delimiter}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n${delimiter}\r\n` +
      `Content-Type: ${mime}\r\n\r\n`;
    const tail = `\r\n${closeDelim}`;
    const headBytes = new TextEncoder().encode(head);
    const tailBytes = new TextEncoder().encode(tail);
    const body = new Uint8Array(headBytes.length + buf.length + tailBytes.length);
    body.set(headBytes, 0);
    body.set(buf, headBytes.length);
    body.set(tailBytes, headBytes.length + buf.length);

    const res = await fetch(`${GW}/upload/drive/v3/files?uploadType=multipart`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!res.ok) throw new Error(`Drive upload failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as { id: string; name: string };
  });
