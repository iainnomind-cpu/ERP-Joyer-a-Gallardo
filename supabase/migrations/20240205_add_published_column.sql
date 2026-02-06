-- Add missing is_published_online column
-- Run this in Supabase SQL Editor

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_published_online boolean DEFAULT false;

-- Also ensuring category column can support text or uuid if needed, 
-- but usually it should be uuid if it references categories.id
-- Checking if it needs to be altered or if it's fine. 
-- For now, just adding the missing column is the priority.
