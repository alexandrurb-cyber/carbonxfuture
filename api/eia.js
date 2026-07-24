// CXF — physical market references from the U.S. Energy Information
// Administration (EIA) open data API. Public-domain government data.
// Requires EIA_API_KEY in Vercel environment variables (free key:
// https://www.eia.gov/opendata/register.php). Responses are cached
// in-memory for 6 hours per warm lambda to stay far below rate limits.

const SERIES = {
  wti:       { id: 'PET.RWTC.D',                          label: 'WTI Crude (Cushing spot)',   unit: '$/bbl' },
  ulsd_nyh:  { id: 'PET.EER_EPD2DXL0_PF4_Y35NY_DPG.D',    label: 'ULSD Diesel (NY Harbor)',    unit: '$/gal' },
  ulsd_gulf: { id: 'PET.EER_EPD2DXL0_PF4_RGC_DPG.D',      label: 'ULSD Diesel (US Gulf Coast)',unit: '$/gal' }
};

let CACHE = { at: 0, payload: null };
const SIX_HOURS = 6 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.EIA_API_KEY;
  if (!key) return res.status(503).json({ error: 'EIA_API_KEY not configured' });

  if (CACHE.payload && Date.now() - CACHE.at < SIX_HOURS) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json(CACHE.payload);
  }

  const out = { updated: new Date().toISOString(), source: 'U.S. Energy Information Administration (api.eia.gov)', series: {} };
  try {
    await Promise.all(Object.entries(SERIES).map(async ([name, s]) => {
      const url = 'https://api.eia.gov/v2/seriesid/' + encodeURIComponent(s.id) +
        '?api_key=' + key + '&sort[0][column]=period&sort[0][direction]=desc&length=30';
      const r = await fetch(url);
      if (!r.ok) throw new Error(s.id + ' HTTP ' + r.status);
      const j = await r.json();
      const rows = (j.response && j.response.data) ? j.response.data : [];
      const points = rows
        .filter(d => d.value !== null && d.value !== undefined)
        .map(d => ({ date: d.period, value: Number(d.value) }))
        .reverse(); // ascending
      if (!points.length) throw new Error(s.id + ' empty');
      const latest = points[points.length - 1];
      const prev = points.length > 1 ? points[points.length - 2] : null;
      const monthAgo = points[0];
      out.series[name] = {
        label: s.label, unit: s.unit,
        latest: latest.value, latest_date: latest.date,
        change_1d_pct: prev ? +(((latest.value - prev.value) / prev.value) * 100).toFixed(2) : null,
        change_30d_pct: monthAgo && monthAgo.value ? +(((latest.value - monthAgo.value) / monthAgo.value) * 100).toFixed(2) : null,
        points
      };
    }));
  } catch (e) {
    // Serve stale cache if we have one; otherwise report upstream failure
    if (CACHE.payload) return res.status(200).json(CACHE.payload);
    return res.status(502).json({ error: 'EIA upstream error: ' + e.message });
  }

  CACHE = { at: Date.now(), payload: out };
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json(out);
}
