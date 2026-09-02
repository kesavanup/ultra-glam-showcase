import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@/lib/cms";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  listSiteContent,
  upsertSiteContent,
  uploadSiteImage,
} from "@/lib/cms";
import { supabase } from "@/integrations/supabase/client";

async function ensureFreshSession() {
  const { data } = await supabase.auth.getSession();
  const exp = data.session?.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);
  if (!data.session || exp - now < 60) {
    await supabase.auth.refreshSession();
  }
}

type SubField = { key: string; label: string; kind?: "text" | "textarea" | "image" };

type Field = {
  key: string;
  label: string;
  hint?: string;
  kind: "text" | "textarea" | "image" | "list";
  placeholder?: string;
  sub?: SubField[];
};

const FIELDS: { section: string; items: Field[] }[] = [
  {
    section: "Brand & navigation",
    items: [
      { key: "brand_name", kind: "text", label: "Brand name", placeholder: "BLACK PIXAL" },
      { key: "logo_url", kind: "image", label: "Logo", hint: "Shown top-left" },
      { key: "nav_cta_label", kind: "text", label: "Nav button label", placeholder: "Get Quote" },
    ],
  },
  {
    section: "Hero — top of homepage",
    items: [
      { key: "hero_kicker", kind: "text", label: "Kicker line", placeholder: "est. 2024 — creative design & ai studio" },
      { key: "hero_title_top", kind: "text", label: "Big title — line 1", placeholder: "BLACK" },
      { key: "hero_title_bottom", kind: "text", label: "Big title — line 2", placeholder: "PIXAL" },
      { key: "hero_desc", kind: "textarea", label: "Long description", placeholder: "An editorial studio for brands that refuse the ordinary…" },
      { key: "hero_image_url", kind: "image", label: "Hero background image" },
    ],
  },
  {
    section: "Scrolling strip",
    items: [
      {
        key: "marquee_words",
        kind: "text",
        label: "Words (comma separated)",
        placeholder: "Banner Design, Pamphlet, Logo & Branding, …",
      },
    ],
  },
  {
    section: "Services",
    items: [
      { key: "services_heading", kind: "textarea", label: "Section heading" },
      {
        key: "services_json",
        kind: "list",
        label: "Service cards",
        sub: [
          { key: "n", label: "Number" },
          { key: "title", label: "Title" },
          { key: "desc", label: "Description", kind: "textarea" },
        ],
      },
    ],
  },
  {
    section: "Work / portfolio",
    items: [{ key: "work_heading", kind: "textarea", label: "Section heading" }],
  },
  {
    section: "Before / After slider",
    items: [
      { key: "before_after_heading", kind: "textarea", label: "Section heading" },
      { key: "before_after_desc", kind: "textarea", label: "Section description" },
      { key: "before_image_url", kind: "image", label: "Before image", hint: "Untouched / with blemishes" },
      { key: "after_image_url", kind: "image", label: "After image", hint: "Cinematic retouched result" },
    ],
  },
  {
    section: "AI films",
    items: [
      { key: "films_heading", kind: "textarea", label: "Section heading" },
      {
        key: "films_json",
        kind: "list",
        label: "Films",
        sub: [
          { key: "title", label: "Title" },
          { key: "duration", label: "Duration" },
          { key: "img", label: "Poster image", kind: "image" },
        ],
      },
    ],
  },
  {
    section: "Testimonials",
    items: [
      { key: "testimonials_heading", kind: "textarea", label: "Section heading" },
      {
        key: "testimonials_json",
        kind: "list",
        label: "Testimonials",
        sub: [
          { key: "quote", label: "Quote", kind: "textarea" },
          { key: "name", label: "Name" },
          { key: "role", label: "Role" },
        ],
      },
    ],
  },
  {
    section: "Contact & footer",
    items: [
      { key: "contact_heading", kind: "textarea", label: "Heading line 1" },
      { key: "contact_heading_accent", kind: "text", label: "Heading accent (italic gold)" },
      {
        key: "contacts_json",
        kind: "list",
        label: "Contact cards",
        sub: [
          { key: "label", label: "Label" },
          { key: "value", label: "Value" },
          { key: "href", label: "Link" },
        ],
      },
      { key: "contact_cta_label", kind: "text", label: "CTA button label" },
      { key: "contact_cta_href", kind: "text", label: "CTA button link" },
      { key: "footer_left", kind: "text", label: "Footer left text" },
      { key: "footer_right", kind: "text", label: "Footer right text" },
    ],
  },
];


export const Route = createFileRoute("/admin/content")({
  head: () => ({
    meta: [
      { title: "Site Content · BLACK PIXAL" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContentAdmin,
});

function ContentAdmin() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listSiteContent);
  const save = useServerFn(upsertSiteContent);
  const upload = useServerFn(uploadSiteImage);

  const { data: initial = {}, isLoading } = useQuery({
    queryKey: ["site-content"],
    queryFn: () => fetchAll(),
    staleTime: 0,
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setValues({ ...initial });
  }, [initial]);

  function set(key: string, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  async function persist() {
    setErr(null); setOk(null); setBusy(true);
    try { await ensureFreshSession(); } catch {}
    try {
      const entries = Object.entries(values).map(([key, value]) => ({ key, value: value ?? "" }));
      await save({ data: { entries } });
      setOk("Saved. Live site updated.");
      qc.invalidateQueries({ queryKey: ["site-content"] });
      qc.invalidateQueries({ queryKey: ["public-site-content"] });
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  async function uploadReturning(file: File): Promise<string> {
    try { await ensureFreshSession(); } catch {}
    const fd = new FormData();
    fd.append("file", file);
    const res = await upload({ data: fd });
    return res.storageRef;
  }

  async function uploadFor(key: string, file: File) {
    setUploading(key); setErr(null); setOk(null);
    try { await ensureFreshSession(); } catch {}
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await upload({ data: fd });
      set(key, res.storageRef);
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally { setUploading(null); }
  }

  return (
    <main className="relative z-10 min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">Site Content</h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Edit homepage text & key images
            </p>
          </div>
          <Link
            to="/admin"
            className="rounded-md border border-border px-3 py-2 text-xs uppercase tracking-[0.25em] hover:bg-card"
          >
            ← Dashboard
          </Link>
        </header>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-10">
            {FIELDS.map((section) => (
              <section key={section.section} className="rounded-2xl border border-border bg-card/60 p-6">
                <h2 className="mb-4 font-display text-xl">{section.section}</h2>
                <div className="space-y-5">
                  {section.items.map((f) => (
                    <FieldRow
                      key={f.key}
                      field={f}
                      value={values[f.key] ?? ""}
                      onChange={(v) => set(f.key, v)}
                      onPickImage={(file) => uploadFor(f.key, file)}
                      uploadFile={uploadReturning}
                      uploading={uploading === f.key}
                    />
                  ))}
                </div>
              </section>
            ))}

            <div className="sticky bottom-4 flex items-center gap-4 rounded-xl border border-border bg-card/80 p-4 backdrop-blur">
              <button
                onClick={persist}
                disabled={busy}
                className="rounded-md bg-primary px-5 py-3 text-xs font-medium uppercase tracking-[0.25em] text-primary-foreground disabled:opacity-40"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
              <Link to="/" className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground">
                Open live site →
              </Link>
              {ok && <span className="text-xs text-emerald-400">{ok}</span>}
              {err && <span className="text-xs text-destructive">{err}</span>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  onPickImage,
  uploadFile,
  uploading,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
  onPickImage: (f: File) => void;
  uploadFile: (f: File) => Promise<string>;
  uploading: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const preview = value?.startsWith("storage:") ? null : value;
  return (
    <div>
      <label className="mb-1 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          {field.label}
        </span>
        {field.hint && (
          <span className="text-[10px] italic text-muted-foreground/70">{field.hint}</span>
        )}
      </label>
      {field.kind === "list" && (
        <ListEditor field={field} value={value} onChange={onChange} uploadFile={uploadFile} />
      )}
      {field.kind === "text" && (
        <input
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
        />
      )}
      {field.kind === "textarea" && (
        <textarea
          rows={3}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
        />
      )}
      {field.kind === "image" && (
        <div className="space-y-2">
          <div
            onClick={() => input.current?.click()}
            className="flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-black/30 text-xs text-muted-foreground hover:border-primary"
          >
            {uploading ? (
              "Uploading…"
            ) : value ? (
              <img
                src={preview ?? ""}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => ((e.currentTarget.style.display = "none"))}
              />
            ) : (
              "Click to upload image"
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={input}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickImage(f);
              }}
            />
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="…or paste an image URL"
              className="flex-1 rounded-md border border-border bg-input/40 px-3 py-2 text-xs"
            />
            {value && (
              <button
                onClick={() => onChange("")}
                className="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ListEditor({
  field,
  value,
  onChange,
  uploadFile,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
  uploadFile: (f: File) => Promise<string>;
}) {
  let rows: Record<string, string>[] = [];
  try {
    const parsed = JSON.parse(value || "[]");
    if (Array.isArray(parsed)) rows = parsed;
  } catch {
    rows = [];
  }
  const sub = field.sub ?? [];
  const commit = (next: Record<string, string>[]) => onChange(JSON.stringify(next));

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="text-xs italic text-muted-foreground">
          Empty — the website shows its default content. Add an item to override it.
        </p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg border border-border bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Item {i + 1}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (i === 0) return;
                  const n = [...rows];
                  [n[i - 1], n[i]] = [n[i], n[i - 1]];
                  commit(n);
                }}
                className="rounded border border-border px-2 py-0.5 text-[10px]"
              >
                ↑
              </button>
              <button
                onClick={() => {
                  if (i === rows.length - 1) return;
                  const n = [...rows];
                  [n[i + 1], n[i]] = [n[i], n[i + 1]];
                  commit(n);
                }}
                className="rounded border border-border px-2 py-0.5 text-[10px]"
              >
                ↓
              </button>
              <button
                onClick={() => commit(rows.filter((_, x) => x !== i))}
                className="rounded border border-border px-2 py-0.5 text-[10px] text-destructive"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {sub.map((sf) => (
              <div key={sf.key}>
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {sf.label}
                </span>
                {sf.kind === "textarea" ? (
                  <textarea
                    rows={2}
                    value={row[sf.key] ?? ""}
                    onChange={(e) => {
                      const n = [...rows];
                      n[i] = { ...row, [sf.key]: e.target.value };
                      commit(n);
                    }}
                    className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
                  />
                ) : sf.kind === "image" ? (
                  <div className="flex items-center gap-2">
                    {row[sf.key] && (
                      <img src={row[sf.key]} alt="" className="h-12 w-16 rounded object-cover" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const ref = await uploadFile(f);
                        const n = [...rows];
                        n[i] = { ...row, [sf.key]: ref };
                        commit(n);
                      }}
                      className="text-[10px]"
                    />
                    <input
                      value={row[sf.key] ?? ""}
                      onChange={(e) => {
                        const n = [...rows];
                        n[i] = { ...row, [sf.key]: e.target.value };
                        commit(n);
                      }}
                      placeholder="…or paste URL"
                      className="flex-1 rounded-md border border-border bg-input/40 px-3 py-2 text-xs"
                    />
                  </div>
                ) : (
                  <input
                    value={row[sf.key] ?? ""}
                    onChange={(e) => {
                      const n = [...rows];
                      n[i] = { ...row, [sf.key]: e.target.value };
                      commit(n);
                    }}
                    className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={() => commit([...rows, Object.fromEntries(sub.map((sf) => [sf.key, ""]))])}
        className="rounded-md border border-border px-3 py-2 text-[10px] uppercase tracking-[0.25em] hover:bg-card"
      >
        + Add item
      </button>
    </div>
  );
}
