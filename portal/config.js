// CXF Portal configuration — these values are public by design.
// Real security is enforced by database Row Level Security policies.
const CXF_SUPABASE_URL = 'https://zohskwbavtzvecqziklq.supabase.co';
const CXF_SUPABASE_KEY = 'sb_publishable_K-4sl6hEk75fByleZEZcfA_f_Zha9aI';
const CXF_ADMIN_EMAILS = ['desk@carbonxfuture.com', 'alexandrurb@icloud.com'];

// CXF methodology factors (tCO2e per 1,000 litres) — indicative
const CXF_FACTORS = {
  collection:              { factor: 2.85, label: 'Collection only' },
  collection_rerefining:   { factor: 5.1,  label: 'Collection + re-refining' },
  full_chain:              { factor: 6.8,  label: 'Collection + re-refining + distribution' }
};
