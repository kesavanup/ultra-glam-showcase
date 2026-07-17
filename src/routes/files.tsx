import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { listDriveDownloads, uploadToDrive, type DriveFile } from "@/lib/drive.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/files")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Files · BLACK PIXAL" },
      { name: "description", content: "Upload files securely to BLACK PIXAL or download shared assets." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user?.email) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: FilesPage,
});

function fmtSize(b?: string) {
  if (!b) return "—";
  const n = Number(b);
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

async function downloadWithAuth(f: DriveFile) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const res = await fetch(`/api/drive/download/${f.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function FilesPage() {
  const upload = useServerFn(uploadToDrive);
  const list = useServerFn(listDriveDownloads);

  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ["drive-files"],
    queryFn: () => list(),
  });

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [uploads, setUploads] = useState<{ name: string; status: "uploading" | "done" | "error"; error?: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    for (const f of arr) {
      const idx = uploads.length;
      setUploads((u) => [...u, { name: f.name, status: "uploading" }]);
      try {
        const fd = new FormData();
        fd.append("file", f);
        await upload({ data: fd });
        setUploads((u) => u.map((x, i) => (i === idx ? { ...x, status: "done" } : x)));
      } catch (e: any) {
        setUploads((u) => u.map((x, i) => (i === idx ? { ...x, status: "error", error: e?.message } : x)));
      }
    }
    refetch();
  }

  const filtered = files.filter((f: DriveFile) => {
    const okSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    const okType =
      filterType === "all" ||
      (filterType === "image" && f.mimeType.startsWith("image/")) ||
      (filterType === "video" && f.mimeType.startsWith("video/")) ||
      (filterType === "doc" && (f.mimeType.includes("pdf") || f.mimeType.includes("document") || f.mimeType.includes("sheet")));
    return okSearch && okType;
  });

  return (
    <main className="relative z-10 min-h-screen bg-background px-6 py-24 text-foreground">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl">Files</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">Upload reference material or download shared assets.</p>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Upload</h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`mt-4 flex aspect-[4/1] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
              dragOver ? "border-primary bg-primary/10" : "border-border bg-card/40"
            }`}
          >
            <p className="text-sm">Drop files here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">Images, video, or PDF · up to 50 MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/mp4,video/webm,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
          {uploads.length > 0 && (
            <ul className="mt-4 space-y-2">
              {uploads.map((u, i) => (
                <li key={i} className="flex items-center justify-between rounded-md border border-border bg-card/40 px-3 py-2 text-sm">
                  <span className="truncate">{u.name}</span>
                  <span className={`text-xs uppercase tracking-[0.2em] ${
                    u.status === "done" ? "text-emerald-400" : u.status === "error" ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {u.status === "uploading" ? "Uploading…" : u.status === "done" ? "Uploaded" : "Failed"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl">Download</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files…"
              className="flex-1 min-w-[200px] rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
            >
              <option value="all">All categories</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="doc">Documents</option>
            </select>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card/60 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Size</th>
                  <th className="px-4 py-3 hidden md:table-cell">Modified</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-muted-foreground">No files.</td></tr>
                ) : (
                  filtered.map((f: DriveFile) => (
                    <tr key={f.id} className="border-t border-border">
                      <td className="px-4 py-3 truncate max-w-[280px]">{f.name}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">{fmtSize(f.size)}</td>
                      <td className="px-4 py-3 hidden md:table-cell">{f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => downloadWithAuth(f).catch((e) => alert(e?.message ?? "Download failed"))}
                          className="inline-flex rounded-md border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] hover:bg-card"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
