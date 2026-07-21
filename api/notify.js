// CXF Portal — member notification emails via Resend.
// Requires RESEND_API_KEY in Vercel environment variables.
// Only authenticated ADMIN sessions can trigger emails.

const ADMIN_EMAILS = ['desk@carbonxfuture.com', 'alexandrurb@icloud.com'];
const SUPABASE_URL = 'https://zohskwbavtzvecqziklq.supabase.co';
const SUPABASE_ANON = 'sb_publishable_K-4sl6hEk75fByleZEZcfA_f_Zha9aI';
const FROM = 'CarbonXFuture <desk@carbonxfuture.com>';
const PORTAL_URL = 'https://www.carbonxfuture.com/portal/';

function wrap(title, body) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F5F3;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;">
    <div style="background:#1A4A2E;padding:18px 28px;color:#ffffff;font-size:15px;font-weight:bold;">&#11041; CarbonXFuture</div>
    <div style="padding:28px;color:#1E1E1A;font-size:14px;line-height:1.7;">
      <h2 style="margin:0 0 12px;font-size:18px;">${title}</h2>
      ${body}
      <p style="margin-top:24px;"><a href="${PORTAL_URL}" style="background:#1A4A2E;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;">Open member portal</a></p>
    </div>
    <div style="padding:16px 28px;color:#8A8A82;font-size:11px;border-top:1px solid #E8E8E4;">
      CarbonXFuture Markets, Inc. &middot; Fort Lauderdale, Florida &middot; desk@carbonxfuture.com
    </div>
  </div></body></html>`;
}

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const TEMPLATES = {
  member_approved: d => ({
    subject: 'Your CarbonXFuture account has been approved',
    html: wrap('Welcome aboard — your account is approved',
      `<p>Hi ${esc(d.name)},</p>
       <p>Good news: the CarbonXFuture desk has reviewed and <b>approved</b> the account for <b>${esc(d.company)}</b>.</p>
       <p>You can now sign in to your member portal to upload documents, submit activity reports and track your listings.</p>`)
  }),
  member_rejected: d => ({
    subject: 'Update on your CarbonXFuture application',
    html: wrap('Your application was not approved',
      `<p>Hi ${esc(d.name)},</p>
       <p>Thank you for your interest in CarbonXFuture. After review, we are unable to approve the account for <b>${esc(d.company)}</b> at this time.</p>
       <p>If you believe additional information could change this outcome, reply to this email and our desk will take another look.</p>`)
  }),
  report_validated: d => ({
    subject: 'Your report has been validated — credits listed',
    html: wrap('Report validated ✅',
      `<p>Hi ${esc(d.name)},</p>
       <p>Your <b>${esc(d.period)}</b> activity report for <b>${esc(d.company)}</b> has been validated by the CarbonXFuture desk.</p>
       <p><b>${esc(d.volume)} tCO₂e</b> in CXF platform credits ${d.price ? 'are now listed on the marketplace at <b>$' + esc(d.price) + '/tCO₂e</b>' : 'are now listed on the marketplace (price on request)'}.</p>
       <p>You can see your listing in the portal and on the public marketplace.</p>`)
  }),
  report_changes: d => ({
    subject: 'Your report needs changes before validation',
    html: wrap('Changes requested on your report',
      `<p>Hi ${esc(d.name)},</p>
       <p>The desk reviewed your <b>${esc(d.period)}</b> report for <b>${esc(d.company)}</b> and needs the following before it can be validated:</p>
       <p style="background:#FDF3E3;padding:12px 16px;border-radius:8px;">${esc(d.note)}</p>
       <p>Please update and resubmit in the portal.</p>`)
  }),
  new_member_admin: d => ({
    subject: '🔔 New member application: ' + (d.company || 'Unknown company'),
    html: wrap('New application awaiting your review',
      `<p>A new member just completed onboarding:</p>
       <p><b>Company:</b> ${esc(d.company)}<br/>
          <b>Contact:</b> ${esc(d.name)}<br/>
          <b>Email:</b> ${esc(d.email)}<br/>
          <b>Type:</b> ${esc(d.member_type)}</p>
       <p>Review and approve/reject in the Desk Admin panel.</p>
       <p><a href="https://www.carbonxfuture.com/portal/admin.html" style="background:#1E1E1A;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;">Open Desk Admin</a></p>`)
  }),
  report_rejected: d => ({
    subject: 'Your report could not be validated',
    html: wrap('Report not validated',
      `<p>Hi ${esc(d.name)},</p>
       <p>Unfortunately your <b>${esc(d.period)}</b> report for <b>${esc(d.company)}</b> could not be validated:</p>
       <p style="background:#FBEAEA;padding:12px 16px;border-radius:8px;">${esc(d.note)}</p>
       <p>If you have questions, reply to this email.</p>`)
  }),
  application_received: d => ({
    subject: 'We received your CarbonXFuture application',
    html: wrap('Application received ✓',
      `<p>Hi ${esc(d.name)},</p>
       <p>Thank you — your application for <b>${esc(d.company)}</b> has been received by the CarbonXFuture desk.</p>
       <p>Our team reviews every application individually. You will receive a decision by email, typically within 24–48 business hours.</p>`)
  }),
  report_received: d => ({
    subject: 'Your activity report was submitted',
    html: wrap('Report submitted ✓',
      `<p>Hi ${esc(d.name)},</p>
       <p>Your <b>${esc(d.period)}</b> activity report for <b>${esc(d.company)}</b> was submitted successfully.</p>
       <p><b>Indicative volume:</b> ${esc(d.volume)} tCO₂e (subject to desk validation).</p>
       <p>The CarbonXFuture desk will review it. You will receive another email once it is validated or if changes are needed.</p>`)
  }),
  document_received: d => ({
    subject: 'Your document was uploaded',
    html: wrap('Document received ✓',
      `<p>Hi ${esc(d.name)},</p>
       <p>Your document <b>${esc(d.filename)}</b> was uploaded successfully and is now with the CarbonXFuture desk for review.</p>
       <p>No further action is needed from you at this point. You will be notified after review.</p>`)
  }),
  project_published: d => ({
    subject: '🎉 Your project is live on carbonxfuture.com',
    html: wrap('Project published on the website',
      `<p>Hi ${esc(d.name)},</p>
       <p>Congratulations — the CarbonXFuture desk has published your project on the public Project Explorer:</p>
       <p style="background:#EAF2EC;padding:12px 16px;border-radius:8px;"><b>${esc(d.project)}</b><br/>${esc(d.details)}</p>
       <p>It is now visible with the ⬡ CXF badge at <a href="https://www.carbonxfuture.com/projects.html">carbonxfuture.com/projects.html</a>.</p>`)
  }),
  rfq_quote: d => ({
    subject: 'Your quote from the CarbonXFuture desk — ' + (d.listing || ''),
    html: wrap('Indicative quote from the desk',
      `<p>Hi ${esc(d.name)},</p>
       <p>Following your request on behalf of <b>${esc(d.company)}</b>, the CarbonXFuture desk quotes:</p>
       <p style="background:#EAF2EC;padding:12px 16px;border-radius:8px;">
         <b>${esc(d.listing)}</b><br/>
         ${d.volume ? 'Volume: ' + esc(d.volume) + ' tCO₂e<br/>' : ''}
         <b>Indicative price: $${esc(d.price)}/tCO₂e</b>
         ${d.notes ? '<br/>' + esc(d.notes) : ''}</p>
       <p>This quote is indicative and subject to final confirmation and documentation. Reply to this email to proceed or discuss terms.</p>`)
  }),
  certificate_issued: d => ({
    subject: 'Your CXF retirement certificate — ' + (d.serial || ''),
    html: wrap('Retirement certificate issued',
      `<p>Hi ${esc(d.name)},</p>
       <p>Your CXF platform credits have been retired and a certificate has been issued:</p>
       <p style="background:#EAF2EC;padding:12px 16px;border-radius:8px;">
         <b>Serial: ${esc(d.serial)}</b><br/>
         Project: ${esc(d.project)}<br/>
         Volume: ${esc(d.volume)} tCO₂e</p>
       <p>View and print your certificate: <a href="https://www.carbonxfuture.com/certificate.html?serial=${encodeURIComponent(d.serial || '')}">carbonxfuture.com/certificate.html?serial=${esc(d.serial)}</a></p>
       <p>Anyone can verify it independently at <a href="https://www.carbonxfuture.com/verify.html">carbonxfuture.com/verify.html</a>.</p>`)
  })
};

// Types a signed-in member may trigger about their OWN activity.
// The recipient is always forced to the member's own email.
const SELF_TYPES = ['application_received', 'report_received', 'document_received'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  // Verify the caller is a signed-in ADMIN (token from the admin panel session)
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing session token' });
  const u = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token }
  });
  if (!u.ok) return res.status(401).json({ error: 'Invalid session' });
  const user = await u.json();

  const { type, data } = req.body || {};
  let { to } = req.body || {};

  // 'new_member_admin' may be triggered by any signed-in member (their own
  // onboarding); the recipient is always forced to the desk. SELF_TYPES are
  // confirmations a member triggers about their own activity; the recipient
  // is always forced to their own email. All other types require ADMIN.
  if (type === 'new_member_admin') {
    to = 'desk@carbonxfuture.com';
  } else if (SELF_TYPES.includes(type)) {
    to = user.email;
  } else if (!ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  const template = TEMPLATES[type];
  if (!template || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to || '')) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const msg = template(data || {});
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: 'desk@carbonxfuture.com', subject: msg.subject, html: msg.html })
  });
  const out = await r.json();
  if (!r.ok) return res.status(502).json({ error: out?.message || 'Email send failed' });
  return res.status(200).json({ ok: true, id: out.id });
}
