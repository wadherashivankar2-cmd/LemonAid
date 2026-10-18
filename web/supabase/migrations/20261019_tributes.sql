-- ==============================================================================
-- Supabase Migration: Tributes Counter Table & Atomic Increment RPC
-- ==============================================================================

-- 1. Create tributes table
CREATE TABLE IF NOT EXISTS tributes (
  id INT PRIMARY KEY DEFAULT 1,
  count BIGINT NOT NULL DEFAULT 1420,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Ensure initial row with id=1 exists
INSERT INTO tributes (id, count)
VALUES (1, 1420)
ON CONFLICT (id) DO NOTHING;

-- 3. Atomic increment RPC function
CREATE OR REPLACE FUNCTION increment_tribute()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE tributes
  SET count = count + 1, updated_at = timezone('utc'::text, now())
  WHERE id = 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;
