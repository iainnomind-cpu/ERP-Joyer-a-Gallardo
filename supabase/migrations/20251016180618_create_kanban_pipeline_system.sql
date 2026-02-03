/*
  # Sistema Kanban Pipeline para Seguimiento de Clientes

  1. Nuevas Tablas
    - `pipeline_stages`
      - `id` (uuid, primary key)
      - `name` (text) - Nombre de la etapa (ej. "Contacto Inicial", "Cotización")
      - `order` (integer) - Orden de visualización
      - `color` (text) - Color identificador visual
      - `created_at` (timestamptz)
    
    - `pipeline_cards`
      - `id` (uuid, primary key)
      - `customer_id` (uuid) - Referencia al cliente
      - `stage_id` (uuid) - Etapa actual
      - `title` (text) - Título de la tarjeta
      - `description` (text) - Descripción detallada
      - `estimated_value` (numeric) - Valor estimado de venta
      - `priority` (text) - Prioridad: low, medium, high
      - `assigned_to` (text) - Vendedor asignado
      - `order` (integer) - Orden dentro de la etapa
      - `tags` (text[]) - Etiquetas para clasificación
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `pipeline_activities`
      - `id` (uuid, primary key)
      - `card_id` (uuid) - Referencia a la tarjeta
      - `activity_type` (text) - Tipo de actividad
      - `description` (text) - Descripción de la actividad
      - `created_by` (text) - Usuario que creó la actividad
      - `created_at` (timestamptz)

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas para acceso público de lectura (usuarios anon)
    - Políticas para que usuarios autenticados gestionen datos

  3. Datos Iniciales
    - Etapas predefinidas para el proceso de venta de joyería:
      * Contacto Inicial - Primer acercamiento con el cliente
      * Calificación - Evaluación del potencial del cliente
      * Cotización - Envío de cotización y presentación de productos
      * Negociación - Ajustes de precio, condiciones de pago
      * Cierre Pendiente - Cliente decidiendo, seguimiento final
      * Ganado - Venta concretada
      * Perdido - Oportunidad perdida
*/

-- Crear tabla pipeline_stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  "order" integer NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  created_at timestamptz DEFAULT now()
);

-- Crear tabla pipeline_cards
CREATE TABLE IF NOT EXISTS pipeline_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  stage_id uuid REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  estimated_value numeric(12, 2) DEFAULT 0,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to text DEFAULT '',
  "order" integer DEFAULT 0,
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla pipeline_activities
CREATE TABLE IF NOT EXISTS pipeline_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES pipeline_cards(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_activities ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pipeline_stages
CREATE POLICY "Allow public read access to pipeline stages"
  ON pipeline_stages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on pipeline stages"
  ON pipeline_stages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on pipeline stages"
  ON pipeline_stages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on pipeline stages"
  ON pipeline_stages FOR DELETE
  TO authenticated
  USING (true);

-- Políticas RLS para pipeline_cards
CREATE POLICY "Allow public read access to pipeline cards"
  ON pipeline_cards FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on pipeline cards"
  ON pipeline_cards FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on pipeline cards"
  ON pipeline_cards FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on pipeline cards"
  ON pipeline_cards FOR DELETE
  TO authenticated
  USING (true);

-- Políticas RLS para pipeline_activities
CREATE POLICY "Allow public read access to pipeline activities"
  ON pipeline_activities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on pipeline activities"
  ON pipeline_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on pipeline activities"
  ON pipeline_activities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on pipeline activities"
  ON pipeline_activities FOR DELETE
  TO authenticated
  USING (true);

-- Insertar etapas predefinidas del pipeline de ventas
INSERT INTO pipeline_stages (name, "order", color) VALUES
  ('Contacto Inicial', 1, '#3B82F6'),
  ('Calificación', 2, '#8B5CF6'),
  ('Cotización', 3, '#F59E0B'),
  ('Negociación', 4, '#EC4899'),
  ('Cierre Pendiente', 5, '#10B981'),
  ('Ganado', 6, '#22C55E'),
  ('Perdido', 7, '#EF4444')
ON CONFLICT DO NOTHING;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_pipeline_cards_stage ON pipeline_cards(stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_cards_customer ON pipeline_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_activities_card ON pipeline_activities(card_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_cards_updated ON pipeline_cards(updated_at DESC);