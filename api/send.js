// api/send.js
// Vercel Serverless Function — handles contact form submissions to Telegram.
// Secrets (TG_BOT_TOKEN, TG_CHAT_ID) live in Vercel Environment Variables
// and are NEVER exposed to the client.
//
// Set them in: Vercel Dashboard → your project → Settings → Environment Variables
//   TG_BOT_TOKEN   — token from @BotFather
//   TG_CHAT_ID     — your personal Telegram chat ID (get from @userinfobot)
//   ALLOWED_ORIGIN — (optional) your production domain, e.g. https://avilov.dev

// In-memory rate limit (per-instance; Vercel spins up new instances so this is lightweight)
const rateLimit = new Map();
const WINDOW_MS = 10 * 60 * 1000;  // 10 minutes
const MAX_REQUESTS = 3;             // per IP per window

function escapeMd(text) {
  // Escape Telegram MarkdownV1 special characters — keep it simple
  return String(text).replace(/([_*`\[])/g, '\\$1');
}

// Strip control characters and limit length
function sanitize(s, maxLen) {
  return String(s || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // remove control chars
    .trim()
    .slice(0, maxLen);
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Origin / Referer check — accept only requests from same origin (or configured domain)
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin) {
    const origin = req.headers.origin || '';
    const referer = req.headers.referer || '';
    const isAllowed =
      origin === allowedOrigin ||
      referer.startsWith(allowedOrigin) ||
      // Also allow Vercel preview URLs
      /^https:\/\/.*\.vercel\.app/.test(origin);
    if (!isAllowed) {
      return res.status(403).json({ ok: false, error: 'forbidden_origin' });
    }
  }

  // Check env vars presence (safer error than leaking details)
  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;
  if (!token || !chatId) {
    console.error('Missing TG_BOT_TOKEN or TG_CHAT_ID env vars');
    return res.status(500).json({ ok: false, error: 'server_not_configured' });
  }

  // Parse body (Vercel auto-parses JSON when Content-Type is set)
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'invalid_body' });
  }
  const { name, tg, msg, _honey } = body;

  // Honeypot — bots fill invisible fields. Respond with fake success.
  if (_honey && String(_honey).trim() !== '') {
    return res.status(200).json({ ok: true });
  }

  // Sanitize and validate
  const cleanName = sanitize(name, 100);
  const cleanMsg  = sanitize(msg, 2000);
  const cleanTg   = sanitize(tg, 100);

  if (cleanName.length < 1) {
    return res.status(400).json({ ok: false, error: 'invalid_name' });
  }
  if (cleanMsg.length < 1) {
    return res.status(400).json({ ok: false, error: 'invalid_message' });
  }
  // Basic spam heuristic — if message has too many URLs, reject
  const urlCount = (cleanMsg.match(/https?:\/\//gi) || []).length;
  if (urlCount > 3) {
    return res.status(400).json({ ok: false, error: 'too_many_urls' });
  }

  // Rate limit per IP
  const ip = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown')
    .toString().split(',')[0].trim();
  const now = Date.now();
  const history = (rateLimit.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (history.length >= MAX_REQUESTS) {
    return res.status(429).json({ ok: false, error: 'too_many_requests' });
  }
  history.push(now);
  rateLimit.set(ip, history);

  // Clean up old entries occasionally to prevent memory bloat
  if (rateLimit.size > 1000) {
    for (const [k, v] of rateLimit) {
      if (v.every(t => now - t >= WINDOW_MS)) rateLimit.delete(k);
    }
  }

  // Build message
  const safeName = escapeMd(cleanName);
  const safeMsg  = escapeMd(cleanMsg);
  const tgHandle = cleanTg
    ? escapeMd(cleanTg.startsWith('@') ? cleanTg : '@' + cleanTg)
    : 'не вказано';

  const text = `📩 *Нове повідомлення з сайту!*\n\n` +
               `👤 *Ім'я:* ${safeName}\n` +
               `✈ *Telegram:* ${tgHandle}\n\n` +
               `💬 *Повідомлення:*\n${safeMsg}`;

  // Forward to Telegram with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await tgRes.json();
    if (data.ok) {
      return res.status(200).json({ ok: true });
    }
    console.error('Telegram API error:', data.description);
    return res.status(502).json({ ok: false, error: 'telegram_rejected' });
  } catch (err) {
    clearTimeout(timeout);
    console.error('Fetch to Telegram failed:', err.name, err.message);
    return res.status(502).json({ ok: false, error: 'telegram_unreachable' });
  }
}
