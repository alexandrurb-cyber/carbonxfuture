# CarbonXFuture Website

## Project structure
```
carbonxfuture/
├── index.html      # Full site (single page)
├── prices.json     # Displayed prices + "last updated" date (edit daily)
├── vercel.json     # Vercel config (SPA rewrite)
├── api/chat.js     # Serverless proxy for Agent CXF (Claude API)
└── README.md       # These instructions
```

## Deploy on Vercel

1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Create a new **public** repository, e.g. `carbonxfuture-website`.
3. Upload ALL project files (keep the `api/` folder structure).
4. Go to [vercel.com](https://vercel.com), log in with GitHub, click **Add New Project**, select the repo, and **Deploy**.

## Required setup after deploy

### 1. Claude API key (Agent CXF chat)
The chat widget will NOT work without this:
1. Get an API key from [platform.claude.com](https://platform.claude.com).
2. In Vercel: **Settings → Environment Variables** → add `ANTHROPIC_API_KEY` with your key.
3. Redeploy.

### 2. Access-request form (FormSubmit)
The KYC form emails submissions to `desk@carbonxfuture.com` via FormSubmit.
The **first submission** triggers an activation email to that inbox — click the
confirmation link once and all later submissions arrive normally.

### 3. Donations — already configured (Stripe)
The donate button opens your Stripe Payment Link — the `DONATION_LINK`
constant near the bottom of `index.html`. To change it, edit that constant.

### 4. Daily updates (prices + listings)
- **Prices:** edit `prices.json` — numbers + `lastUpdated` (format `YYYY-MM-DD`) → commit.
- **Listings:** edit `listings.json` — the `carbon` array feeds the marketplace
  table, the `oil` array feeds the oil desk table. Add/remove/edit entries and
  commit; the site rebuilds both tables automatically. `reg` must be one of:
  cxf, verra, gold, acr, car (controls badge color + filters).

### 5. Custom domain (optional)
In Vercel: **Settings → Domains** → add `carbonxfuture.com` and follow the DNS
instructions for your registrar.
