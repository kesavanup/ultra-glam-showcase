import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  listAllPortfolio,
  upsertPortfolio,
  deletePortfolio,
  uploadPortfolioMedia,
  reorderPortfolio,
  type PortfolioItem,
} from "@/lib/portfolio.functions";
import { lockAdmin } from "@/lib/admin.functions";

const CATEGORIES = [
  "High-End Retouch",
  "Logo Design",
  "Banner Design",
  "Pamphlet Design",
  "Social Media Designs",
  "AI Generated Images",
  "AI Generated Videos",
  "Color Correction",
  "Branding Projects",
];

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard · BLACK PIXAL" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAllPortfolio);
  const upsert = useServerFn(upsertPortfolio);
  const remove = useServerFn(deletePortfolio);
  const upload = useServerFn(uploadPortfolioMedia);
  const reorder = useServerFn(reorderPortfolio);
  const lock = useServerFn(lockAdmin);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-portfolio"],
    queryFn: () => fetchAll(),
  });

  const [editing, setEditing] = useState<Partial<PortfolioItem> | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-portfolio"] });

  async function handleFileSelected(file: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await upload({ data: fd });
    setBusy(false);
    const isVideo = file.type.startsWith("video/");
    setEditing({
      ...(editing ?? {}),
      media_url: res.storageRef,
      media_type: isVideo ? "video" : "image",
    });
  }

  async function save() {
    if (!editing?.media_url || !editing.category) return;
    setBusy(true);
    await upsert({ data: editing as PortfolioItem });
    setBusy(false);
    setEditing(null);
    refresh();
  }

  async function del(id: string) {
    if (!confirm("Delete this item?")) return;
    await remove({ data: { id } });
    refresh();
  }

  async function move(id: string, dir: -1 | 1) {
    const list = [...items];
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await reorder({ data: { items: list.map((it, idx) => ({ id: it.id, sort_order: idx })) } });
    refresh();
  }

  const filtered = filter === "All" ? items : items.filter((i) => i.category === filter);

  return (
    <main className="relative z-10 min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">Portfolio CMS</h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Manage live work</p>
          </div>
          <div className="flex gap-3">
            <Link to="/" className="rounded-md border border-border px-3 py-2 text-xs uppercase tracking-[0.25em] hover:bg-card">View site</Link>
            <button
              onClick={async () => {
                await lock();
                await router.navigate({ to: "/admin/login" });
              }}
              className="rounded-md border border-border px-3 py-2 text-xs uppercase tracking-[0.25em] hover:bg-card"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
          >
            <option>All</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={() => setEditing({ category: CATEGORIES[0], title: "", description: "", media_type: "image", sort_order: items.length, published: true })}
            className="rounded-md bg-primary px-4 py-2 text-xs font-medium uppercase tracking-[0.25em] text-primary-foreground hover:opacity-90"
          >
            + New item
          </button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((it) => (
              <div key={it.id} className="overflow-hidden rounded-xl border border-border bg-card/60">
                <div className="aspect-video bg-black/40">
                  {it.media_type === "video" ? (
                    <video src={it.media_url} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <img src={it.thumbnail_url ?? it.media_url} alt={it.title} className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{it.category}</div>
                  <div className="font-display text-lg">{it.title || "Untitled"}</div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{it.description}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button onClick={() => setEditing(it)} className="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em] hover:bg-background">Edit</button>
                    <button onClick={() => move(it.id, -1)} className="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em] hover:bg-background">↑</button>
                    <button onClick={() => move(it.id, 1)} className="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em] hover:bg-background">↓</button>
                    <button onClick={() => del(it.id)} className="rounded border border-destructive/40 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-destructive hover:bg-destructive/10">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">No items yet.</p>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">{editing.id ? "Edit item" : "New item"}</h2>

            <div
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileSelected(f);
              }}
              className="flex aspect-video cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-black/30 text-sm text-muted-foreground hover:border-primary"
            >
              {editing.media_url ? (
                editing.media_type === "video" ? (
                  <video src={editing.media_url} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img src={editing.media_url} alt="" className="h-full w-full object-cover" />
                )
              ) : busy ? (
                "Uploading…"
              ) : (
                "Drop image or video, or click to choose"
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelected(f);
              }}
            />

            <select
              value={editing.category ?? ""}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input
              type="text"
              placeholder="Title"
              value={editing.title ?? ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              className="w-full rounded-md border border-border bg-input/40 px-3 py-2"
            />
            <textarea
              placeholder="Description"
              value={editing.description ?? ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-border bg-input/40 px-3 py-2"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.published ?? true}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              Published
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-xs uppercase tracking-[0.25em]">Cancel</button>
              <button
                onClick={save}
                disabled={busy || !editing.media_url || !editing.category}
                className="rounded-md bg-primary px-4 py-2 text-xs font-medium uppercase tracking-[0.25em] text-primary-foreground disabled:opacity-40"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
