-- Añadir preferred_category a los clientes para Marketing segmentation cross-module
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS preferred_category text;
