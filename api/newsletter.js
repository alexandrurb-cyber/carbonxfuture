// CXF — send the Desk Note newsletter to all active subscribers via Resend.
// Requires RESEND_API_KEY in Vercel environment variables.
// Only an authenticated ADMIN session can trigger a send. Subscriber emails
// are read with the admin's own Supabase token (RLS admin-only select).

const ADMIN_EMAILS = ['desk@carbonxfuture.com', 'alexandrurb@icloud.com'];
const SUPABASE_URL = 'https://zohskwbavtzvecqziklq.supabase.co';
const SUPABASE_ANON = 'sb_publishable_K-4sl6hEk75fByleZEZcfA_f_Zha9aI';
const FROM = 'CarbonXFuture Desk <desk@carbonxfuture.com>';

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function wrap(subject, paragraphsHtml) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F5F3;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <div style="background:#1A4A2E;padding:18px 28px;color:#ffffff;font-size:15px;font-weight:bold;">&#11041; CarbonXFuture &middot; Desk Note</div>
    <div style="padding:28px;color:#1E1E1A;font-size:14px;line-height:1.7;">
      <h2 style="margin:0 0 12px;font-size:18px;">${esc(subject)}</h2>
      ${paragraphsHtml}
      <p style="margin-top:24px;"><a href="https://www.carbonxfuture.com/" style="background:#1A4A2E;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;">Read on carbonxfuture.com</a></p>
    </div>
    <div style="padding:16px 28px;color:#8A8A82;font-size:11px;border-top:1px solid #E8E8E4;">
      CarbonXFuture Markets, Inc. &middot; Fort Lauderdale, Florida &middot; desk@carbonxfuture.com<br/>
      You received this because you subscribed on carbonxfuture.com.
      <a href="mailto:desk@carbonxfuture.com?subject=Unsubscribe" style="color:#8A8A82;">Unsubscribe</a>
    </div>
  </div></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  // Verify the caller is a signed-in ADMIN
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing session token' });
  const u = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token }
  });
  if (!u.ok) return res.status(401).json({ error: 'Invalid session' });
  const user = await u.json();
  if (!ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { subject, body } = req.body || {};
  if (!subject || !body || String(subject).length > 200 || String(body).length > 20000) {
    return res.status(400).json({ error: 'Subject and body are required (body max 20,000 chars).' });
  }

  // Read active subscribers with the admin's token (RLS: admin-only select)
  const sr = await fetch(SUPABASE_URL + '/rest/v1/newsletter_subscribers?select=email&status=eq.active', {
    headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token }
  });
  if (!sr.ok) return res.status(502).json({ error: 'Could not read subscriber list' });
  const subscribers = await sr.json();
  if (!subscribers.length) return res.status(400).json({ error: 'No active subscribers yet.' });

  // Plain text → simple paragraphs (blank line = new paragraph)
  const paragraphsHtml = String(body).split(/\n\s*\n/)
    .map(p => '<p style="margin:0 0 14px;">' + esc(p.trim()).replace(/\n/g, '<br/>') + '</p>').join('');
  const html = wrap(subject, paragraphsHtml);

  // Send individually via Resend batch API (max 100 per call) — no exposed recipient lists
  let sent = 0; const failed = [];
  for (let i = 0; i < subscribers.length; i += 100) {
    const chunk = subscribers.slice(i, i + 100);
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(chunk.map(s => ({
        from: FROM, to: [s.email], reply_to: 'desk@carbonxfuture.com', subject, html
      })))
    });
    if (r.ok) sent += chunk.length;
    else failed.push(...chunk.map(s => s.email));
  }
  return res.status(200).json({ ok: true, sent, total: subscribers.length, failed });
}
