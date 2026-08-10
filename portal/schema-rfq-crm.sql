-- ============================================================
-- CXF — add-on: link RFQs to CRM contacts (auto-lead creation)
-- Supabase → SQL Editor → New query → paste ONLY this → Run
-- Safe to re-run.
-- ============================================================

alter table public.rfqs add column if not exists crm_contact_id uuid references public.crm_contacts(id) on delete set null;

select 'RFQ → CRM link installed' as result;
