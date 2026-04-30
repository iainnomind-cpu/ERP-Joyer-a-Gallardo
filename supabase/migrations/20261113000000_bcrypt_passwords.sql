-- Enable pgcrypto extension for bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash all existing plain-text passwords using bcrypt
UPDATE users
SET password_hash = crypt(password_hash, gen_salt('bf', 8))
WHERE password_hash NOT LIKE '$2a$%'
  AND password_hash NOT LIKE '$2b$%';

-- Create a secure login function that verifies bcrypt hashes
CREATE OR REPLACE FUNCTION verify_login(
  p_username TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  email TEXT,
  role TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.full_name,
    u.email,
    u.role::TEXT,
    u.is_active
  FROM users u
  WHERE u.username = p_username
    AND u.password_hash = crypt(p_password, u.password_hash)
    AND u.is_active = true;
END;
$$;

-- Create a function to hash passwords when creating/updating users
CREATE OR REPLACE FUNCTION hash_user_password()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only hash if password_hash changed and is not already a bcrypt hash
  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash
     AND NEW.password_hash NOT LIKE '$2a$%'
     AND NEW.password_hash NOT LIKE '$2b$%' THEN
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf', 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-hash passwords on INSERT
CREATE OR REPLACE FUNCTION hash_user_password_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.password_hash NOT LIKE '$2a$%'
     AND NEW.password_hash NOT LIKE '$2b$%' THEN
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf', 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_hash_password_update ON users;
CREATE TRIGGER trigger_hash_password_update
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION hash_user_password();

DROP TRIGGER IF EXISTS trigger_hash_password_insert ON users;
CREATE TRIGGER trigger_hash_password_insert
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION hash_user_password_insert();
