-- 1. Extend portfolio_items for the universal display-type system (non-destructive)
ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS display_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client text,
  ADD COLUMN IF NOT EXISTS project_date date,
  ADD COLUMN IF NOT EXISTS hover_effect text NOT NULL DEFAULT 'zoom',
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}'::text[];

-- backfill categories array from the legacy single category
UPDATE public.portfolio_items
SET categories = ARRAY[category]
WHERE cardinality(categories) = 0 AND category IS NOT NULL;

-- 2. Portfolio categories table
CREATE TABLE IF NOT EXISTS public.portfolio_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portfolio_categories TO anon;
GRANT SELECT ON public.portfolio_categories TO authenticated;
GRANT ALL ON public.portfolio_categories TO service_role;
ALTER TABLE public.portfolio_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read categories" ON public.portfolio_categories;
CREATE POLICY "Public read categories" ON public.portfolio_categories FOR SELECT USING (true);

INSERT INTO public.portfolio_categories (name, slug, sort_order) VALUES
  ('High-End Retouch','high-end-retouch',0),
  ('Logo Design','logo-design',1),
  ('Banner Design','banner-design',2),
  ('Pamphlet Design','pamphlet-design',3),
  ('Social Media Designs','social-media-designs',4),
  ('AI Generated Images','ai-generated-images',5),
  ('AI Generated Videos','ai-generated-videos',6),
  ('Color Correction','color-correction',7),
  ('Branding Projects','branding-projects',8),
  ('Wedding Album','wedding-album',9)
ON CONFLICT (name) DO NOTHING;

-- 3. Page sections CMS
CREATE TABLE IF NOT EXISTS public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL DEFAULT 'home',
  section_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.page_sections TO anon;
GRANT SELECT ON public.page_sections TO authenticated;
GRANT ALL ON public.page_sections TO service_role;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read sections" ON public.page_sections;
CREATE POLICY "Public read sections" ON public.page_sections FOR SELECT USING (visible = true);

INSERT INTO public.page_sections (page, section_type, title, sort_order, visible, data)
SELECT * FROM (VALUES
  ('home','hero','Hero',0,true,'{}'::jsonb),
  ('home','marquee','Marquee',1,true,'{}'::jsonb),
  ('home','services','Services',2,true,'{}'::jsonb),
  ('home','work','Selected Works',3,true,'{}'::jsonb),
  ('home','before_after','Before & After',4,true,'{}'::jsonb),
  ('home','films','AI Films',5,true,'{}'::jsonb),
  ('home','testimonials','Testimonials',6,true,'{}'::jsonb),
  ('home','contact','Contact',7,true,'{}'::jsonb)
) AS v(page,section_type,title,sort_order,visible,data)
WHERE NOT EXISTS (SELECT 1 FROM public.page_sections WHERE page = 'home');