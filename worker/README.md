# Chatbot backend (Cloudflare Worker)

This folder is a small serverless proxy that lets the "Ask about Getnet" chat
widget on the site talk to Google's free Gemini API without ever exposing the
API key in the browser. It's not built by GitHub Pages — it's deployed
separately, for free, on Cloudflare Workers, as the Worker **`ask-about-getnet`**
at `https://ask-about-getnet.getnetd24.workers.dev`.

## Deploys automatically

The Worker is connected to this repo (Cloudflare Workers Builds, set up via
the Worker's **Settings → Build** tab: Git repository
`getnet-demil/getnet-demil.github.io`, production branch `main`, root
directory `worker`, deploy command `npx wrangler deploy`). Any push to `main`
that touches this folder redeploys it automatically — no manual copy-pasting
into the dashboard editor needed anymore.

The `name` in [`wrangler.toml`](./wrangler.toml) must stay `ask-about-getnet`
to match the already-deployed Worker; changing it would make Wrangler deploy
to a different (new, secret-less) Worker instead of this one.

## Config already in place

- **Secret** `GEMINI_API_KEY` — your Gemini API key, set under the Worker's
  **Settings → Variables and Secrets**. Secrets stay attached to the Worker
  regardless of how it's deployed, so this doesn't need touching again.
- **Variable** `GEMINI_MODEL` = `gemini-flash-latest` — optional override of
  the model `src/index.js` defaults to; only needed if you want to point at a
  different Gemini model.

## To change what the bot knows or does

Edit `src/index.js` (e.g. the `SYSTEM_PROMPT` constant) and push to `main` —
it redeploys on its own within about a minute.

## Notes

- Cloudflare Workers' free tier is 100,000 requests/day — far more than a
  portfolio site needs, and it never asks for a credit card.
- Gemini's free tier has its own daily/per-minute limits. If they're ever hit,
  the Worker retries transient errors (429/503) automatically; if it's still
  unavailable, the chat widget shows a "trouble connecting" message — there's
  no billing risk since no card is attached to the key.
- The Worker only answers requests whose `Origin` header is
  `https://getnet-demil.github.io`, so the key and endpoint can't easily be
  reused by other sites.
