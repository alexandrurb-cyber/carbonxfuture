-- ============================================================
-- CXF Portal — add-on: public project showcase (run ONCE)
-- Supabase → SQL Editor → paste → Run  (safe to re-run)
-- ============================================================

create table if not exists public.cxf_projects (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  name text not null,
  country text not null default 'USA',
  type text not null default 'Waste oil re-refining',
  vintages text not null default '',
  size text not null default '',
  status text not null default 'published',   -- published | withdrawn
  created_at timestamptz not null default now()
);

alter table public.cxf_projects enable row level security;

do $$ begin
  create policy "cxfp_public_read" on public.cxf_projects for select
    using (status = 'published' or member_id = auth.uid() or public.is_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cxfp_admin_insert" on public.cxf_projects for insert
    with check (public.is_admin());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cxfp_admin_update" on public.cxf_projects for update
    using (public.is_admin());
exception when duplicate_object then null; end $$;

select 'cxf_projects installed' as result;
