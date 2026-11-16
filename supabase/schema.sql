-- Run this once in the Supabase SQL editor.
create table if not exists public.site_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row level security on with no policies: the public anon key can read and write nothing.
-- The site's server uses the service role key, which bypasses row level security.
alter table public.site_data enable row level security;
