# CarbonXFuture Website

## Deploy pe Vercel în 5 pași

### Pas 1 — Creează cont GitHub
Mergi la [github.com](https://github.com) și creează un cont gratuit dacă nu ai.

### Pas 2 — Creează un repository nou
1. Click pe **"New repository"**
2. Nume: `carbonxfuture-website`
3. Lasă-l **Public**
4. Click **"Create repository"**

### Pas 3 — Uploadează fișierele
1. În repository-ul nou, click **"uploading an existing file"**
2. Trage fișierele `index.html` și `vercel.json` în browser
3. Click **"Commit changes"**

### Pas 4 — Deploy pe Vercel
1. Mergi la [vercel.com](https://vercel.com) și login cu GitHub
2. Click **"Add New Project"**
3. Selectează repository-ul `carbonxfuture-website`
4. Click **"Deploy"** — gata în ~30 secunde!

### Pas 5 — (Opțional) Conectează domeniul carbonxfuture.com
1. În Vercel, mergi la **Settings → Domains**
2. Adaugă `carbonxfuture.com`
3. Vercel îți va da DNS records de adăugat la registrar-ul tău

## Structura proiectului
```
carbonxfuture/
├── index.html      # Site-ul complet (single page)
├── vercel.json     # Configurare Vercel
└── README.md       # Aceste instrucțiuni
```
