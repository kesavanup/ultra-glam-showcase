## Scope

1. **AI Generate tab: preview + optional reference upload**
   - Generate now returns a preview image (no auto-publish). User sees it and clicks **Publish**, **Regenerate**, or **Discard**.
   - Optional "Reference image" upload guides generation (passed to Gemini as image_url).
   - Same preview flow added to **AI Edit** tab.

2. **Before/After images (retouch section)**
   - Generate two matching AI images: same female editorial portrait — "before" with visible pores, blemishes, uneven tone, flat light; "after" with cinematic clean retouch (skin texture preserved).
   - Replace `work-retouch-before.jpg` and `work-retouch-after.jpg` imports.

3. **Admin → Site Content editor (edit homepage text & key images live)**
   - New table `site_content(key text pk, value text, updated_at)` — public SELECT, admin write via service role.
   - Editable keys: `hero_kicker`, `hero_uc_line`, `hero_uc_title_top`, `hero_uc_title_bottom`, `hero_tagline`, `hero_desc`, `before_image_url`, `after_image_url`.
   - New route `/admin/content` with textarea/image-upload rows per key, saves via `upsertSiteContent`.
   - Hero + Before/After components read from CMS (React Query) with hardcoded fallbacks.
   - Dashboard gets a "Site Content" button next to AI Studio.

## Technical

- New server fns in `src/lib/site-content.functions.ts`: `listSiteContent` (public, publishable key), `upsertSiteContent` (admin), `uploadSiteImage` (admin, reuses portfolio bucket).
- New server fn in `src/lib/ai-media.functions.ts`: `aiPreview` accepts FormData `{ prompt, referenceFile? }` → returns `{ b64, contentType }`. Publishing happens client-side by converting b64 → File → existing `uploadAndPublish`.
- Keep `aiGenerateAndPublish` / `aiEditAndPublish` for backwards compat but the UI switches to the new preview flow.

## What I will NOT do
- No chat-to-edit AI copilot for admin (user picked "text & images" option only).
- No changes to portfolio CMS, hero video, or navigation.