/**
 * Visual click-to-edit layer.
 *
 * Signed-in admins get an "Edit" switch on the live page. With editing on,
 * every text block becomes typeable in place, every image/video gets a
 * replace button, lists get add/remove/reorder controls, and a floating bar
 * saves everything straight to the database — so it works identically in
 * Lovable preview and on the deployed domain.
 */
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  isCurrentUserAdmin,
  listSiteContent,
  upsertSiteContent,
  uploadSiteMedia,
} from "@/lib/cms";
import { supabase } from "@/integrations/supabase/client";

async function ensureFreshSession() {
  try {
    const { data } = await supabase.auth.getSession();
    const exp = data.session?.expires_at ?? 0;
    const now = Math.floor(Date.now() / 1000);
    if (!data.session || exp - now < 60) await supabase.auth.refreshSession();
  } catch {
    /* ignore */
  }
}

type EditorApi = {
  isAdmin: boolean;
  editing: boolean;
  setEditing: (v: boolean) => void;
  get: (key: string, fallback: string) => string;
  set: (key: string, value: string) => void;
  getList: <T,>(key: string, fallback: T[]) => T[];
  setList: (key: string, items: unknown[]) => void;
  upload: (file: File) => Promise<string>;
  save: () => Promise<void>;
  discard: () => void;
  dirty: boolean;
  saving: boolean;
  status: { ok?: string; err?: string };
};

const Ctx = createContext<EditorApi | null>(null);

export function useEditor(): EditorApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEditor must be used inside <EditorProvider>");
  return ctx;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data: remote = {} } = useQuery({
    queryKey: ["site-content"],
    queryFn: () => listSiteContent(),
    staleTime: 30_000,
  });
  const { data: isAdmin = false } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => isCurrentUserAdmin(),
    staleTime: 60_000,
  });

  const [editing, setEditingRaw] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok?: string; err?: string }>({});

  const values = useMemo(() => ({ ...remote, ...draft }), [remote, draft]);

  const api: EditorApi = {
    isAdmin,
    editing: isAdmin && editing,
    setEditing: (v) => setEditingRaw(v),
    get: (key, fallback) => {
      const v = values[key];
      return v != null && String(v).trim().length > 0 ? String(v) : fallback;
    },
    set: (key, value) => {
      setStatus({});
      setDraft((d) => ({ ...d, [key]: value }));
    },
    getList: <T,>(key: string, fallback: T[]): T[] => {
      const raw = values[key];
      if (!raw || !String(raw).trim()) return fallback;
      try {
        const parsed = JSON.parse(String(raw));
        return Array.isArray(parsed) ? (parsed as T[]) : fallback;
      } catch {
        return fallback;
      }
    },
    setList: (key, items) => {
      setStatus({});
      setDraft((d) => ({ ...d, [key]: JSON.stringify(items) }));
    },
    upload: async (file) => {
      await ensureFreshSession();
      return uploadSiteMedia(file);
    },
    save: async () => {
      setSaving(true);
      setStatus({});
      try {
        await ensureFreshSession();
        const entries = Object.entries(draft).map(([key, value]) => ({
          key,
          value: value ?? "",
        }));
        if (entries.length) await upsertSiteContent({ data: { entries } });
        setDraft({});
        await qc.invalidateQueries({ queryKey: ["site-content"] });
        setStatus({ ok: "Saved — live for everyone." });
      } catch (e: any) {
        setStatus({ err: e?.message ?? "Could not save" });
      } finally {
        setSaving(false);
      }
    },
    discard: () => {
      setDraft({});
      setStatus({});
    },
    dirty: Object.keys(draft).length > 0,
    saving,
    status,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/* ------------------------------------------------------------------- text */

export function T({
  k,
  children,
  as: Tag = "span",
  className,
  ...rest
}: {
  k: string;
  children?: string;
  as?: any;
  className?: string;
  [x: string]: any;
}) {
  const { editing, get, set } = useEditor();
  const value = get(k, children ?? "");
  if (!editing)
    return (
      <Tag className={className} {...rest}>
        {value}
      </Tag>
    );
  return (
    <Tag
      className={`${className ?? ""} lv-editable`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      title={`Click to edit — ${k}`}
      onBlur={(e: any) => set(k, e.currentTarget.innerText.replace(/\n+$/, ""))}
      {...rest}
    >
      {value}
    </Tag>
  );
}

/* ------------------------------------------------------------------ media */

export function EditMedia({
  k,
  fallback,
  className,
  alt = "",
  accept = "image/*",
  video,
  ...rest
}: {
  k: string;
  fallback: string;
  className?: string;
  alt?: string;
  accept?: string;
  video?: boolean;
  [x: string]: any;
}) {
  const { editing, get, set, upload } = useEditor();
  const src = get(k, fallback);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const media = video ? (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      className={className}
      {...rest}
    />
  ) : (
    <img src={src} alt={alt} className={className} {...rest} />
  );

  if (!editing) return media;

  return (
    <>
      {media}
      <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-black/40 opacity-0 transition hover:opacity-100">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="rounded-full border border-gold bg-black/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-gold"
        >
          {busy ? "Uploading…" : video ? "Replace video" : "Replace image"}
        </button>
        <input
          ref={input}
          type="file"
          accept={accept}
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              set(k, await upload(f));
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ lists */

export function useEditableList<T extends Record<string, any>>(
  key: string,
  fallback: T[],
  blank: T,
) {
  const { getList, setList, editing } = useEditor();
  const items = getList<T>(key, fallback);
  return {
    editing,
    items,
    add: () => setList(key, [...items, blank]),
    remove: (i: number) => setList(key, items.filter((_, x) => x !== i)),
    move: (i: number, dir: -1 | 1) => {
      const n = [...items];
      const j = i + dir;
      if (j < 0 || j >= n.length) return;
      [n[i], n[j]] = [n[j], n[i]];
      setList(key, n);
    },
    patch: (i: number, field: string, value: any) => {
      const n = [...items];
      n[i] = { ...n[i], [field]: value } as T;
      setList(key, n);
    },
  };
}

export function ItemControls({
  onUp,
  onDown,
  onRemove,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="absolute right-2 top-2 z-40 flex gap-1">
      {[
        { l: "↑", f: onUp },
        { l: "↓", f: onDown },
        { l: "✕", f: onRemove },
      ].map((b) => (
        <button
          key={b.l}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            b.f();
          }}
          className="grid h-6 w-6 place-items-center rounded border border-gold/60 bg-black/80 text-[11px] text-gold hover:bg-gold hover:text-black"
        >
          {b.l}
        </button>
      ))}
    </div>
  );
}

export function AddItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-dashed border-gold/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-gold hover:bg-gold/10"
    >
      + {label}
    </button>
  );
}
