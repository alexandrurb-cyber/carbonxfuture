-- ============================================================
-- CXF — add-on: EPA compliance in the CRM
-- EPA ID on every contact/member, licenses & permits with expiry
-- tracking, and declared-quantity reports (EPA/state forms).
-- Supabase → SQL Editor → New query → paste ONLY this → Run
-- Safe to re-run. Does NOT touch existing data.
-- ============================================================

-- EPA ID (RCRA identification number) on both members and CRM contacts
alter table public.members      add column if not exists epa_id text;
alter table public.crm_contacts add column if not exists epa_id text;

-- Licenses & permits per contact (EPA ID cert, state permits,
-- transporter licenses, insurance…) with expiry dates
create table if not exists public.crm_licenses (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  kind text not null default 'State permit',   -- EPA ID | State permit | Transporter license | Processor permit | Insurance | Other
  number text,
  issuer text,                                  -- e.g. "EPA Region 4", "FDEP"
  expiry_date date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists crm_licenses_contact_ix on public.crm_licenses(contact_id);
create index if not exists crm_licenses_expiry_ix on public.crm_licenses(expiry_date);

-- Declared quantities per reporting period (monthly/annual EPA & state forms)
create table if not exists public.crm_epa_reports (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  period text not null,                         -- 'YYYY' or 'YYYY-MM'
  form text not null default 'State annual report',  -- EPA 8700-12 | EPA 8700-13A/B | State annual report | State monthly report | Other
  gallons numeric,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists crm_epa_reports_contact_ix on public.crm_epa_reports(contact_id);

-- RLS: desk only
alter table public.crm_licenses enable row level security;
alter table public.crm_epa_reports enable row level security;

do $$ begin
  create policy "crml_admin_all" on public.crm_licenses for all
    using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "crme_admin_all" on public.crm_epa_reports for all
    using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;

select 'EPA compliance installed' as result;
