-- FIX Storage Policies (Permissive)
-- Run this in Supabase SQL Editor

-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- 2. Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. create a single PERMISSIVE policy for EVERYTHING on this bucket
-- This allows anyone (anon or authenticated) to Read, Upload, Update, Delete
-- images in the 'product-images' bucket.
CREATE POLICY "Allow All on Product Images"
ON storage.objects FOR ALL
USING ( bucket_id = 'product-images' )
WITH CHECK ( bucket_id = 'product-images' );
