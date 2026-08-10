// CXF — automatic weekly backup: dumps every table and emails the JSON
// to the desk as an attachment via Resend.
//
// Triggered two ways:
//   1. Vercel Cron (see vercel.json "crons") — Monday 11:00 UTC.
//      If CRON_SECRET is set in Vercel env, the cron request carries
//      Authorization: Bearer <CRON_SECRET> and is verified here.
//   2. Manually from Desk Admin (Backup card) with an admin session token.
//
// Required Vercel environment variables:
//   SUPABASE_SERVICE_KEY — Supabase service_role key (Dashboard → Settings → API)
//   RESEND_API_KEY       — already configured for the newsletter
//   CRON_SECRET          — recommended; any long random string

const ADMIN_EMAILS = ['desk@carbonxfuture.com', 'alexandrurb@icloud.com'];
const SUPABASE_URL = 'https://zohskwbavtzvecqziklq.supabase.co';
const SUPABASE_ANON = 'sb_publishable_K-4sl6hEk75fByleZEZcfA_f_Zha9aI';
const FROM = 'CarbonXFuture Desk <desk@carbonxfuture.com>';
const TO = 'desk@carbonxfuture.com';
const TABLES = ['members','member_notes','crm_contacts','crm_activities','reports','documents','listings','cxf_projects','rfqs','certificates','price_history','newsletter_subscribers','audit_log','oil_listings','registry_units'];

export default async function handler(req, res) {
  const service = process.env.SUPABASE_SERVICE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!service) return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY not configured in Vercel env' });
  if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  // --- Authorization: Vercel cron secret OR a signed-in admin ---
  const auth = req.headers.authorization || '';
  let allowed = false;
  if (process.env.CRON_SECRET && auth === 'Bearer ' + process.env.CRON_SECRET) allowed = true;
  if (!allowed && auth.startsWith('Bearer ')) {
    try {
      const u = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: { apikey: SUPABASE_ANON, Authorization: auth }
      });
      if (u.ok) {
        const user = await u.json();
        if (ADMIN_EMAILS.includes((user.email || '').toLowerCase())) allowed = true;
      }
    } catch (e) {}
  }
  // If no CRON_SECRET is configured, accept Vercel's own cron calls
  // (identified by the x-vercel-cron header set by the platform).
  if (!allowed && !process.env.CRON_SECRET && req.headers['x-vercel-cron']) allowed = true;
  if (!allowed) return res.status(401).json({ error: 'Not authorized' });

  // --- Dump all tables with the service role (bypasses RLS, read-only use) ---
  const backup = { exported_at: new Date().toISOString(), exported_by: 'auto-backup', tables: {} };
  for (const t of TABLES) {
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/' + t + '?select=*&limit=10000', {
        headers: { apikey: service, Authorization: 'Bearer ' + service }
      });
      backup.tables[t] = r.ok ? await r.json() : { error: 'HTTP ' + r.status };
    } catch (e) { backup.tables[t] = { error: e.message }; }
  }

  const date = new Date().toISOString().slice(0, 10);
  const json = JSON.stringify(backup);
  const counts = TABLES.map(t => t + ': ' + (Array.isArray(backup.tables[t]) ? backup.tables[t].length : 'ERR')).join('<br/>');

  // --- Email it via Resend as an attachment ---
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + resendKey },
    body: JSON.stringify({
      from: FROM, to: [TO],
      subject: 'CXF weekly backup — ' + date,
      html: '<p>Automatic weekly backup of the CarbonXFuture platform database, attached as JSON.</p>'
          + '<p style="font-family:monospace;font-size:12px;">' + counts + '</p>'
          + '<p>Keep this email — it is your off-site backup. Storage PDFs are not included; download important documents from the Desk Admin Documents card.</p>',
      attachments: [{ filename: 'cxf-backup-' + date + '.json', content: Buffer.from(json).toString('base64') }]
    })
  });
  if (!r.ok) {
    const err = await r.text();
    return res.status(502).json({ error: 'Backup built but email failed: ' + err.slice(0, 300) });
  }
  return res.status(200).json({ ok: true, date, size_bytes: json.length });
}
