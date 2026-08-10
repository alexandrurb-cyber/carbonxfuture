-- ============================================================
-- CXF — CRM Pro: contacts (members + leads) and activity timeline
-- Supabase → SQL Editor → New query → paste ONLY this → Run
-- Safe to re-run. Does NOT touch existing data.
-- Powers /portal/crm.html
-- ============================================================

-- Contacts: every CRM record. member_id links a contact to a portal
-- member (when they have an account); pure leads have member_id NULL.
create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  company text,
  contact_name text,
  email text,
  phone text,
  website text,
  country text,
  city text,
  address text,
  source text,
  tags text,
  stage text not null default 'lead',      -- lead | contacted | quoted | negotiation | customer | lost
  deal_value numeric,                      -- estimated USD value of the open opportunity
  next_action text,                        -- e.g. "Call about Q4 offtake"
  next_action_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists crm_contacts_member_uq on public.crm_contacts(member_id) where member_id is not null;
create index if not exists crm_contacts_stage_ix on public.crm_contacts(stage);
create index if not exists crm_contacts_next_ix on public.crm_contacts(next_action_date);

-- Activity timeline: notes, calls, emails, meetings, stage changes
create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  kind text not null default 'note',       -- note | call | email | meeting | task | stage
  body text not null,
  author text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists crm_activities_contact_ix on public.crm_activities(contact_id);

-- RLS: desk only, for everything
alter table public.crm_contacts enable row level security;
alter table public.crm_activities enable row level security;

do $$ begin
  create policy "crmc_admin_all" on public.crm_contacts for all
    using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "crma_admin_all" on public.crm_activities for all
    using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;

select 'CRM Pro installed — open /portal/crm.html' as result;
