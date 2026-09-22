/**
 * Floating admin toolbar for the visual editor.
 * Rendered on the live page when a signed-in admin has editing on.
 */
import { Link } from "@tanstack/react-router";
import { useEditor } from "@/lib/editor";

export function EditToolbar() {
  const { isAdmin, editing, setEditing, dirty, saving, save, discard, status } =
    useEditor();
  if (!isAdmin) return null;

  if (!editing)
    return (
      <div className="fixed bottom-5 right-5 z-[90]">
        <button
          onClick={() => setEditing(true)}
          className="rounded-full border border-gold bg-black/85 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-gold shadow-lg backdrop-blur hover:bg-gold hover:text-black"
        >
          ✎ Edit site
        </button>
      </div>
    );

  return (
    <div className="fixed bottom-4 left-1/2 z-[90] flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-full border border-gold/50 bg-black/90 px-4 py-2 shadow-2xl backdrop-blur">
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-gold md:inline">
        Edit mode
      </span>
      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-gold px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-black disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
      {dirty && (
        <button
          onClick={discard}
          className="rounded-full border border-white/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/80"
        >
          Discard
        </button>
      )}
      <Link
        to="/admin"
        className="rounded-full border border-white/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/80 hover:border-gold hover:text-gold"
      >
        Portfolio & AI
      </Link>
      <button
        onClick={() => {
          if (dirty && !confirm("Unsaved changes will be lost. Exit edit mode?")) return;
          discard();
          setEditing(false);
        }}
        className="rounded-full border border-white/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/80"
      >
        Done
      </button>
      {status.ok && <span className="text-[10px] text-emerald-400">{status.ok}</span>}
      {status.err && <span className="text-[10px] text-red-400">{status.err}</span>}
    </div>
  );
}
