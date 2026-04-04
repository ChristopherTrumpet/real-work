-- 1. Create a table for public profiles (Extended for a social media site)
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  website text
);

alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- 2. Create a generic "posts" table (represents videos, uploaded objects, etc.)
create table posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  content_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table posts enable row level security;
create policy "Posts are viewable by everyone." on posts for select using (true);
create policy "Users can insert their own posts." on posts for insert with check (auth.uid() = user_id);
create policy "Users can update their own posts." on posts for update using (auth.uid() = user_id);
create policy "Users can delete their own posts." on posts for delete using (auth.uid() = user_id);

-- 3. Create a table for liked/favorited objects
create table user_likes (
  user_id uuid references public.profiles(id) not null,
  post_id uuid references public.posts(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

alter table user_likes enable row level security;
create policy "Likes are viewable by everyone." on user_likes for select using (true);
create policy "Users can insert their own likes." on user_likes for insert with check (auth.uid() = user_id);
create policy "Users can delete their own likes." on user_likes for delete using (auth.uid() = user_id);

-- 4. Create a table for completed objects
create table user_completions (
  user_id uuid references public.profiles(id) not null,
  post_id uuid references public.posts(id) not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

alter table user_completions enable row level security;
create policy "Completions are viewable by everyone." on user_completions for select using (true);
create policy "Users can insert their own completions." on user_completions for insert with check (auth.uid() = user_id);
create policy "Users can delete their own completions." on user_completions for delete using (auth.uid() = user_id);

-- 5. Trigger to automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();