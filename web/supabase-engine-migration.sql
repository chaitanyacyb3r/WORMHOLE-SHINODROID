-- ── ShinobiDroid Phase 0 Migration: Engine Architecture Support ───────────
-- Adds columns needed by the modular engine architecture.
-- Run this AFTER supabase-schema.sql and supabase-dynamic-migration.sql.

-- 1. Add 'engine' column to findings table (which engine produced the finding)
ALTER TABLE findings ADD COLUMN IF NOT EXISTS engine TEXT DEFAULT 'mobsf';

-- 2. Add 'owasp_masvs' column (MASVS test ID like MSTG-STORAGE-3)
ALTER TABLE findings ADD COLUMN IF NOT EXISTS owasp_masvs TEXT;

-- 3. Index for filtering by engine
CREATE INDEX IF NOT EXISTS idx_findings_engine ON findings(engine);
