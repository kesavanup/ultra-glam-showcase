import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@/lib/cms";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listAllSections,
  upsertSection,
  deleteSection,
  reorderSections,
  type PageSection,
} from "@/lib/cms";

const SECTION_TYPES = [
  "hero",
  "marquee",
  "services",
  "work",
  "before_after",
  "films",
  "testimonials",
  "contact",
  "custom_text",
];

export const Route = createFileRoute("/admin/sections")({
  head: () => ({ meta: [{ title: "Homepage sections · BLACK PIXAL" }, { name: "robots", content: "noindex" }] }),
  component: SectionsAdmin,
});

function SectionsAdmin() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAllSections);
  const save = useServerFn(upsertSection);
  const remove = useServerFn(deleteSection);
  const reorder = useServerFn(reorderSections);

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["admin-sections"],
    queryFn: () => fetchAll(),
  });

  const [editing, setEditing] = useState<Partial<PageSection> | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-sections"] });

  async function move(id: string, dir: -1 | 1) {
    const list = [...sections];
    const i = list.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await reorder({ data: { items: list.map((s, idx) => ({ id: s.id, sort_order: idx })) } });
    refresh();
  }

  async function toggle(section: PageSection) {
    await save({ data: { ...section, visible: !section.visible } });
    refresh();
  }

  return (
    <main className="relative z-10 min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">Homepage sections</h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Reorder, rename, hide</p>
          </div>
          <div className="flex gap-3">
            <Link to="/admin" className="rounded-md border border-border px-3 py-2 text-xs uppercase tracking-[0.25em] hover:bg-card">← Dashboard</Link>
            <button
              onClick={() =>
                setEditing({ page: "home", section_type: "custom_text", title: "", data: {}, sort_order: sections.length, visible: true })
              }
              className="rounded-md bg-primary px-3 py-2 text-xs uppercase tracking-[0.25em] text-primary-foreground"
            >
              + New section
            </button>
          </div>
        </header>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {sections.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3">
                <span className="flex-1">
                  <span className="block font-display text-lg">{s.title || s.section_type}</span>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{s.section_type}</span>
                </span>
                <button onClick={() => toggle(s)} className={`rounded border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${s.visible ? "border-primary/60 text-primary" : "border-border text-muted-foreground"}`}>
                  {s.visible ? "Visible" : "Hidden"}
                </button>
                <button onClick={() => move(s.id, -1)} className="rounded border border-border px-2 py-1 text-[10px]">↑</button>
                <button onClick={() => move(s.id, 1)} className="rounded border border-border px-2 py-1 text-[10px]">↓</button>
                <button onClick={() => setEditing(s)} className="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em]">Edit</button>
                <button
                  onClick={async () => {
                    if (!confirm("Delete this section?")) return;
                    await remove({ data: { id: s.id } });
                    refresh();
                  }}
                  className="rounded border border-destructive/40 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-destructive"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">{editing.id ? "Edit section" : "New section"}</h2>
            <select
              value={editing.section_type ?? "custom_text"}
              onChange={(e) => setEditing({ ...editing, section_type: e.target.value })}
              className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
            >
              {SECTION_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input
              placeholder="Section title"
              value={editing.title ?? ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              className="w-full rounded-md border border-border bg-input/40 px-3 py-2"
            />
            <textarea
              placeholder="Subtitle / body text"
              value={(editing.data as any)?.body ?? ""}
              onChange={(e) => setEditing({ ...editing, data: { ...((editing.data as any) ?? {}), body: e.target.value } })}
              rows={3}
              className="w-full rounded-md border border-border bg-input/40 px-3 py-2"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.visible ?? true}
                onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
              />
              Visible on the site
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-xs uppercase tracking-[0.25em]">Cancel</button>
              <button
                onClick={async () => {
                  setBusy(true);
                  try {
                    await save({ data: editing as PageSection });
                    setEditing(null);
                    refresh();
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="rounded-md bg-primary px-4 py-2 text-xs uppercase tracking-[0.25em] text-primary-foreground disabled:opacity-40"
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
