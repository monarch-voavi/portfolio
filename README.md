# Avilov Portfolio — Deployment Guide

## 📁 Project structure

```
avilov-portfolio/
├── index.html                    ← rename avilov-portfolio.html to this
├── Volodymyr_Avilov_CV.pdf
├── og-image.png
├── api/
│   └── send.js                   ← Telegram serverless function
├── .gitignore
├── .env.local                    ← create from .env.local.example (DO NOT COMMIT)
├── .env.local.example
├── package.json
└── README.md
```

## 🔐 Step 1 — Create your Telegram bot

1. Open Telegram, message **@BotFather**
2. Send `/newbot`, follow instructions, save the **token** (looks like `1234567890:ABC-def...`)
3. Message **@userinfobot** — it replies with your **numeric chat ID**
4. Send **any message** to your new bot from your personal account (so it can reply to you)

## 🖥 Step 2 — Local developmen

Copy `.env.local.example` → `.env.local` and fill in real values:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local`:

```
TG_BOT_TOKEN=1234567890:ABC-your_real_token
TG_CHAT_ID=123456789
```

**⚠ `.env.local` is gitignored — it never leaves your machine.**

Test locally:

```bash
npm install -g vercel
vercel dev
```

Visit `http://localhost:3000` — form submissions go through `/api/send` → Telegram.

## 🚀 Step 3 — Deploy to Vercel

### Option A: via GitHub (recommended)

1. Create a repo on GitHub
2. `git init && git add . && git commit -m "initial"` (make sure `.env.local` is NOT in the commit — `.gitignore` handles this)
3. Push to GitHub
4. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
5. Before clicking Deploy: go to **Environment Variables** and add:
   - `TG_BOT_TOKEN` = your token  → **mark as "Sensitive"** ⚠️
   - `TG_CHAT_ID` = your chat ID  → **mark as "Sensitive"** ⚠️
6. Click Deploy

> **🛡 Why "Sensitive"?** Vercel had a security incident on April 19, 2026 where attackers accessed *non-sensitive* environment variables of some customers. Variables marked as **Sensitive** are encrypted separately and were NOT compromised. Always mark secrets (tokens, API keys, DB passwords) as Sensitive — even after the incident is resolved, this is the correct default. Read more: https://vercel.com/kb/bulletin/vercel-april-2026-security-incident

### Option B: direct from CLI

```bash
vercel              # first deploy, preview URL
vercel --prod       # production deploy
```

Then in Vercel Dashboard → your project → **Settings** → **Environment Variables** → add `TG_BOT_TOKEN` and `TG_CHAT_ID` — **both marked as "Sensitive"** ⚠️ (see security note above).

After adding env vars, **redeploy** (Vercel doesn't auto-restart functions with new env values on existing deploys).

## 🛡 Security checklist

- [x] Bot token is in environment variables (server-only)
- [x] `.gitignore` excludes `.env*` files
- [x] Input validation on server (name ≤100, msg ≤2000 chars)
- [x] Rate limiting (3 requests per 10 min per IP)
- [x] Honeypot field to catch bots
- [x] No secrets in HTML/JS source

## 🔄 After deploy — update these URLs in index.html

Find and replace these placeholders:

- `https://avilov-portfolio.vercel.app/` → your real domain (in `og:url`, `canonical`, `og:image`, `twitter:image`)
- GitHub link in footer (currently has `style="display:none"`)

## 🐞 Troubleshooting

**Form shows "// server_not_configured"**
→ Env vars not set on Vercel. Check Dashboard → Settings → Environment Variables. Redeploy after setting.

**Form shows "// too_many_requests"**
→ Rate limit hit. Wait 10 min or test from different IP.

**Telegram bot doesn't reply in test**
→ Make sure you sent at least one message to the bot first (it can't initiate conversations).

**`/api/send` returns 404**
→ Vercel needs the `api/` folder at project root with `.js` files. Confirm `api/send.js` is deployed.

## 📝 Content updates

To update articles in the blog section, find `<article class="art-source"` blocks inside `index.html` and edit the `<p>` tags in `.art-ua` and `.art-en` divs.

To add real reviews, they are stored in `localStorage` client-side — consider migrating to a real backend (Supabase, Firebase) once you have 5+ real reviews coming in.
