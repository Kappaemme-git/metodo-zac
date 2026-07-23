-- Metodo ZAC lead-magnet backend v1
-- Apply from the Supabase SQL editor or CLI after reviewing owner/privacy details.

create extension if not exists pgcrypto;

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null unique check (email = lower(email)),
  goal text,
  marketing_consent boolean not null default false,
  privacy_version text not null,
  source text not null default 'landing',
  utm jsonb not null default '{}'::jsonb,
  ip_hash text,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questionnaire_submissions (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null check (email = lower(email)),
  age smallint not null check (age between 18 and 99),
  gender text not null check (gender in ('Uomo', 'Donna', 'Preferisco non dirlo')),
  answers jsonb not null,
  improvement_goal text not null,
  motivation text not null,
  score smallint not null check (score between 0 and 100),
  level text not null check (level in ('Principiante', 'Intermedio', 'Avanzato')),
  profile jsonb not null,
  questionnaire_version text not null,
  privacy_version text not null,
  marketing_consent boolean not null default false,
  source text not null default 'questionario',
  utm jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  delivery_token_hash text not null unique,
  ip_hash text,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists questionnaire_submissions_email_idx
  on public.questionnaire_submissions (email);
create index if not exists questionnaire_submissions_created_at_idx
  on public.questionnaire_submissions (created_at desc);
create index if not exists questionnaire_submissions_level_idx
  on public.questionnaire_submissions (level);
create index if not exists questionnaire_submissions_ip_created_idx
  on public.questionnaire_submissions (ip_hash, created_at desc)
  where ip_hash is not null;
create index if not exists waitlist_signups_ip_created_idx
  on public.waitlist_signups (ip_hash, created_at desc)
  where ip_hash is not null;

create table if not exists public.program_config (
  id smallint primary key check (id = 1),
  active boolean not null default false,
  filename text,
  storage_bucket text,
  storage_path text,
  uploaded_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (filename is null and storage_bucket is null and storage_path is null)
    or
    (filename is not null and storage_bucket is not null and storage_path is not null)
  )
);

insert into public.program_config (id, active)
values (1, false)
on conflict (id) do nothing;

alter table public.waitlist_signups enable row level security;
alter table public.questionnaire_submissions enable row level security;
alter table public.program_config enable row level security;

-- The browser never talks to these tables. Only server-side code may access them.
revoke all on public.waitlist_signups from anon, authenticated;
revoke all on public.questionnaire_submissions from anon, authenticated;
revoke all on public.program_config from anon, authenticated;
grant select, insert, update, delete on public.waitlist_signups to service_role;
grant select, insert, update, delete on public.questionnaire_submissions to service_role;
grant select, insert, update, delete on public.program_config to service_role;

-- Private bucket for the free program. Downloads are issued as short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lead-magnets', 'lead-magnets', false, 52428800, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Intentionally no anon/authenticated storage policies: uploads and signatures
-- happen only through the server client using the Supabase secret key.
