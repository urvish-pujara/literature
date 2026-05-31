# Deploying Literature to Render (free tier)

Render's free tier runs both the Node server (with WebSockets) and the static web app, with HTTPS already terminated. No domain or credit card required to start — you get `*.onrender.com` subdomains.

**Limitations of the free tier:**
- Free **web services** sleep after 15 minutes of inactivity (cold-start takes ~30s the next time someone hits it).
- Free **static sites** never sleep.
- No Redis on the free tier here; the server falls back to in-memory state. Restart = lost rooms. Fine for casual play.

You'll create two Render services: one **web service** (the Node server) and one **static site** (the React app). Render's Blueprint feature reads `render.yaml` from the repo and sets both up at once.

## One-time setup

### 1. Create a Render account
- Sign up at <https://render.com> with your GitHub.
- When asked, grant Render access to the `urvish-pujara/literature` repo (or your fork).

### 2. Click **New → Blueprint**
- Pick the `literature` repo.
- Render will read `render.yaml` and propose two services: `literature-server` and `literature-web`.
- Click **Apply**.

### 3. First-deploy environment variables
The blueprint sets `JWT_SECRET` automatically (Render generates a strong random value). You need to fill in three URL-based vars **after the first deploy** since neither URL exists until then.

After Render finishes the first build of both services:

1. Note the URL Render assigned to each service. They look like:
   - Server: `https://literature-server-xxxx.onrender.com`
   - Web: `https://literature-web-xxxx.onrender.com`

2. Go to **literature-server → Environment** and set:
   - `CORS_ORIGIN` = the web URL (e.g. `https://literature-web-xxxx.onrender.com`)
3. Go to **literature-web → Environment** and set:
   - `VITE_API_BASE` = the server URL (e.g. `https://literature-server-xxxx.onrender.com`)
   - `VITE_SOCKET_URL` = the same server URL (just the origin, no path)

4. Trigger a redeploy of **both** services so the new env vars take effect:
   - Static site (web): "Manual Deploy → Deploy latest commit"
   - Web service (server): same

After the second deploy, both are live. The first browser hit may cold-start the server (~30 seconds).

### 4. Share the web URL with friends
Send them the `literature-web-xxxx.onrender.com` URL. Six tabs, six players, one host clicks Create.

## Day-2 ops

### Auto-deploy
Render auto-redeploys both services when you push to `main`. No manual step needed unless you change env vars.

### Watching the server logs
Render dashboard → `literature-server` → **Logs**. The server emits structured `socket action` log lines for every ask and claim:
```
{ action: "game:ask", roomId: "...", playerId: "...", durationMs: 1.4, result: "ok" }
```

### Adding Redis later (optional)
Upstash has a perpetual free tier (10k commands/day, 256MB):
1. Sign up at <https://upstash.com>.
2. Create a Redis database in the same region as your Render server.
3. Copy the `REDIS_URL` connection string.
4. Add it as an env var on `literature-server` and redeploy. State now survives restarts.

### Pointing a custom domain
Render → `literature-web` → **Settings → Custom Domain**. Add your domain, Render gives you a CNAME to set. After DNS propagates, update `CORS_ORIGIN` on the server to your new domain and redeploy.

## Troubleshooting

**Web service won't start:** Check the server's logs for `JWT_SECRET must be set...`. Render's blueprint should set it via `generateValue: true`; if it didn't, set one manually (`openssl rand -hex 32`).

**Web app loads but socket won't connect:** Confirm `VITE_SOCKET_URL` is set on the web service (it's read at build time, so a missing value bakes `/` into the bundle). After setting it, trigger a redeploy.

**CORS errors in browser console:** `CORS_ORIGIN` on the server must exactly match the web app's origin (https, no trailing slash). Multiple origins are comma-separated.

**Free service is slow on first hit:** Expected. ~30s cold-start after 15 minutes of idle. Move to the $7/mo plan if it matters.
