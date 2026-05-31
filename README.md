# Literature

Real-time multiplayer Literature (the card game) — 6 players, 3 vs 3. Web first; cross-platform readiness baked into the package layout.

## What's in here

```
apps/
  server/      Node + Fastify + Socket.IO + (optional) Redis
  web/         React + Vite + Tailwind + Zustand
packages/
  shared/      Zod schemas, types, GameVariant configs (used by both sides)
  engine/      Pure (state, action) -> {state, events} game engine
  domain/      Zustand stores + socket/REST client (transport-agnostic)
  ui-web/      Reserved for shared web presentation primitives
```

Design docs:

- [`requirements_doc.md`](requirements_doc.md) — product spec
- [`backend_architecture.md`](backend_architecture.md) — server topology + invariants
- [`frontend_architecture.md`](frontend_architecture.md) — client layers + state model
- [`CLAUDE.md`](CLAUDE.md) — non-negotiable invariants and conventions

## Local development

**Requirements:** Node 22+, pnpm 11 (`corepack enable`).

```bash
pnpm install

# Run the server (defaults to in-memory store unless REDIS_URL is set):
pnpm --filter @literature/server dev

# In another terminal, run the web app:
pnpm --filter @literature/web dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api/*` and `/socket.io` to `http://localhost:4000`.

### Workspace commands

```bash
pnpm typecheck     # tsc --noEmit across every package
pnpm test          # vitest run across every package (~180 tests)
pnpm lint          # eslint flat config, --max-warnings 0
pnpm format        # prettier --write across the repo
pnpm format:check  # CI-style, no writes
```

Per-package filter: `pnpm --filter @literature/<name> <script>`.

## Configuration

The server reads everything from environment variables. Copy [`apps/server/.env.example`](apps/server/.env.example) to `apps/server/.env` (or set in your deploy environment).

| Variable | Required | Default | Notes |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | no | `development` | `production` is strict (see below). |
| `HOST` | no | `0.0.0.0` | Bind address. |
| `PORT` | no | `4000` | |
| `JWT_SECRET` | **yes in production** | dev fallback | Must be ≥ 16 chars in production. `openssl rand -hex 32` works. Rotating invalidates every active session. |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Comma-separated list of allowed origins. |
| `REDIS_URL` | no | unset | If set, room state persists across restarts. Otherwise in-memory only. |
| `ROOM_TTL_MS` | no | `1800000` (30 min) | How long a lobby room lives before eviction if the game never starts. |

## Production deploy

The repo ships a [`Dockerfile`](apps/server/Dockerfile) for the server and a [`docker-compose.yml`](docker-compose.yml) that brings up Redis + server together. For a private deploy:

```bash
JWT_SECRET=$(openssl rand -hex 32) \
CORS_ORIGIN=https://your-domain.example \
docker compose up -d --build
```

This gives you:

- Persistent room state (Redis volume `redis-data`)
- Server listening on `:4000`
- HTTP only — **put a reverse proxy in front for TLS** (Caddy is the simplest path; Nginx / Cloudflare Tunnel also work).

### Caddy example (HTTPS + WebSocket)

```caddyfile
your-domain.example {
    @websockets {
        path /socket.io/*
    }
    reverse_proxy @websockets server:4000
    reverse_proxy /api/* server:4000

    # Static web app — build separately with `pnpm --filter @literature/web build`
    # and serve apps/web/dist via Caddy `file_server` or any static host.
    root * /srv/literature-web
    file_server
}
```

The web app talks to the same origin in production: `/api/rooms`, `/socket.io`. There is no separate web-server in `docker-compose.yml`; build the static bundle with `pnpm --filter @literature/web build` and serve `apps/web/dist` from your edge (Caddy, Nginx, Cloudflare Pages, S3+CloudFront — anywhere static).

### Health and metrics

- `GET /healthz` — liveness probe (returns `{ ok: true }`)
- `GET /metrics` — JSON: `{ roomCount, onlinePlayerCount, byStatus }`

Action latency is captured in structured log lines (`{ action, roomId, playerId, durationMs, result }`).

## Game rules

Standard Literature with two variants:

- **Classic** — 48 cards (no 8s), 8 sets, 8 cards/player
- **Extended** — 54 cards (Classic + four 8s + two Jokers), 9 sets, 9 cards/player

The 8s+Jokers set is asked for as `"Joker"` generically (Jokers are functionally identical). The validator enforces:

- Asker and target on opposing teams
- Asker holds at least one card in the requested set ("base requirement")
- Asker doesn't already hold the specific card — special Joker case: asker can ask for a Joker if they hold 0 or 1 Jokers, but not 2 ("absence requirement")
- Joker transfer moves exactly one Joker even if the target holds both

Claims:

- Any player can claim at any time (own turn, teammate's turn, opponent's turn)
- All 6 cards must be assigned to teammates
- 100% correct → claimant's team scores; any wrong → opposing team scores
- All 6 cards leave play regardless

## Tests

The two load-bearing tests live in:

1. [`packages/engine/src/joker-matrix.test.ts`](packages/engine/src/joker-matrix.test.ts) — every combination of (asker has 8, asker jokers, target jokers) through `applyAction`
2. [`apps/server/src/leak.test.ts`](apps/server/src/leak.test.ts) — six real Socket.IO clients in one room; asserts no `game:state` payload to viewer A ever contains a card ID held by viewer B

Don't disable or skip either of these.

## Known limitations

- **Single-instance only.** Multi-instance horizontal scaling would need sticky routing + Redis pub/sub. Architecture acknowledged this as out of MVP scope.
- **No game history persistence.** Once a game ends, it's gone. Out of scope.
- **No host kick / bot substitute.** A disconnected active player blocks the turn until they reconnect; teammates can leave via the Leave button.

## License

MIT.
