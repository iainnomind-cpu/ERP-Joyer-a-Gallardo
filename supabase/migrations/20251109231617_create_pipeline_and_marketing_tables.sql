/*
  # Sistema Kanban Pipeline y Marketing con acceso anónimo

  1. Nuevas Tablas Pipeline
    - `pipeline_stages` - Etapas del pipeline de ventas
    - `pipeline_cards` - Tarjetas/oportunidades de venta
    - `pipeline_activities` - Actividades y seguimiento

  2. Nuevas Tablas Marketing
    - `marketing_campaigns` - Campañas de marketing
    - `marketing_segments` - Segmentos de audiencia
    - `marketing_automations` - Automatizaciones

  3. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas permisivas para anon y authenticated

  4. Datos Iniciales
    - Etapas predefinidas del pipeline de ventas
*/

-- Sistema Pipeline de Ventas
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  "order" integer NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  stage_id uuid REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  estimated_value numeric DEFAULT 0,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to text DEFAULT '',
  "order" integer DEFAULT 0,
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES pipeline_cards(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Sistema de Marketing
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text DEFAULT 'promotional',
  status text DEFAULT 'draft',
  channel text DEFAULT 'whatsapp',
  message_template text NOT NULL,
  scheduled_date timestamptz,
  target_segment jsonb DEFAULT '{}'::jsonb,
  stats jsonb DEFAULT '{"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "failed": 0}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketing_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  filters jsonb DEFAULT '{}'::jsonb,
  customer_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketing_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  message_template text NOT NULL,
  channel text DEFAULT 'whatsapp',
  is_active boolean DEFAULT true,
  last_run timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_pipeline_cards_stage ON pipeline_cards(stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_cards_customer ON pipeline_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_activities_card ON pipeline_activities(card_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_cards_updated ON pipeline_cards(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_scheduled ON marketing_campaigns(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_marketing_automations_active ON marketing_automations(is_active);

-- Habilitar RLS en todas las tablas
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_automations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS permisivas
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

CREATE POLICY "Allow all access to marketing_campaigns"
  ON marketing_campaigns FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to marketing_segments"
  ON marketing_segments FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to marketing_automations"
  ON marketing_automations FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Datos iniciales: Etapas del pipeline
INSERT INTO pipeline_stages (name, "order", color) VALUES
  ('Contacto Inicial', 1, '#3B82F6'),
  ('Calificación', 2, '#8B5CF6'),
  ('Cotización', 3, '#F59E0B'),
  ('Negociación', 4, '#EC4899'),
  ('Cierre Pendiente', 5, '#10B981'),
  ('Ganado', 6, '#22C55E'),
  ('Perdido', 7, '#EF4444')
ON CONFLICT DO NOTHING;
