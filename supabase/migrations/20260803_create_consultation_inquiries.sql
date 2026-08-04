create extension if not exists pgcrypto;

create table if not exists public.consultation_inquiries (
  id uuid primary key default gen_random_uuid(),
  receipt_id text not null unique,
  brand text not null,
  contact_name text not null,
  phone text not null,
  industry text not null,
  email text not null,
  services text[] not null default '{}',
  quantity text,
  desired_date date,
  message text,
  channel text not null check (channel in ('sms', 'open_kakao', 'website')),
  consent boolean not null check (consent = true),
  status text not null default 'new' check (status in ('new', 'contacting', 'in_progress', 'completed', 'cancelled')),
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.consultation_inquiries enable row level security;

revoke all on public.consultation_inquiries from anon, authenticated;

-- New Supabase projects require explicit Data API grants. The server-only
-- Secret key maps to service_role, which only needs INSERT for this endpoint.
grant usage on schema public to service_role;
grant insert on public.consultation_inquiries to service_role;

create index if not exists consultation_inquiries_created_at_idx
  on public.consultation_inquiries (created_at desc);

create index if not exists consultation_inquiries_status_idx
  on public.consultation_inquiries (status, created_at desc);

comment on table public.consultation_inquiries is
  'Website consultation submissions. Access only through the server API using the service role.';
