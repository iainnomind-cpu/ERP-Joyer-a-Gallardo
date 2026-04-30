/*
  # Mejoras al Módulo de Inventario

  1. Nuevas Funcionalidades
    - Generación automática de SKU con formato configurable
    - Sistema de impresión de etiquetas con historial
    - Vista materializada de resumen de movimientos
    - Alertas configurables por línea base
    - Validación de stock en movimientos
    
  2. Nuevas Tablas
    - `sku_configuration` - Configuración del formato de SKU
    - `label_print_history` - Historial de impresiones de etiquetas
    - `base_line_alerts` - Alertas específicas para líneas base
    
  3. Funciones y Triggers
    - `generate_sku()` - Genera SKU automático basado en configuración
    - `validate_stock_movement()` - Valida stock antes de salidas
    - `refresh_inventory_summary()` - Actualiza vista materializada
    
  4. Vistas
    - `inventory_movement_summary` - Resumen de movimientos por producto
    
  5. Seguridad
    - RLS habilitado en todas las nuevas tablas
    - Políticas de acceso completo para desarrollo
*/

-- Tabla de configuración del formato de SKU
CREATE TABLE IF NOT EXISTS sku_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text NOT NULL DEFAULT 'GJ',
  separator text NOT NULL DEFAULT '-',
  sequence_length integer NOT NULL DEFAULT 6,
  include_material_code boolean DEFAULT true,
  material_codes jsonb DEFAULT '{"Plata Pura": "PP", "Baño de Oro": "BO"}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Secuencia para numeración de SKU
CREATE SEQUENCE IF NOT EXISTS sku_sequence START 1;

-- Función para generar SKU automático
CREATE OR REPLACE FUNCTION generate_sku(material_type text DEFAULT NULL)
RETURNS text AS $$
DECLARE
  config_record RECORD;
  material_code text;
  sequence_num text;
  new_sku text;
BEGIN
  -- Obtener configuración activa
  SELECT * INTO config_record
  FROM sku_configuration
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Si no hay configuración, usar valores por defecto
  IF NOT FOUND THEN
    config_record.prefix := 'GJ';
    config_record.separator := '-';
    config_record.sequence_length := 6;
    config_record.include_material_code := true;
    config_record.material_codes := '{"Plata Pura": "PP", "Baño de Oro": "BO"}'::jsonb;
  END IF;
  
  -- Obtener código de material si está habilitado
  material_code := '';
  IF config_record.include_material_code AND material_type IS NOT NULL THEN
    material_code := COALESCE(
      config_record.material_codes->>material_type,
      'XX'
    );
    material_code := config_record.separator || material_code;
  END IF;
  
  -- Generar número de secuencia con padding
  sequence_num := LPAD(nextval('sku_sequence')::text, config_record.sequence_length, '0');
  
  -- Construir SKU final: Ejemplo GJ-PP-000001
  new_sku := config_record.prefix || material_code || config_record.separator || sequence_num;
  
  RETURN new_sku;
END;
$$ LANGUAGE plpgsql;

-- Tabla de historial de impresión de etiquetas
CREATE TABLE IF NOT EXISTS label_print_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  sku text NOT NULL,
  product_name text NOT NULL,
  material text NOT NULL,
  quantity integer DEFAULT 1,
  label_size text DEFAULT 'small',
  printed_by text,
  printer_name text,
  print_status text DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Tabla de alertas configurables por línea base
CREATE TABLE IF NOT EXISTS base_line_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  alert_threshold integer NOT NULL DEFAULT 5,
  notification_enabled boolean DEFAULT true,
  notification_emails text[],
  last_notification_sent timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_label_print_product ON label_print_history(product_id);
CREATE INDEX IF NOT EXISTS idx_label_print_status ON label_print_history(print_status);
CREATE INDEX IF NOT EXISTS idx_label_print_date ON label_print_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_base_line_alerts_product ON base_line_alerts(product_id);

-- Vista materializada para resumen de movimientos
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_movement_summary AS
SELECT 
  p.id as product_id,
  p.sku,
  p.name as product_name,
  p.material,
  p.is_base_line,
  COUNT(im.id) as total_movements,
  COUNT(CASE WHEN im.movement_type = 'in' THEN 1 END) as entries,
  COUNT(CASE WHEN im.movement_type = 'out' THEN 1 END) as exits,
  COUNT(CASE WHEN im.movement_type = 'adjustment' THEN 1 END) as adjustments,
  COALESCE(SUM(CASE WHEN im.movement_type = 'in' THEN im.quantity_a + im.quantity_b + im.quantity_c ELSE 0 END), 0) as total_in,
  COALESCE(SUM(CASE WHEN im.movement_type = 'out' THEN im.quantity_a + im.quantity_b + im.quantity_c ELSE 0 END), 0) as total_out,
  MAX(im.created_at) as last_movement_date
FROM products p
LEFT JOIN inventory_movements im ON p.id = im.product_id
GROUP BY p.id, p.sku, p.name, p.material, p.is_base_line;

-- Índice único en la vista materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_summary_product ON inventory_movement_summary(product_id);

-- Función para refrescar la vista materializada
CREATE OR REPLACE FUNCTION refresh_inventory_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_movement_summary;
END;
$$ LANGUAGE plpgsql;

-- Función para validar stock antes de movimientos de salida
CREATE OR REPLACE FUNCTION validate_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
  current_stock RECORD;
BEGIN
  -- Solo validar salidas
  IF NEW.movement_type = 'out' THEN
    -- Obtener stock actual
    SELECT stock_a, stock_b, stock_c INTO current_stock
    FROM products
    WHERE id = NEW.product_id;
    
    -- Verificar disponibilidad
    IF current_stock.stock_a < NEW.quantity_a OR
       current_stock.stock_b < NEW.quantity_b OR
       current_stock.stock_c < NEW.quantity_c THEN
      RAISE EXCEPTION 'Stock insuficiente. Disponible: A=%, B=%, C=%. Solicitado: A=%, B=%, C=%',
        current_stock.stock_a, current_stock.stock_b, current_stock.stock_c,
        NEW.quantity_a, NEW.quantity_b, NEW.quantity_c;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar movimientos de stock
DROP TRIGGER IF EXISTS validate_stock_trigger ON inventory_movements;
CREATE TRIGGER validate_stock_trigger
  BEFORE INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION validate_stock_movement();

-- Habilitar RLS en nuevas tablas
ALTER TABLE sku_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE label_print_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_line_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para nuevas tablas
CREATE POLICY "Allow all access to sku_configuration"
  ON sku_configuration FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to label_print_history"
  ON label_print_history FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to base_line_alerts"
  ON base_line_alerts FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Insertar configuración inicial de SKU
INSERT INTO sku_configuration (
  prefix,
  separator,
  sequence_length,
  include_material_code,
  material_codes,
  is_active
) VALUES (
  'GJ',
  '-',
  6,
  true,
  '{"Plata Pura": "PP", "Baño de Oro": "BO"}'::jsonb,
  true
) ON CONFLICT DO NOTHING;
