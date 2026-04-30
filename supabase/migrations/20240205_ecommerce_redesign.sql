-- E-commerce Redesign Migration
-- Run this in your Supabase SQL Editor

-- 1. Add new columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS short_description text,
ADD COLUMN IF NOT EXISTS detailed_description text,
ADD COLUMN IF NOT EXISTS sale_price numeric,
ADD COLUMN IF NOT EXISTS is_on_sale boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sale_start_date timestamptz,
ADD COLUMN IF NOT EXISTS sale_end_date timestamptz,
ADD COLUMN IF NOT EXISTS weight numeric,
ADD COLUMN IF NOT EXISTS width numeric,
ADD COLUMN IF NOT EXISTS height numeric,
ADD COLUMN IF NOT EXISTS length numeric,
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS keywords text[],
ADD COLUMN IF NOT EXISTS min_order_quantity int,
ADD COLUMN IF NOT EXISTS max_order_quantity int,
ADD COLUMN IF NOT EXISTS attributes jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tags text[];

-- 2. Create Product Images table (for robust gallery management)
CREATE TABLE IF NOT EXISTS public.product_images (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    url text NOT NULL,
    alt_text text,
    sort_order int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 3. Create Product Categories table (for many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.product_categories_rel (
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

-- 4. Enable RLS for new tables
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Authenticated write access images" ON public.product_images FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.product_categories_rel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access prod_cat" ON public.product_categories_rel FOR SELECT USING (true);
CREATE POLICY "Authenticated write access prod_cat" ON public.product_categories_rel FOR ALL USING (auth.role() = 'authenticated');

-- 5. Add parent_id to categories for hierarchy
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id),
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS is_visible_in_menu boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
