## Plan: Admin Panel + Files Page + Neon Theme + Premium Hero Effects

Adds an admin gate, CMS-backed portfolio, a Files page with Google Drive uploads/downloads, a new Neon theme, and theme-aware particle effects — without altering the current layout, branding, animations, SEO, or deploy setup.

### 1. Admin panel (shared password gate, no backend)
- Add a small gear icon in the top-right (next to the existing theme switcher).
- `/admin/login` route — password form, server-validated via `unlockAdmin` server function using `timingSafeEqual` against `ADMIN_PASSWORD` env var. Encrypted session cookie via `useSession` with `SESSION_SECRET`.
- `/admin` dashboard route, gated server-side. Visitors see nothing admin-related.
- Secrets needed (generated automatically):
  - `ADMIN_PASSWORD` — you'll be prompted to enter it
  - `SESSION_SECRET` — auto-generated 64-char random
- Note: the gate uses a single shared password (your choice). It can't be tied to your Lovable account email without enabling Cloud auth.

### 2. Portfolio CMS (Lovable Cloud)
- Enable Lovable Cloud (database + storage bucket `portfolio`).
- Table `portfolio_items`: id, category, title, description, media_url, media_type (image/video), thumbnail_url, sort_order, published, created_at. RLS: public SELECT where `published=true`; writes restricted to service role (called from admin-gated server fns).
- Storage bucket `portfolio` (public read) for uploads.
- Admin dashboard UI:
  - Category tabs (Retouch, Logo, Banner, Pamphlet, Social Media, AI Images, AI Videos, Color Correction, Branding, + add custom).
  - Drag-drop + browse upload, replace, delete, inline edit title/description/category, thumbnail change, drag-to-reorder (dnd-kit), preview, publish toggle.
- Public portfolio grid on the homepage reads from `portfolio_items` (replacing current hardcoded array) — layout/animations unchanged.

### 3. `/files` page (Google Drive connector)
- Link Google Drive connector (developer account — your Drive).
- Server fns calling the connector gateway:
  - `uploadToDrive` → multipart upload into a configured folder.
  - `listDriveFiles` → metadata (name, size, modifiedTime, mimeType, id) from a public-downloads folder.
  - `downloadDriveFile` → streamed via server route `/api/drive/download/$id`.
- UI:
  - **Upload section**: drag-drop + browse, multi-file, per-file progress, success/error toasts.
  - **Download section**: search, category filter (folder-based), file name/size/date, download button, file-type icons.
- Two Drive folder IDs stored as env vars: `DRIVE_UPLOAD_FOLDER_ID`, `DRIVE_DOWNLOAD_FOLDER_ID` (you'll provide after connecting).

### 4. Themes
- Keep all 5 existing themes. Add **Neon (Cyber Neon)**: bg `#0a0014`, neon cyan `#00f0ff`, magenta `#ff00d4`, violet `#b400ff`, font pair Orbitron + Rajdhani.
- New `<ThemeFX />` component renders theme-specific canvas/particle layers behind content:
  - **Prism (multi-color)**: animated gradient mesh + flowing colored particles + ink splash on click.
  - **Noir Gold / Ivory Gold**: fine gold dust particles, shimmer streaks, glowing rim lighting.
  - **Neon**: bloom-glow particles, light-trail lines, cursor neon trail.
  - **Mono / Glass**: subtle existing look preserved (no heavy effects, kept minimal).
- Mobile: reduces particle counts ~60% and disables trails for FPS.

### 5. Hero enhancement
- Extend existing `HeroScene.tsx`:
  - Theme-aware particle colors (read CSS vars).
  - Logo reveal: scale/blur intro on first mount.
  - Mouse-responsive particle flow field (already partial — strengthen).
  - Scroll-triggered burst variants per theme (gold dust / neon trails / color explosion).
- No layout changes; pure additions inside the existing fixed canvas.

### 6. Performance
- Lazy-load admin routes and ThemeFX layers via `React.lazy` + `Suspense`.
- `prefers-reduced-motion` disables heavy particles.
- Image upload pipeline stores original + uses CSS `loading="lazy"` everywhere.
- Cap DPR at 1.75; throttle particle counts on small viewports.

### 7. Preservation guarantees
- No changes to existing routes besides additive ones (`/admin`, `/admin/login`, `/files`).
- Homepage sections, copy, contact info, existing animations untouched.
- SEO `head()` metadata preserved; new routes get their own metadata.
- Repo structure and Vercel/GitHub deploy unaffected.

### Technical summary
- Stack: TanStack Start (existing) + Lovable Cloud (Supabase) + Google Drive connector + dnd-kit for reorder.
- New files: `src/routes/admin.login.tsx`, `src/routes/admin.tsx`, `src/routes/admin.index.tsx`, `src/routes/files.tsx`, `src/routes/api/drive.download.$id.ts`, `src/lib/admin.functions.ts`, `src/lib/portfolio.functions.ts`, `src/lib/drive.functions.ts`, `src/components/AdminButton.tsx`, `src/components/ThemeFX.tsx`, `src/components/admin/*`.
- Migrations: `portfolio_items` table + GRANTs + RLS + storage bucket `portfolio`.
- Secrets requested in order: enable Cloud → `ADMIN_PASSWORD` (you enter) → `SESSION_SECRET` (auto) → connect Google Drive → `DRIVE_UPLOAD_FOLDER_ID` + `DRIVE_DOWNLOAD_FOLDER_ID`.

### Build order
1. Enable Cloud + portfolio table/bucket; migrate hardcoded items into DB.
2. Admin gate + dashboard + portfolio CRUD UI.
3. Connect Google Drive + `/files` page.
4. Neon theme + `ThemeFX` particle layers.
5. Hero theme-aware enhancements.
6. Verify mobile FPS + lazy loading.