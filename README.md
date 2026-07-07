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
The KYC form emails submissions to `info@carbonxfuture.com` via FormSubmit.
The **first submission** triggers an activation email to that inbox — click the
confirmation link once and all later submissions arrive normally.

### 3. Donations (Stripe or PayPal)
Donations are disabled until you add a payment link:
1. **Stripe:** Dashboard → Payment Links → create a link with "Customers choose what to pay". Or **PayPal:** create a Donate button link.
2. Paste the URL into `DONATION_LINK` near the bottom of `index.html`.

Until then, the donate button tells visitors online donations aren't open yet.

### 4. Daily prices
Edit `prices.json`: change the numbers and set `lastUpdated` to today's date
(format `YYYY-MM-DD`), then commit. The site shows the date from this file.

### 5. Custom domain (optional)
In Vercel: **Settings → Domains** → add `carbonxfuture.com` and follow the DNS
instructions for your registrar.
