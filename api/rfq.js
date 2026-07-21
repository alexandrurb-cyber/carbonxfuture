// CXF — public request-for-quote endpoint.
// Validates + rate-limits the request, stores it in Supabase (RLS: insert-only
// for the public), then emails a confirmation to the requester and an alert to
// the desk via Resend. Requires RESEND_API_KEY in Vercel env vars.

const SUPABASE_URL = 'https://zohskwbavtzvecqziklq.supabase.co';
const SUPABASE_ANON = 'sb_publishable_K-4sl6hEk75fByleZEZcfA_f_Zha9aI';
const FROM = 'CarbonXFuture Desk <desk@carbonxfuture.com>';
const DESK = 'desk@carbonxfuture.com';

// Simple in-memory rate limit: 5 RFQs / 10 min / IP (per warm lambda)
const hits = new Map();
function limited(ip) {
  const now = Date.now(), windowMs = 10 * 60 * 1000;
  const arr = (hits.get(ip) || []).filter(t => now - t < windowMs);
  if (arr.length >= 5) return true;
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function wrap(title, body) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F5F3;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <div style="background:#1A4A2E;padding:18px 28px;color:#ffffff;font-size:15px;font-weight:bold;">&#11041; CarbonXFuture</div>
    <div style="padding:28px;color:#1E1E1A;font-size:14px;line-height:1.7;">
      <h2 style="margin:0 0 12px;font-size:18px;">${title}</h2>${body}
    </div>
    <div style="padding:16px 28px;color:#8A8A82;font-size:11px;border-top:1px solid #E8E8E4;">
      CarbonXFuture Markets, Inc. &middot; Fort Lauderdale, Florida &middot; desk@carbonxfuture.com
    </div>
  </div></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ error: 'Too many requests — please try again later.' });

  const b = req.body || {};
  // Honeypot: real users never fill this hidden field
  if (b.website) return res.status(200).json({ ok: true });

  const listing_name = String(b.listing_name || '').slice(0, 200).trim();
  const company = String(b.company || '').slice(0, 200).trim();
  const contact_name = String(b.contact_name || '').slice(0, 120).trim();
  const email = String(b.email || '').slice(0, 200).trim();
  const timeframe = String(b.timeframe || '').slice(0, 100).trim();
  const notes = String(b.notes || '').slice(0, 2000).trim();
  const reg = String(b.reg || 'cxf').slice(0, 20);
  const volume_tco2e = Number(b.volume_tco2e) > 0 ? Number(b.volume_tco2e) : null;
  const target_price = Number(b.target_price) > 0 ? Number(b.target_price) : null;

  if (!listing_name || !company || !contact_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please fill in the listing, company, contact name and a valid email.' });
  }

  // Store the RFQ (public insert allowed by RLS; reads are desk-only)
  const ins = await fetch(SUPABASE_URL + '/rest/v1/rfqs', {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ listing_name, reg, volume_tco2e, target_price, timeframe, company, contact_name, email, notes })
  });
  if (!ins.ok) return res.status(502).json({ error: 'Could not record your request — please email desk@carbonxfuture.com.' });

  // Emails (best-effort; the RFQ is already recorded)
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const detail = `<p style="background:#EAF2EC;padding:12px 16px;border-radius:8px;">
      <b>${esc(listing_name)}</b><br/>
      ${volume_tco2e ? 'Volume: ' + esc(volume_tco2e.toLocaleString('en-US')) + ' tCO₂e<br/>' : ''}
      ${target_price ? 'Target price: $' + esc(target_price) + '/tCO₂e<br/>' : ''}
      ${timeframe ? 'Timeframe: ' + esc(timeframe) + '<br/>' : ''}
      ${notes ? 'Notes: ' + esc(notes) : ''}</p>`;
    const emails = [
      { from: FROM, to: [email], reply_to: DESK,
        subject: 'We received your quote request — CarbonXFuture',
        html: wrap('Quote request received ✓',
          `<p>Hi ${esc(contact_name)},</p>
           <p>Thank you — the CarbonXFuture desk has received your request for quote on behalf of <b>${esc(company)}</b>:</p>
           ${detail}
           <p>A desk member will come back to you with an indicative quote, typically within one business day.</p>`) },
      { from: FROM, to: [DESK], reply_to: email,
        subject: '🔔 New RFQ: ' + listing_name + ' — ' + company,
        html: wrap('New RFQ awaiting your quote',
          `<p><b>Company:</b> ${esc(company)}<br/><b>Contact:</b> ${esc(contact_name)}<br/><b>Email:</b> ${esc(email)}</p>
           ${detail}
           <p><a href="https://www.carbonxfuture.com/portal/admin.html" style="background:#1E1E1A;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;">Open RFQ desk</a></p>`) }
    ];
    try {
      await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify(emails)
      });
    } catch (e) {}
  }
  return res.status(200).json({ ok: true });
}
