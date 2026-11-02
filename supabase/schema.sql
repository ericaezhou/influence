-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
create table if not exists public.influence_waitlist (
  email          text primary key,
  plan           text,                -- 'free' or 'pro': which tier they said they want
  conversation   text,                -- raise, offer, boss, deal, repair, debate, other
  spar_format    text,                -- camera, voice, masked, friend
  source         text,                -- utm_source or ref from the link they arrived on
  referrer       text,
  demo_completed boolean not null default false,
  step           text not null default 'hero',  -- 'hero' = email only, 'full' = full form
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Lock the table down: with RLS on and no policies, the public anon key can't read
-- or write it. Only our server (secret / service-role key) can, and it bypasses RLS.
alter table public.influence_waitlist enable row level security;
revoke all on public.influence_waitlist from anon, authenticated;
