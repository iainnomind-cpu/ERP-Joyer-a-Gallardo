-- Enable RLS on categories table if not already enabled
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policy to allow purely public read access (essential for storefront)
CREATE POLICY "Public read access categories" 
ON public.categories FOR SELECT 
USING (true);

-- Policy to allow authenticated users (admin/staff) to do EVERYTHING
CREATE POLICY "Authenticated full access categories" 
ON public.categories FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
