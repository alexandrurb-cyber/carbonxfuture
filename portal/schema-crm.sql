-- ============================================================
-- CXF — add-on: CRM profile fields on members
-- Supabase → SQL Editor → New query → paste ONLY this → Run
-- Safe to re-run. Does NOT touch existing data.
-- Enables the CRM contact book in Desk Admin (phone, location,
-- website, address, source, tags). Notes already exist via
-- schema-member-notes.sql.
-- ============================================================

alter table public.members add column if not exists phone   text;
alter table public.members add column if not exists country text;
alter table public.members add column if not exists city    text;
alter table public.members add column if not exists website text;
alter table public.members add column if not exists address text;
alter table public.members add column if not exists source  text;
alter table public.members add column if not exists tags    text;

-- No new RLS needed: existing policies already restrict members
-- rows to the member themselves or the desk (is_admin()), and
-- admin update is allowed by "members_update".

select 'CRM profile fields installed' as result;
