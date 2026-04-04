-- 1. Create a table for public profiles (Extended for a social media site)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
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

-- 2. Create a generic "posts" table (challenges / uploaded content)
create table posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  content_url text,
  tags text[] not null default '{}',
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  number_of_completions bigint not null default 0 check (number_of_completions >= 0),
  average_rating numeric(4, 2) check (average_rating is null or (average_rating >= 1 and average_rating <= 5)),
  ratings_count integer not null default 0 check (ratings_count >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table posts enable row level security;
create policy "Posts are viewable by everyone." on posts for select using (true);
create policy "Users can insert their own posts." on posts for insert with check (auth.uid() = user_id);
create policy "Users can update their own posts." on posts for update using (auth.uid() = user_id);
create policy "Users can delete their own posts." on posts for delete using (auth.uid() = user_id);

-- 3. Create a table for liked/favorited objects
create table user_likes (
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

alter table user_likes enable row level security;
create policy "Likes are viewable by everyone." on user_likes for select using (true);
create policy "Users can insert their own likes." on user_likes for insert with check (auth.uid() = user_id);
create policy "Users can delete their own likes." on user_likes for delete using (auth.uid() = user_id);

-- 4. Create a table for completed objects
create table user_completions (
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

alter table user_completions enable row level security;
create policy "Completions are viewable by everyone." on user_completions for select using (true);
create policy "Users can insert their own completions." on user_completions for insert with check (auth.uid() = user_id);
create policy "Users can delete their own completions." on user_completions for delete using (auth.uid() = user_id);

-- 4b. Per-user ratings for challenges (1–5 stars); users can track what they rated via this table
create table post_ratings (
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

alter table post_ratings enable row level security;
create policy "Post ratings are viewable by everyone." on post_ratings for select using (true);
create policy "Users can insert their own ratings." on post_ratings for insert with check (auth.uid() = user_id);
create policy "Users can update their own ratings." on post_ratings for update using (auth.uid() = user_id);
create policy "Users can delete their own ratings." on post_ratings for delete using (auth.uid() = user_id);

create or replace function public.touch_post_ratings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_post_ratings_updated_at on public.post_ratings;
create trigger trg_post_ratings_updated_at
  before update on public.post_ratings
  for each row execute function public.touch_post_ratings_updated_at();

create index if not exists idx_post_ratings_post_id on public.post_ratings (post_id);
create index if not exists idx_post_ratings_user_id on public.post_ratings (user_id);

-- 4c. Keep posts.number_of_completions in sync with user_completions
create or replace function public.sync_post_completion_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts
    set number_of_completions = number_of_completions + 1
    where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts
    set number_of_completions = greatest(0::bigint, number_of_completions - 1)
    where id = old.post_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_user_completions_bump_count on public.user_completions;
create trigger trg_user_completions_bump_count
  after insert or delete on public.user_completions
  for each row execute function public.sync_post_completion_count();

-- 4d. Keep posts.average_rating and posts.ratings_count in sync with post_ratings
create or replace function public.sync_post_rating_aggregate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.post_id, old.post_id);
  v_count integer;
  v_avg numeric(4, 2);
begin
  select count(*)::integer, round(avg(rating)::numeric, 2)
  into v_count, v_avg
  from public.post_ratings
  where post_id = target;

  if v_count = 0 then
    update public.posts
    set ratings_count = 0, average_rating = null
    where id = target;
  else
    update public.posts
    set ratings_count = v_count, average_rating = v_avg
    where id = target;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_post_ratings_aggregate on public.post_ratings;
create trigger trg_post_ratings_aggregate
  after insert or update or delete on public.post_ratings
  for each row execute function public.sync_post_rating_aggregate();

-- 4e. Comments on challenges (cascade when post or author profile is removed)
create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and char_length(body) <= 10000),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table post_comments enable row level security;
create policy "Comments are viewable by everyone." on post_comments for select using (true);
create policy "Authenticated users can comment." on post_comments for insert with check (auth.uid() = user_id);
create policy "Users can update own comments." on post_comments for update using (auth.uid() = user_id);
create policy "Users can delete own comments." on post_comments for delete using (auth.uid() = user_id);
create policy "Post authors can delete comments on their posts." on post_comments for delete using (
  exists (select 1 from public.posts p where p.id = post_comments.post_id and p.user_id = auth.uid())
);

create or replace function public.touch_post_comments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_post_comments_updated_at on public.post_comments;
create trigger trg_post_comments_updated_at
  before update on public.post_comments
  for each row execute function public.touch_post_comments_updated_at();

create index if not exists idx_post_comments_post_created on public.post_comments (post_id, created_at desc);
create index if not exists idx_post_comments_user_id on public.post_comments (user_id);

grant select on public.post_comments to anon, authenticated;
grant insert, update, delete on public.post_comments to authenticated;

-- 5. Indexes for stats / contribution heatmap queries
create index if not exists idx_posts_tags on public.posts using gin (tags);
create index if not exists idx_posts_difficulty on public.posts (difficulty);
create index if not exists idx_user_completions_user_completed_at on public.user_completions (user_id, completed_at desc);

-- 6. Per-user problem stats (one row per profile; zeros when nothing solved yet)
--    Use for totals and difficulty breakdown on profile or leaderboard-style UIs.
create or replace view public.user_problem_statistics
with (security_invoker = true) as
select
  pr.id as user_id,
  count(uc.post_id)::bigint as problems_solved,
  count(uc.post_id) filter (where p.difficulty = 'easy')::bigint as easy_solved,
  count(uc.post_id) filter (where p.difficulty = 'medium')::bigint as medium_solved,
  count(uc.post_id) filter (where p.difficulty = 'hard')::bigint as hard_solved
from public.profiles pr
left join public.user_completions uc on uc.user_id = pr.id
left join public.posts p on p.id = uc.post_id
group by pr.id;

comment on view public.user_problem_statistics is 'Aggregate solved counts per user with breakdown by challenge difficulty.';

-- 7. Normalized breakdown (one row per user + difficulty); useful for charts with custom grouping
create or replace view public.user_solves_by_difficulty
with (security_invoker = true) as
select
  uc.user_id,
  p.difficulty,
  count(*)::bigint as solved_count
from public.user_completions uc
inner join public.posts p on p.id = uc.post_id
group by uc.user_id, p.difficulty;

comment on view public.user_solves_by_difficulty is 'Solved count per user grouped by difficulty (only rows where count > 0).';

-- 8. GitHub-style contribution grid: UTC calendar date -> how many problems solved that day
--    Client: bucket last 53 weeks, sum(solves_count) per cell; color by intensity like GitHub.
create or replace view public.user_daily_solve_activity
with (security_invoker = true) as
select
  user_id,
  (completed_at at time zone 'utc')::date as activity_date,
  count(*)::integer as solves_count
from public.user_completions
group by user_id, (completed_at at time zone 'utc')::date;

comment on view public.user_daily_solve_activity is 'Daily solved counts in UTC for contribution-calendar / heatmap UIs.';

grant select on public.user_problem_statistics to anon, authenticated;
grant select on public.user_solves_by_difficulty to anon, authenticated;
grant select on public.user_daily_solve_activity to anon, authenticated;

grant select on public.post_ratings to anon, authenticated;
grant insert, update, delete on public.post_ratings to authenticated;

-- 8b. Summary of how actively a user rates challenges (for profile / tracking)
create or replace view public.user_rating_statistics
with (security_invoker = true) as
select
  pr.id as user_id,
  coalesce(r.ratings_given, 0)::bigint as ratings_given,
  r.average_stars_given
from public.profiles pr
left join lateral (
  select
    count(*)::bigint as ratings_given,
    round(avg(pr2.rating)::numeric, 2) as average_stars_given
  from public.post_ratings pr2
  where pr2.user_id = pr.id
) r on true;

comment on view public.user_rating_statistics is 'How many challenges the user has rated and the average star value they give.';

grant select on public.user_rating_statistics to anon, authenticated;

-- 9. Trigger to automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, username, avatar_url, website, bio)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'website',
    new.raw_user_meta_data->>'bio'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 10. Function to completely delete a user account from auth.users (cascades to profiles and posts)
create or replace function public.delete_user()
returns void
language plpgsql
security definer
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_user() to authenticated;

-- -----------------------------------------------------------------------------
-- Existing database migrations (run in order as needed):
--
-- Tags on posts:
--   alter table public.posts add column if not exists tags text[] not null default '{}';
--   create index if not exists idx_posts_tags on public.posts using gin (tags);
--
-- Difficulty:
--   alter table public.posts
--     add column if not exists difficulty text not null default 'medium'
--     check (difficulty in ('easy', 'medium', 'hard'));
--
-- Completion / rating counters on posts:
--   alter table public.posts add column if not exists number_of_completions bigint not null default 0;
--   alter table public.posts add constraint posts_number_of_completions_nonneg check (number_of_completions >= 0);
--   alter table public.posts add column if not exists average_rating numeric(4,2);
--   alter table public.posts add column if not exists ratings_count integer not null default 0;
--   -- backfill completion counts, then add triggers from sections 4c–4d and post_ratings (4b).
--   update public.posts p set number_of_completions = (select count(*)::bigint from public.user_completions uc where uc.post_id = p.id);
--
-- Cascading deletes (replace constraint names if yours differ; inspect with \d table in psql):
--   alter table public.profiles drop constraint profiles_id_fkey;
--   alter table public.profiles add constraint profiles_id_fkey
--     foreign key (id) references auth.users(id) on delete cascade;
--
--   alter table public.posts drop constraint posts_user_id_fkey;
--   alter table public.posts add constraint posts_user_id_fkey
--     foreign key (user_id) references public.profiles(id) on delete cascade;
--
--   alter table public.user_likes drop constraint user_likes_user_id_fkey;
--   alter table public.user_likes add constraint user_likes_user_id_fkey
--     foreign key (user_id) references public.profiles(id) on delete cascade;
--   alter table public.user_likes drop constraint user_likes_post_id_fkey;
--   alter table public.user_likes add constraint user_likes_post_id_fkey
--     foreign key (post_id) references public.posts(id) on delete cascade;
--
--   alter table public.user_completions drop constraint user_completions_user_id_fkey;
--   alter table public.user_completions add constraint user_completions_user_id_fkey
--     foreign key (user_id) references public.profiles(id) on delete cascade;
--   alter table public.user_completions drop constraint user_completions_post_id_fkey;
--   alter table public.user_completions add constraint user_completions_post_id_fkey
--     foreign key (post_id) references public.posts(id) on delete cascade;
--
--   alter table public.post_ratings drop constraint post_ratings_user_id_fkey;
--   alter table public.post_ratings add constraint post_ratings_user_id_fkey
--     foreign key (user_id) references public.profiles(id) on delete cascade;
--   -- post_id may already be cascade; ensure:
--   alter table public.post_ratings drop constraint post_ratings_post_id_fkey;
--   alter table public.post_ratings add constraint post_ratings_post_id_fkey
--     foreign key (post_id) references public.posts(id) on delete cascade;
--
-- Comments: create table post_comments and policies from section 4e in this file.
--
-- Then create indexes, views, grants, and triggers from this file as required.
-- -----------------------------------------------------------------------------