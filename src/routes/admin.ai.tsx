import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import {
  aiGenerateAndPublish,
  aiEditAndPublish,
  uploadAndPublish,
} from "@/lib/ai-media.functions";

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

type Tab = "generate" | "edit" | "upload";

export const Route = createFileRoute("/admin/ai")({
  head: () => ({
    meta: [
      { title: "AI Studio · BLACK PIXAL" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AiStudio,
});

function AiStudio() {
  const [tab, setTab] = useState<Tab>("generate");
  return (
    <main className="relative z-10 min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">AI Studio</h1>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Generate · Edit · Publish
            </p>
          </div>
          <Link
            to="/admin"
            className="rounded-md border border-border px-3 py-2 text-xs uppercase tracking-[0.25em] hover:bg-card"
          >
            ← Dashboard
          </Link>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              ["generate", "AI Generate"],
              ["edit", "AI Edit Image"],
              ["upload", "Upload & Publish"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-md border px-3 py-2 text-[11px] uppercase tracking-[0.25em] transition ${
                tab === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-card"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "generate" && <GeneratePanel />}
        {tab === "edit" && <EditPanel />}
        {tab === "upload" && <UploadPanel />}
      </div>
    </main>
  );
}

function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-input/40 px-3 py-2 text-sm"
    >
      {CATEGORIES.map((c) => (
        <option key={c}>{c}</option>
      ))}
    </select>
  );
}

function Status({ err, ok }: { err: string | null; ok: string | null }) {
  return (
    <>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {ok && <p className="text-xs text-emerald-400">{ok}</p>}
    </>
  );
}

function GeneratePanel() {
  const run = useServerFn(aiGenerateAndPublish);
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("AI Generated Images");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function go() {
    setErr(null); setOk(null); setBusy(true);
    try {
      await run({ data: { prompt, category, title, description } });
      setOk("Published to portfolio.");
      setPrompt("");
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card/60 p-6">
      <textarea
        rows={4}
        placeholder="Describe the image you want to generate…"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full rounded-md border border-border bg-input/40 px-3 py-2"
      />
      <CategorySelect value={category} onChange={setCategory} />
      <input
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-border bg-input/40 px-3 py-2"
      />
      <input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-border bg-input/40 px-3 py-2"
      />
      <button
        onClick={go}
        disabled={busy || !prompt.trim()}
        className="w-full rounded-md bg-primary px-4 py-3 text-xs font-medium uppercase tracking-[0.25em] text-primary-foreground disabled:opacity-40"
      >
        {busy ? "Generating & publishing…" : "Generate & Publish"}
      </button>
      <Status err={err} ok={ok} />
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Uses Lovable AI (Gemini image). Published instantly to the live site.
      </p>
    </div>
  );
}

function EditPanel() {
  const run = useServerFn(aiEditAndPublish);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("AI Generated Images");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function go() {
    if (!file) return;
    setErr(null); setOk(null); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prompt", prompt);
      fd.append("category", category);
      fd.append("title", title);
      fd.append("description", description);
      await run({ data: fd });
      setOk("Edited image published.");
      pick(null); setPrompt("");
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card/60 p-6">
      <div
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) pick(f); }}
        className="flex aspect-video cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-black/30 text-sm text-muted-foreground hover:border-primary"
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          "Drop an image, or click to choose"
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <textarea
        rows={3}
        placeholder="How should AI edit this image? (e.g. 'make it neon cyberpunk')"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full rounded-md border border-border bg-input/40 px-3 py-2"
      />
      <CategorySelect value={category} onChange={setCategory} />
      <input
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-border bg-input/40 px-3 py-2"
      />
      <input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-border bg-input/40 px-3 py-2"
      />
      <button
        onClick={go}
        disabled={busy || !file || !prompt.trim()}
        className="w-full rounded-md bg-primary px-4 py-3 text-xs font-medium uppercase tracking-[0.25em] text-primary-foreground disabled:opacity-40"
      >
        {busy ? "Editing & publishing…" : "Edit with AI & Publish"}
      </button>
      <Status err={err} ok={ok} />
    </div>
  );
}

function UploadPanel() {
  const run = useServerFn(uploadAndPublish);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [category, setCategory] = useState("AI Generated Images");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setIsVideo(!!f && (f.type || "").startsWith("video/"));
  }

  async function go() {
    if (!file) return;
    setErr(null); setOk(null); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      fd.append("title", title);
      fd.append("description", description);
      await run({ data: fd });
      setOk("Published to portfolio.");
      pick(null);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card/60 p-6">
      <div
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) pick(f); }}
        className="flex aspect-video cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-black/30 text-sm text-muted-foreground hover:border-primary"
      >
        {preview ? (
          isVideo ? (
            <video src={preview} className="h-full w-full object-cover" muted playsInline autoPlay loop />
          ) : (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          "Drop an image or video, or click to choose"
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <CategorySelect value={category} onChange={setCategory} />
      <input
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-border bg-input/40 px-3 py-2"
      />
      <input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-border bg-input/40 px-3 py-2"
      />
      <button
        onClick={go}
        disabled={busy || !file}
        className="w-full rounded-md bg-primary px-4 py-3 text-xs font-medium uppercase tracking-[0.25em] text-primary-foreground disabled:opacity-40"
      >
        {busy ? "Publishing…" : "Publish to Portfolio"}
      </button>
      <Status err={err} ok={ok} />
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        Videos go live as-is. AI video generation isn't available at runtime — use this to publish videos you've already generated.
      </p>
    </div>
  );
}
