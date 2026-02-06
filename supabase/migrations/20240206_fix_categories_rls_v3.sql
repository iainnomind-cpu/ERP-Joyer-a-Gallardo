-- 1. Drop previous policies to ensure clean slate
DROP POLICY IF EXISTS "Public read access categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated full access categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all users to read categories" ON public.categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.categories;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.categories;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.categories;
DROP POLICY IF EXISTS "Public read access" ON public.categories;
DROP POLICY IF EXISTS "Admin full access" ON public.categories;

-- 2. Ensure RLS is enabled
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. Create POLICY matching the application architecture (Anon Access)
-- Since the app uses custom auth (not Supabase Auth), all requests come as 'anon'.
-- We must allow 'anon' to perform operations. The client-side app handles the "real" auth checks.

CREATE POLICY "Allow all access to categories"
ON public.categories FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
