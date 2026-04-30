-- Add field to control online visibility
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_published_online BOOLEAN DEFAULT false;

-- Add View to simplify Web access (Optional but recommended for security/simplicity)
CREATE OR REPLACE VIEW published_products AS
SELECT 
  id,
  sku as codigo,
  name as descripcion,
  retail_price as precio,
  image_url as imagen_url,
  category as categoria_id, -- Note: ERP uses 'category' string/FK, Website used 'categoria_id'. We map it here.
  created_at
FROM products
WHERE is_published_online = true AND total_stock > 0;
