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
  listCategories,
  upsertCategory,
  deleteCategory,
  type PortfolioItem,
  type DisplayType,
} from "@/lib/portfolio.functions";
import { HOVER_EFFECTS } from "@/components/portfolio/PortfolioRenderer";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_CATEGORIES = [
  "High-End Retouch",
  "Logo Design",
  "Banner Design",
  "Pamphlet Design",
  "Social Media Designs",
  "AI Generated Images",
  "AI Generated Videos",
  "Color Correction",
  "Branding Projects",
  "Wedding Album",
];

const DISPLAY_TYPES: { value: DisplayType; label: string }[] = [
  { value: "image", label: "Single image" },
  { value: "gallery", label: "Image gallery / carousel" },
  { value: "before_after", label: "Before & after slider" },
  { value: "album", label: "3D flipbook album" },
  { value: "mockup", label: "Mockup showcase" },
  { value: "youtube", label: "YouTube / Vimeo embed" },
  { value: "video", label: "Uploaded video" },
  { value: "pdf", label: "PDF viewer" },
  { value: "gif", label: "Animated GIF" },
  { value: "html", label: "HTML embed" },
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
  const fetchCategories = useServerFn(listCategories);
  const saveCategory = useServerFn(upsertCategory);
  const removeCategory = useServerFn(deleteCategory);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-portfolio"],
    queryFn: () => fetchAll(),
  });

  const { data: categoryRows = [] } = useQuery({
    queryKey: ["portfolio-categories"],
    queryFn: () => fetchCategories(),
  });

  const categories = categoryRows.length ? categoryRows.map((c) => c.name) : FALLBACK_CATEGORIES;

  const [editing, setEditing] = useState<Partial<PortfolioItem> | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [showCategories, setShowCategories] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const multiInput = useRef<HTMLInputElement>(null);
  const slotInput = useRef<HTMLInputElement>(null);
  const slotKey = useRef<string>("before");
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-portfolio"] });
  const cfg = (editing?.config ?? {}) as Record<string, any>;
  const setCfg = (patch: Record<string, any>) =>
    setEditing((e) => ({ ...(e ?? {}), config: { ...((e?.config as any) ?? {}), ...patch } }));

  async function uploadOne(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await upload({ data: fd });
    return res.storageRef as string;
  }

  async function handleFileSelected(file: File) {
    setBusy(true);
    try {
      const ref = await uploadOne(file);
      const isVideo = file.type.startsWith("video/");
      setEditing((e) => ({
        ...(e ?? {}),
        media_url: ref,
        media_type: isVideo ? "video" : "image",
        display_type:
          e?.display_type && e.display_type !== "image"
            ? e.display_type
            : isVideo
              ? "video"
              : file.type === "image/gif"
                ? "gif"
                : file.type === "application/pdf"
                  ? "pdf"
                  : "image",
      }));
    } finally {
      setBusy(false);
    }
  }

  async function handleMultiSelected(files: FileList) {
    setBusy(true);
    try {
      const refs: string[] = [];
      for (const f of Array.from(files)) refs.push(await uploadOne(f));
      const key = editing?.display_type === "album" ? "pages" : "images";
      const existing: string[] = (cfg[key] as string[]) ?? [];
      setCfg({ [key]: [...existing, ...refs] });
      if (!editing?.media_url) setEditing((e) => ({ ...(e ?? {}), media_url: refs[0], media_type: "image" }));
    } finally {
      setBusy(false);
    }
  }

  async function handleSlotSelected(file: File) {
    setBusy(true);
    try {
      const ref = await uploadOne(file);
      setCfg({ [slotKey.current]: ref });
      if (!editing?.media_url) setEditing((e) => ({ ...(e ?? {}), media_url: ref, media_type: "image" }));
    } finally {
      setBusy(false);
    }
  }

  function pickSlot(key: string) {
    slotKey.current = key;
    slotInput.current?.click();
  }

  async function save() {
    if (!editing?.category) return;
    setBusy(true);
    try {
      await upsert({ data: editing as PortfolioItem });
      setEditing(null);
      refresh();
    } finally {
      setBusy(false);
    }
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

  const filtered =
    filter === "All"
      ? items
      : items.filter((i) => i.category === filter || (i.categories ?? []).includes(filter));

  const dt = (editing?.display_type ?? "image") as DisplayType;
  const listKey = dt === "album" ? "pages" : "images";
  const listValues: string[] = (cfg[listKey] as string[]) ?? [];

  return (
    <main className="relative z-10 min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">Portfolio CMS</h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Manage live work</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/sections" className="rounded-md border border-primary/60 bg-primary/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.25em] text-primary hover:bg-primary/20">☰ Sections</Link>
            <Link to="/admin/content" className="rounded-md border border-primary/60 bg-primary/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.25em] text-primary hover:bg-primary/20">✎ Site Content</Link>
            <Link to="/admin/ai" className="rounded-md bg-primary px-3 py-2 text-xs font-medium uppercase tracking-[0.25em] text-primary-foreground hover:opacity-90">✨ AI Studio</Link>
            <Link to="/" className="rounded-md border border-border px-3 py-2 text-xs uppercase tracking-[0.25em] hover:bg-card">View site</Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
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
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={() =>
              setEditing({
                category: categories[0],
                categories: [categories[0]],
                title: "",
                description: "",
                media_type: "image",
                display_type: "image",
                config: {},
                hover_effect: "zoom",
                featured: false,
                sort_order: items.length,
                published: true,
              })
            }
            className="rounded-md bg-primary px-4 py-2 text-xs font-medium uppercase tracking-[0.25em] text-primary-foreground hover:opacity-90"
          >
            + New item
          </button>
          <button
            onClick={() => setShowCategories((s) => !s)}
            className="rounded-md border border-border px-4 py-2 text-xs uppercase tracking-[0.25em] hover:bg-card"
          >
            Categories
          </button>
        </div>

        {showCategories && (
          <div className="mb-8 rounded-xl border border-border bg-card/60 p-4">
            <div className="mb-3 flex gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
                className="flex-1 rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
              />
              <button
                onClick={async () => {
                  if (!newCategory.trim()) return;
                  await saveCategory({ data: { name: newCategory, sort_order: categoryRows.length } });
                  setNewCategory("");
                  qc.invalidateQueries({ queryKey: ["portfolio-categories"] });
                }}
                className="rounded-md bg-primary px-4 py-2 text-xs uppercase tracking-[0.25em] text-primary-foreground"
              >
                Add
              </button>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {categoryRows.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                  <span>{c.name}</span>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete category "${c.name}"?`)) return;
                      await removeCategory({ data: { id: c.id } });
                      qc.invalidateQueries({ queryKey: ["portfolio-categories"] });
                    }}
                    className="text-[10px] uppercase tracking-[0.2em] text-destructive"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

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
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{it.category}</span>
                    <span className="rounded border border-border px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                      {it.display_type ?? "image"}
                    </span>
                  </div>
                  <div className="font-display text-lg">{it.title || "Untitled"}{it.featured ? " ★" : ""}</div>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
          <div className="my-8 w-full max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">{editing.id ? "Edit item" : "New item"}</h2>

            <label className="block text-xs uppercase tracking-[0.25em] text-muted-foreground">Display type</label>
            <select
              value={dt}
              onChange={(e) => setEditing({ ...editing, display_type: e.target.value as DisplayType })}
              className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
            >
              {DISPLAY_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>

            {/* Primary media / thumbnail */}
            <div
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileSelected(f);
              }}
              className="flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-black/30 text-sm text-muted-foreground hover:border-primary"
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
                "Drop cover media, or click to choose"
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,video/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelected(f);
              }}
            />
            <input
              ref={multiInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleMultiSelected(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={slotInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleSlotSelected(f);
                e.target.value = "";
              }}
            />

            {/* Per display-type configuration */}
            {(dt === "gallery" || dt === "mockup" || dt === "album") && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    {dt === "album" ? "Album pages" : "Gallery images"} ({listValues.length})
                  </span>
                  <button onClick={() => multiInput.current?.click()} className="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em]">
                    + Add images
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {listValues.map((src, i) => (
                    <div key={src + i} className="relative h-16 w-24 overflow-hidden rounded border border-border">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => setCfg({ [listKey]: listValues.filter((_, x) => x !== i) })}
                        className="absolute top-0 right-0 bg-black/70 px-1 text-[10px] text-destructive"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {dt === "album" && (
                  <div className="grid gap-2 pt-2 sm:grid-cols-2">
                    <button onClick={() => pickSlot("cover")} className="rounded border border-border px-2 py-2 text-[10px] uppercase tracking-[0.2em]">
                      {cfg.cover ? "Replace cover" : "Upload cover"}
                    </button>
                    <input
                      value={cfg.coverColor ?? "#141414"}
                      onChange={(e) => setCfg({ coverColor: e.target.value })}
                      placeholder="Cover colour"
                      className="rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
                    />
                    <label className="text-xs text-muted-foreground">
                      Page thickness
                      <input
                        type="number" step="0.002" min="0.004" max="0.05"
                        value={cfg.pageThickness ?? 0.012}
                        onChange={(e) => setCfg({ pageThickness: Number(e.target.value) })}
                        className="mt-1 w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Shadow intensity
                      <input
                        type="number" step="0.1" min="0" max="2"
                        value={cfg.shadowIntensity ?? 0.8}
                        onChange={(e) => setCfg({ shadowIntensity: Number(e.target.value) })}
                        className="mt-1 w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {dt === "before_after" && (
              <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="aspect-video overflow-hidden rounded bg-black/40">
                    {cfg.before ? <img src={cfg.before} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <button onClick={() => pickSlot("before")} className="w-full rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em]">Upload before</button>
                </div>
                <div className="space-y-2">
                  <div className="aspect-video overflow-hidden rounded bg-black/40">
                    {cfg.after ? <img src={cfg.after} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <button onClick={() => pickSlot("after")} className="w-full rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em]">Upload after</button>
                </div>
                <label className="sm:col-span-2 text-xs text-muted-foreground">
                  Default handle position (%)
                  <input
                    type="number" min="0" max="100"
                    value={cfg.start ?? 50}
                    onChange={(e) => setCfg({ start: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            )}

            {dt === "youtube" && (
              <input
                placeholder="YouTube or Vimeo URL"
                value={cfg.url ?? ""}
                onChange={(e) => setCfg({ url: e.target.value })}
                className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
              />
            )}

            {dt === "html" && (
              <textarea
                placeholder="HTML embed code (rendered sandboxed)"
                value={cfg.html ?? ""}
                onChange={(e) => setCfg({ html: e.target.value })}
                rows={5}
                className="w-full rounded-md border border-border bg-input/40 px-3 py-2 font-mono text-xs"
              />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={editing.category ?? ""}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
              >
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select
                value={editing.hover_effect ?? "zoom"}
                onChange={(e) => setEditing({ ...editing, hover_effect: e.target.value })}
                className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
              >
                {HOVER_EFFECTS.map((h) => <option key={h} value={h}>{h} hover</option>)}
              </select>
              <input
                type="text"
                placeholder="Client name"
                value={editing.client ?? ""}
                onChange={(e) => setEditing({ ...editing, client: e.target.value })}
                className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={editing.project_date ?? ""}
                onChange={(e) => setEditing({ ...editing, project_date: e.target.value })}
                className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
              />
            </div>

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

            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.published ?? true}
                  onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                />
                Published
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.featured ?? false}
                  onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                />
                Featured
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-xs uppercase tracking-[0.25em]">Cancel</button>
              <button
                onClick={save}
                disabled={busy || !editing.category}
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
