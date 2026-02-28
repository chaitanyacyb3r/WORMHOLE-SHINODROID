-- ============================================================
-- ShinobiDroid — Migration: Add Dynamic Analysis Columns
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS dynamic_status TEXT DEFAULT 'not_run'
    CHECK (dynamic_status IN ('not_run', 'pending', 'running', 'completed', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS dynamic_report_json JSONB,
  ADD COLUMN IF NOT EXISTS dynamic_completed_at TIMESTAMPTZ;

-- Index for filtering by dynamic status
CREATE INDEX IF NOT EXISTS idx_scans_dynamic_status ON scans(dynamic_status);