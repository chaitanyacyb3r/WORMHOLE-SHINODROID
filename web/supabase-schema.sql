-- ============================================================
-- WORMHOLE // Shinodroid - Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  plan TEXT DEFAULT 'genin' CHECK (plan IN ('genin', 'chunin', 'jonin', 'kage')),
  scans_this_month INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Scans ─────────────────────────────────────────────────
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scanning', 'completed', 'failed')),
  scan_type TEXT DEFAULT 'static',
  -- Finding counts (denormalized for speed)
  findings_critical INTEGER DEFAULT 0,
  findings_high INTEGER DEFAULT 0,
  findings_medium INTEGER DEFAULT 0,
  findings_low INTEGER DEFAULT 0,
  findings_info INTEGER DEFAULT 0,
  -- Report
  report_url TEXT,
  report_json JSONB,
  error_message TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_status ON scans(status);

-- ── Findings ──────────────────────────────────────────────
CREATE TABLE findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  severity_order INTEGER DEFAULT 5,
  category TEXT DEFAULT 'general',
  description TEXT,
  recommendation TEXT,
  cvss_score DECIMAL(3,1),
  owasp_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_findings_scan_id ON findings(scan_id);
CREATE INDEX idx_findings_severity ON findings(severity_order);

-- ── Row Level Security ────────────────────────────────────
-- Users can only see their own data

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Scans: users can CRUD their own
CREATE POLICY "Users can view own scans"
  ON scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create scans"
  ON scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans"
  ON scans FOR UPDATE
  USING (auth.uid() = user_id);

-- Findings: users can read findings for their own scans
CREATE POLICY "Users can view findings for own scans"
  ON findings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scans WHERE scans.id = findings.scan_id AND scans.user_id = auth.uid()
    )
  );

-- Service role can do everything (for the scan worker)
-- The scan worker uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS

-- ── Storage ───────────────────────────────────────────────
-- Create APK storage bucket (do this in Supabase Dashboard -> Storage)
-- Bucket name: apks
-- Public: No
-- File size limit: 100MB
-- Allowed MIME types: application/vnd.android.package-archive, application/octet-stream

-- Storage policies
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('apks', 'apks', false, 104857600)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own APKs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'apks' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can read own APKs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'apks' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- ── Enable Realtime ───────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE scans;
