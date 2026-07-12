-- ============================================================
-- CXF Portal — Database schema v1
-- Run ONCE in Supabase: Dashboard → SQL Editor → paste → Run
-- ============================================================

create type member_type as enum ('collector','rerefiner','project_developer','buyer');
create type member_status as enum ('pending','approved','rejected','suspended');
create type review_status as enum ('submitted','validated','rejected','changes_requested');

-- Members: one row per approved counterparty (linked to their login)
create table public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  contact_name text,
  company text,
  member_type member_type,
  status member_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- KYC / project documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  doc_type text,
  file_name text not null,
  storage_path text not null,
  status review_status not null default 'submitted',
  uploaded_at timestamptz not null default now()
);

-- Monthly activity reports (litres -> indicative tCO2e)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  period text not null,                -- 'YYYY-MM'
  activity text not null,              -- collection | collection_rerefining | full_chain
  litres numeric not null check (litres > 0),
  computed_tco2e numeric not null,
  evidence_path text,
  status review_status not null default 'submitted',
  admin_notes text,
  created_at timestamptz not null default now()
);

-- Marketplace listings (created ONLY by admin validation)
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  report_id uuid references public.reports(id),
  name text not null,
  reg text not null default 'cxf',
  badge text not null default '⬡ CXF',
  type text not null default 'Waste oil',
  vintage text not null,
  volume numeric not null,
  price numeric,
  registry_serial text,               -- filled only if/when registry-issued
  status text not null default 'published',  -- published | withdrawn | sold
  validated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  target text,
  at timestamptz not null default now()
);

-- ---------- Admin check (Alexandru's login emails) ----------
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '')
         in ('desk@carbonxfuture.com','alexandrurb@icloud.com')
$$;

-- ---------- Row Level Security ----------
alter table public.members   enable row level security;
alter table public.documents enable row level security;
alter table public.reports   enable row level security;
alter table public.listings  enable row level security;
alter table public.audit_log enable row level security;

-- members: each member sees & edits only their own row; admin sees all
create policy "members_select" on public.members for select
  using (auth.uid() = id or public.is_admin());
create policy "members_insert_own_pending" on public.members for insert
  with check (auth.uid() = id and status = 'pending');
create policy "members_update" on public.members for update
  using (auth.uid() = id or public.is_admin());

-- members cannot change their own status/type/email (only admin can)
create or replace function public.protect_member_fields() returns trigger
language plpgsql security definer as $$
begin
  if not public.is_admin() then
    new.status      := old.status;
    new.member_type := coalesce(old.member_type, new.member_type);
    new.email       := old.email;
  end if;
  return new;
end $$;
create trigger trg_protect_member before update on public.members
  for each row execute function public.protect_member_fields();

-- documents: own rows only; admin reviews
create policy "documents_select" on public.documents for select
  using (member_id = auth.uid() or public.is_admin());
create policy "documents_insert" on public.documents for insert
  with check (member_id = auth.uid());
create policy "documents_admin_update" on public.documents for update
  using (public.is_admin());

-- reports: own rows only; admin validates
create policy "reports_select" on public.reports for select
  using (member_id = auth.uid() or public.is_admin());
create policy "reports_insert" on public.reports for insert
  with check (member_id = auth.uid());
create policy "reports_admin_update" on public.reports for update
  using (public.is_admin());

-- listings: published rows are PUBLIC (marketplace); writing is admin-only
create policy "listings_public_read" on public.listings for select
  using (status = 'published' or member_id = auth.uid() or public.is_admin());
create policy "listings_admin_insert" on public.listings for insert
  with check (public.is_admin());
create policy "listings_admin_update" on public.listings for update
  using (public.is_admin());

-- audit log
create policy "audit_admin_read" on public.audit_log for select
  using (public.is_admin());
create policy "audit_insert" on public.audit_log for insert
  with check (auth.uid() is not null);

-- ---------- Private storage for member documents ----------
insert into storage.buckets (id, name, public) values ('member-docs','member-docs', false);

create policy "storage_upload_own_folder" on storage.objects for insert
  with check (bucket_id = 'member-docs'
              and auth.uid()::text = (storage.foldername(name))[1]);
create policy "storage_read_own_or_admin" on storage.objects for select
  using (bucket_id = 'member-docs'
         and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin()));
