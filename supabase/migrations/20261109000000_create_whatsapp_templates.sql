CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'MARKETING', -- MARKETING, UTILITY, AUTHENTICATION
  language VARCHAR(10) NOT NULL DEFAULT 'es_MX',
  components JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of components (HEADER, BODY, FOOTER, BUTTONS)
  meta_template_id VARCHAR(255), -- ID de Meta cuando es aprobada
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING, APPROVED, REJECTED
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to whatsapp_templates"
  ON whatsapp_templates FOR ALL
  USING (true)
  WITH CHECK (true);
