/*
  # Sistema Kanban Pipeline con acceso anónimo

  1. Nuevas Tablas
    - `pipeline_stages` - Etapas del pipeline
    - `pipeline_cards` - Tarjetas/oportunidades
    - `pipeline_activities` - Actividades de seguimiento

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas permisivas para anon y authenticated

  3. Datos Iniciales
    - Etapas predefinidas del pipeline de ventas
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

-- Políticas RLS permisivas para anon y authenticated
CREATE POLICY "Allow all access to pipeline_stages"
  ON pipeline_stages FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to pipeline_cards"
  ON pipeline_cards FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to pipeline_activities"
  ON pipeline_activities FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

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
