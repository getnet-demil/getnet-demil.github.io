# Chatbot backend (Cloudflare Worker)

This folder is a small serverless proxy that lets the "Ask about Getnet" chat
widget on the site talk to Google's free Gemini API without ever exposing the
API key in the browser. It's not built by GitHub Pages — it's deployed
separately, for free, on Cloudflare Workers.

You only need to do this once. No coding, no local tools required — everything
below happens in two web dashboards.

## 1. Get a free Gemini API key

1. Go to <https://aistudio.google.com/apikey> and sign in with a Google account.
2. Click **Create API key** (no credit card needed).
3. Copy the key — you'll paste it into Cloudflare in step 3.

## 2. Create the Cloudflare Worker

1. Go to <https://dash.cloudflare.com/sign-up> and create a free account (no
   credit card needed).
2. In the dashboard, go to **Workers & Pages** → **Create** → **Create Worker**.
3. Give it a name (e.g. `getnet-chatbot`) and click **Deploy** to create the
   placeholder worker.
4. Click **Edit code**. Delete the default sample code, then open
   [`src/index.js`](./src/index.js) in this folder, copy its entire contents,
   and paste it into the editor.
5. Click **Deploy** (top right) to publish it.

## 3. Add your Gemini key as a secret

1. On the Worker's page, go to **Settings** → **Variables and Secrets**.
2. Add a new variable:
   - Name: `GEMINI_API_KEY`
   - Value: the key you copied in step 1
   - Type: **Secret** (so it stays encrypted, not visible in the dashboard)
3. Save and redeploy if prompted.

(Optional) You can also add a plain variable `GEMINI_MODEL` if you ever want
to point at a different Gemini model later — it defaults to `gemini-flash-latest`
if you don't set one.

## 4. Send me the Worker URL

Your Worker's URL is shown at the top of its dashboard page — something like:

```
https://getnet-chatbot.<your-subdomain>.workers.dev
```

Send that URL back and it'll be wired into `js/chatbot.js` (the
`CHAT_API_URL` constant) as the final step — the chat widget on the site will
then be fully live.

## Notes

- Cloudflare Workers' free tier is 100,000 requests/day — far more than a
  portfolio site needs, and it never asks for a credit card.
- Gemini's free tier has its own daily/per-minute limits. If they're ever hit,
  the chat widget will just show a "busy, try again shortly" message — there's
  no billing risk since no card is attached to the key.
- The Worker only answers requests whose `Origin` header is
  `https://getnet-demil.github.io`, so the key and endpoint can't easily be
  reused by other sites.
- To change what the bot knows about Getnet, edit the `SYSTEM_PROMPT` constant
  in `src/index.js`, then paste the updated file into the Cloudflare editor
  and redeploy.
