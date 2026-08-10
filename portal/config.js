// CXF Portal configuration — these values are public by design.
// Real security is enforced by database Row Level Security policies.
const CXF_SUPABASE_URL = 'https://zohskwbavtzvecqziklq.supabase.co';
const CXF_SUPABASE_KEY = 'sb_publishable_K-4sl6hEk75fByleZEZcfA_f_Zha9aI';
const CXF_ADMIN_EMAILS = ['desk@carbonxfuture.com', 'alexandrurb@icloud.com', 'carbonxfuture@gmail.com'];

// CXF methodology factors (tCO2e per 1,000 litres) — indicative
// INTERIM factors, under external expert review. CXF-CO counterfactual:
// diversion from uncontrolled combustion/disposal without energy displacement.
// CXF-RR: strict ACR-derived net result (baseline minus replacement-fuel leakage).
// CXF-FC: quantification under development — not currently offered.
const CXF_FACTORS = {
  collection:              { factor: 2.85,  label: 'Collection (CXF-CO — interim)' },
  collection_rerefining:   { factor: 0.167, label: 'Re-refining (CXF-RR — strict ACR-derived, interim)' }
};

// Market Access subscriptions ($199 collector / $299 processor, 3-month free trial).
// While CXF_ENFORCE_SUBSCRIPTION is false (launch period), everyone has full access.
// Flip to true to require an active/trial/exempt subscription for market features.
const CXF_ENFORCE_SUBSCRIPTION = false;
const CXF_SUB_OK = ['launch_free', 'trial', 'active', 'exempt'];
