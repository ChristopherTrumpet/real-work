-- Migration: Add setup_script column to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS setup_script text;
