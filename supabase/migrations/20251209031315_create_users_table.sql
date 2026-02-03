/*
  # Crear tabla de usuarios/vendedores

  1. Nueva Tabla
    - `users`
      - `id` (uuid, primary key, auto-generado)
      - `username` (text, unique, not null) - Nombre de usuario único
      - `full_name` (text, not null) - Nombre completo del usuario
      - `email` (text, unique, opcional) - Correo electrónico
      - `role` (text, not null) - Rol del usuario: admin, vendedor, cajero
      - `is_active` (boolean, default true) - Estado activo/inactivo
      - `password_hash` (text, not null) - Contraseña (texto plano en desarrollo)
      - `created_at` (timestamptz, default now) - Fecha de creación
      - `updated_at` (timestamptz, default now) - Fecha de última actualización

  2. Índices
    - Índice en `username` para búsquedas rápidas
    - Índice en `role` para filtrado por rol
    - Índice en `is_active` para filtrado por estado

  3. Seguridad
    - Habilitar RLS en la tabla `users`
    - Políticas para permitir acceso a usuarios autenticados y anónimos (desarrollo)

  4. Datos Iniciales
    - Usuario administrador por defecto
    - Usuarios de ejemplo (vendedores y cajero)
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE,
  role text NOT NULL CHECK (role IN ('admin', 'vendedor', 'cajero')),
  is_active boolean DEFAULT true,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to users" ON users;
CREATE POLICY "Allow read access to users"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert access to users" ON users;
CREATE POLICY "Allow insert access to users"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access to users" ON users;
CREATE POLICY "Allow update access to users"
  ON users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete access to users" ON users;
CREATE POLICY "Allow delete access to users"
  ON users
  FOR DELETE
  TO anon, authenticated
  USING (true);

INSERT INTO users (username, full_name, email, role, password_hash, is_active)
VALUES ('admin', 'Administrador', 'admin@gallardojoyas.com', 'admin', 'admin', true)
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, full_name, email, role, password_hash, is_active)
VALUES 
  ('vendedor1', 'María González', 'maria@gallardojoyas.com', 'vendedor', 'vendedor1', true),
  ('vendedor2', 'Juan Pérez', 'juan@gallardojoyas.com', 'vendedor', 'vendedor2', true),
  ('cajero1', 'Ana López', 'ana@gallardojoyas.com', 'cajero', 'cajero1', true)
ON CONFLICT (username) DO NOTHING;

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;
CREATE TRIGGER trigger_update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();