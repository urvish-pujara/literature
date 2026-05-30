# Build Phases — Literature Online

Living document. Update the **Current Status** line and check off todos as work lands. See [CLAUDE.md](CLAUDE.md) for invariants, [backend_architecture.md](backend_architecture.md) and [frontend_architecture.md](frontend_architecture.md) for design.

## Current Status

**Phase:** Phase 4 — Frontend Gameplay (in progress)
**Next action:** Zustand stores in `packages/domain` (session, lobby, game, feed, ui).

---

## Phase 0 — Scaffold

Goal: a working pnpm workspace with empty packages, TS strict, lint, format. No game code yet.

- [x] Initialize git repo, configure per-repo identity, create public GitHub repo `literature` on the secondary account, push initial commit
- [x] Initialize pnpm workspace (`pnpm-workspace.yaml`, root `package.json`)
- [x] Create empty packages: `packages/shared`, `packages/engine`, `packages/domain`, `packages/ui-web`
- [x] Create empty apps: `apps/server`, `apps/web`
- [x] Root `tsconfig.base.json` with strict mode; per-package `tsconfig.json` extending it
- [x] ESLint + Prettier at root, applied across workspace
- [x] Vitest configured at root; one trivial passing test per package
- [x] `pnpm typecheck`, `pnpm test`, `pnpm lint` all green
- [x] Fill in real Commands section in [CLAUDE.md](CLAUDE.md)

**Exit criteria:** `pnpm install && pnpm test && pnpm typecheck && pnpm lint` passes from a clean clone.

---

## Phase 1 — Pure Engine

Goal: deterministic `(state, action) → { state, events[] }` engine. No I/O. Both variants supported.

- [x] Define core types in `packages/shared`: `Card`, `Suit`, `PlayerId`, `Team`, `GameState`, `GameAction`, `GameEvent`
- [x] Define `GameVariant` interface + `CLASSIC` and `EXTENDED` configs in `packages/shared`
- [x] Zod schemas mirroring the types
- [x] `Dealer`: builds deck from variant config, shuffles via injected RNG, deals N cards per player
- [x] `ActionValidator`: enforces targeting, base requirement, absence requirement, Joker exception
- [x] State-transfer logic: regular card move, Joker move (exactly one)
- [x] `TurnController`: successful ask retains turn, failed ask passes turn
- [x] `ClaimResolver`: correct → claimant's team scores; any wrong → opponents score; cards removed
- [x] Top-level `applyAction(state, action) → { state, events[] }`
- [x] **Joker matrix test** — every combo of (asker 0/1/2 Jokers, asker has 8, target 0/1/2 Jokers)
- [x] Claim tests: correct claim, off-by-one wrong claim, claim by non-active player, claim by player with zero cards in the set
- [x] Turn-flow test: 3-action sequence with hand transfers asserted at each step

**Exit criteria:** engine has no imports outside `shared`. All rule tests pass. Coverage of the validator and claim resolver at 100%.

---

## Phase 2 — Lobby + Transport

Goal: 6 clients can join a room, pick seats, ready up. No gameplay yet.

- [x] `apps/server` skeleton: Fastify + Socket.IO + Redis client (mock-in-memory fallback for local dev)
- [x] JWT issuance + verification middleware
- [x] `POST /rooms` — create room with variant, returns 6-digit code + host token
- [x] `POST /rooms/:code/join` — returns playerId + session JWT
- [x] Socket auth: verify JWT on connect, attach `playerId` + `roomId` to the socket
- [x] `lobby:seat`, `lobby:randomize`, `lobby:start` handlers (Zod-validated)
- [x] `lobby:update` broadcast per room
- [x] Room TTL (30 min if game never starts) + cleanup
- [x] Rate limit on `POST /rooms/:code/join` per IP
- [x] Integration test: 6 clients join, seat into teams, host starts, server emits initial state

**Exit criteria:** two browser tabs (or two test clients) can create + join + ready up a room. Server rejects 7th joiner, malformed payloads, and unauthenticated sockets.

---

## Phase 3 — Wire Engine Through Gateway

Goal: gameplay runs end-to-end on the server. Hand privacy enforced.

- [x] `GameRoomService` — owns one engine instance per room, serializes inbound actions via mutex
- [x] `project(state, viewerId) → ClientGameState` — single canonical projector
- [x] Per-recipient emit helper; `io.to(roomId).emit('game:state', ...)` is banned (lint rule or wrapper-only)
- [x] `game:ask` and `game:claim` socket handlers dispatch to engine
- [x] `game:event` broadcast (public info only) with server `ts`
- [x] Recent-events buffer per room for reconnect rehydration
- [x] Reconnect path: socket reconnect → re-auth → fresh projection + recent events
- [x] **Headless DOM-leak test** — two Socket.IO clients in a room; assert client B's payloads never contain client A's card identities across a full game

**Exit criteria:** a scripted 3v3 game runs to completion via socket clients. The leak test is green.

---

## Phase 4 — Frontend Gameplay (Happy Path)

Goal: a player can sit at a table, see their hand, ask for a card, see the result.

- [x] `apps/web` skeleton: Vite + React + Tailwind + Router
- [ ] `sessionStore`, `lobbyStore`, `gameStore`, `feedStore`, `uiStore` (Zustand) in `packages/domain`
- [ ] Socket client singleton with auto-reconnect; routes events to stores
- [ ] Landing page: create room / join room with code
- [ ] Lobby screen: seat selection, randomize, ready/start (host only)
- [ ] `<Table>` with 6 seats on an ellipse, viewer at bottom-center, alternating teams
- [ ] `<Hand>` with sort (suit → half-suit → sequential, 8s+Jokers clustered)
- [ ] Responsive: 8 and 9 card hands both render cleanly at common viewport sizes
- [ ] `<AskModal>`: pick opposing-team target → pick card; "Joker" shown as single option
- [ ] Server-error toast surface
- [ ] Manual test: full game runnable across 6 browser tabs

**Exit criteria:** a complete game playable end-to-end in the browser with 6 humans. Ask flow and turn transitions feel correct.

---

## Phase 5 — Claim Builder + Ephemeral Feed

Goal: the remaining rule surface and the core UX device.

- [ ] `<ClaimBuilder>`: drag-assign 6 cards in a set to teammates; submit disabled until complete
- [ ] Claim entry point visible at all times (any player, any turn state)
- [ ] Claim outcome animation: reveal true distribution, score update
- [ ] `<ActionFeed>` with Framer Motion `AnimatePresence`; entries fade and self-delete at 15s
- [ ] On reconnect, client filters server-sent recent events older than 15s before rendering
- [ ] No history surface anywhere in the UI (verify in code review)
- [ ] Tests: claim with all correct, one wrong, claim by player with zero cards in set

**Exit criteria:** all requirements in [requirements_doc.md](requirements_doc.md) §4–§5 implemented. No permanent action log exists.

---

## Phase 6 — Reconnect, Polish, A11y

Goal: shippable quality.

- [ ] "Reconnecting…" banner during socket disconnect; non-blocking
- [ ] Disconnect handling: player marked offline, turn does not advance
- [ ] Host action: kick + substitute (or just kick) after extended disconnect
- [ ] Keyboard-only Ask + Claim flow
- [ ] Screen-reader announcements for turn changes and claim outcomes
- [ ] Loading + empty + error states across all screens
- [ ] Structured logging on the server (`{ roomId, playerId, action, durationMs, result }`)
- [ ] Basic metrics: room count, active players, action latency
- [ ] Playtest with 6 real humans; capture friction notes
- [ ] Resolve every Open Decision in [CLAUDE.md](CLAUDE.md) — bot policy, a11y, etc.

**Exit criteria:** survives a 6-human playtest with no game-breaking bugs and no rule disputes.

---

## Out of Scope for MVP

Tracked here so they don't sneak in. Revisit after Phase 6.

- React Native mobile app
- Persistent stats / leaderboards (Postgres)
- Voice / text chat
- Multi-instance horizontal scaling (single Node process is fine for MVP)
- Spectator mode
- Bot players for fewer than 6 humans
