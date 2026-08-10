// CXF — publish desk marks: commits prices.json to GitHub directly from
// the Desk Admin "Update prices" card. Vercel then auto-deploys, so the
// new marks are live on the website ~1 minute after clicking Save.
//
// Required Vercel environment variables:
//   GITHUB_TOKEN  — fine-grained personal access token with Contents
//                   read/write permission on the site repository only
//   GITHUB_REPO   — "owner/repository", e.g. "alexandru/carbonxfuture"
//   GITHUB_BRANCH — optional, defaults to "main"

const ADMIN_EMAILS = ['desk@carbonxfuture.com', 'alexandrurb@icloud.com'];
const SUPABASE_URL = 'https://zohskwbavtzvecqziklq.supabase.co';
const SUPABASE_ANON = 'sb_publishable_K-4sl6hEk75fByleZEZcfA_f_Zha9aI';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !repo) return res.status(500).json({ error: 'GITHUB_TOKEN / GITHUB_REPO not configured in Vercel env' });

  // --- Verify the caller is a signed-in admin ---
  const sess = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!sess) return res.status(401).json({ error: 'Missing session token' });
  const u = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + sess }
  });
  if (!u.ok) return res.status(401).json({ error: 'Invalid session' });
  const user = await u.json();
  if (!ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // --- Validate the payload: must look like a sane prices.json ---
  const p = req.body;
  if (!p || typeof p !== 'object' || !p.lastUpdated || !p.prices || typeof p.prices !== 'object') {
    return res.status(400).json({ error: 'Payload must be the full prices.json object (lastUpdated, prices, benchmarks).' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.lastUpdated)) return res.status(400).json({ error: 'lastUpdated must be YYYY-MM-DD' });
  const entries = Object.entries(p.prices);
  if (!entries.length || entries.length > 30) return res.status(400).json({ error: 'prices object looks wrong' });
  for (const [k, v] of entries) {
    if (typeof v !== 'number' || !(v > 0) || v > 10000) return res.status(400).json({ error: 'Invalid price for ' + k });
  }
  const json = JSON.stringify(p, null, 2) + '\n';
  if (json.length > 20000) return res.status(400).json({ error: 'Payload too large' });

  // --- Commit to GitHub (Contents API): get current SHA, then PUT ---
  const gh = (path, opts = {}) => fetch('https://api.github.com/repos/' + repo + '/contents/' + path + '?ref=' + branch, {
    ...opts,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'cxf-desk-admin',
      ...(opts.headers || {})
    }
  });
  let sha = null;
  const cur = await gh('prices.json');
  if (cur.ok) sha = (await cur.json()).sha;
  else if (cur.status !== 404) return res.status(502).json({ error: 'GitHub read failed: HTTP ' + cur.status + ' — check GITHUB_REPO ("owner/repo") and token permissions.' });

  const put = await fetch('https://api.github.com/repos/' + repo + '/contents/prices.json', {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'cxf-desk-admin',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Update desk marks — ' + p.lastUpdated + ' (via Desk Admin)',
      content: Buffer.from(json).toString('base64'),
      branch,
      ...(sha ? { sha } : {})
    })
  });
  if (!put.ok) {
    const err = await put.text();
    return res.status(502).json({ error: 'GitHub commit failed: ' + err.slice(0, 300) });
  }
  const out = await put.json();
  return res.status(200).json({ ok: true, commit: out.commit && out.commit.sha, lastUpdated: p.lastUpdated });
}
