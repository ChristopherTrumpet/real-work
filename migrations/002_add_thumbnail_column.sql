-- Add thumbnail_url to posts table
alter table public.posts add column if not exists thumbnail_url text;

-- Create storage bucket for thumbnails if it doesn't exist
-- Note: This might need to be run manually in Supabase Dashboard if the service role doesn't have permissions
-- But we'll include it for completeness.
insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

-- Set up storage policies for thumbnails
create policy "Thumbnails are publicly readable"
  on storage.objects for select using (bucket_id = 'thumbnails');

create policy "Users can upload their own thumbnails"
  on storage.objects for insert with check (
    bucket_id = 'thumbnails' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own thumbnail object"
  on storage.objects for update using (
    bucket_id = 'thumbnails' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own thumbnail object"
  on storage.objects for delete using (
    bucket_id = 'thumbnails' and auth.uid()::text = (storage.foldername(name))[1]
  );
