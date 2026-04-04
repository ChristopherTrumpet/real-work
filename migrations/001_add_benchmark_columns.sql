-- Migration: Add benchmark columns to posts table
-- Run this in the Supabase SQL Editor to resolve "column not found" errors.

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS benchmark_language text CHECK (benchmark_language IN ('c', 'typescript', 'rust', 'java', 'python')),
ADD COLUMN IF NOT EXISTS benchmark_gold_code text,
ADD COLUMN IF NOT EXISTS benchmark_test_cases jsonb,
ADD COLUMN IF NOT EXISTS benchmark_timeout_ms integer DEFAULT 10000,
ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false;

-- Optional: Reload schema if column still doesn't show up immediately
-- NOTIFY pgrst, 'reload schema';
