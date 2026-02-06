-- 1. Drop ALL potential policies on categories to clean up conflicts
DROP POLICY IF EXISTS "Public read access categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated full access categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all users to read categories" ON public.categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.categories;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.categories;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.categories;

-- 2. Ensure RLS is enabled
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. Create CLEAN policies

-- Allow everyone (including anonymous) to READ categories (needed for Storefront)
CREATE POLICY "Public read access"
ON public.categories FOR SELECT
USING (true);

-- Allow Authenticated users to do ANYTHING (Insert, Update, Delete)
CREATE POLICY "Admin full access"
ON public.categories FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
