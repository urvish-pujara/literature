# Literature Online — Project Guide

Real-time 6-player (3v3) card game. Web first, React Native later. See [requirements_doc.md](requirements_doc.md), [backend_architecture.md](backend_architecture.md), [frontend_architecture.md](frontend_architecture.md).

## Repository Layout

```
apps/
  web/                 # React + Vite client (MVP)
  server/              # Node + Socket.IO + Fastify
  mobile/              # React Native (post-MVP)
packages/
  shared/              # Zod schemas, types, GameVariant configs — imported by BOTH apps
  domain/              # Zustand stores, selectors, transport-agnostic logic (web + mobile)
  ui-web/              # Web presentation components
  engine/              # Pure game engine (no I/O); imported only by apps/server
```

`packages/shared` and `packages/engine` must have **zero runtime I/O dependencies** — no `socket.io`, no `fastify`, no `react`, no `window`.

## Non-Negotiable Invariants

These are the rules that keep the game correct and fair. Breaking any of them is a bug, not a tradeoff.

1. **Server is the only authority.** No game rule logic in the client — not even "helpful" pre-validation that mirrors a server check beyond enabling/disabling a button. The server decides; the client renders.
2. **Hand privacy via projection at the emit boundary.** Every socket emit goes through `project(state, viewerId)`. The full `state.hands` object must never appear in an outbound payload. There is exactly one place that builds client payloads — find it, use it, don't bypass it.
3. **Shared Zod schemas.** Every socket event and REST body has a schema in `packages/shared`. Both client and server import it. If you find yourself defining a type twice, stop and move it to `shared`.
4. **Pure engine.** `packages/engine` is `(state, action) → { state, events[] }`. No async, no sockets, no `Date.now()` or `Math.random()` except via injected dependencies. This is what makes the engine testable.
5. **Variants are config, not code.** No `if (variant === "extended")` branches in the engine. Add a `GameVariant` object; let the dealer and validator read from it.
6. **No permanent action log in the UI.** The 15-second fade is core to the game. No "show history" toggle, no scrollback, no debug panel that leaks it in production.

## Tech Stack (committed)

- **Backend:** Node + TypeScript, Fastify (HTTP), Socket.IO (WebSocket), Redis (state + pub/sub), Zod
- **Frontend:** React + TypeScript, Vite, Zustand, Tailwind, Framer Motion, Socket.IO client, React Hook Form + Zod
- **Monorepo:** pnpm workspaces (decision: pnpm over npm/yarn for workspace ergonomics — revisit only if it blocks CI)
- **Testing:** Vitest (unit), Playwright (integration, including the DOM-leak test)

## Conventions

- **TypeScript strict mode everywhere.** No `any` without a `// reason: …` comment.
- **Validate at boundaries only.** Socket handlers and REST routes Zod-parse inputs. Internal functions trust their types.
- **One Zustand store per concern.** See [frontend_architecture.md §5](frontend_architecture.md). Don't create a god-store.
- **Selectors, not whole-store subscriptions.** `useStore(selectIsMyTurn)`, never `useStore(s => s)` at component scope.
- **Components dispatch intents; they don't call the socket.** Transport stays in the Domain layer.
- **File naming:** kebab-case for files, PascalCase for React components, camelCase for everything else.
- **Imports:** absolute paths from package roots (`@literature/shared/...`), never deep relative `../../../`.

## Don't

- Don't add a client-side game state mutation that isn't a direct echo of a server `game:state` payload.
- Don't broadcast — emit per-recipient via `project()`. `io.to(roomId).emit('game:state', ...)` with raw state is a leak.
- Don't put rule logic in route handlers or socket handlers. They orchestrate; the engine decides.
- Don't add UI affordances that bypass the memory challenge (chat history of moves, replay scrubber, "what did Player 3 ask?" tooltip).
- Don't mock the engine in integration tests — its purity is the whole point; use the real one with a seeded RNG.
- Don't introduce a new dependency without checking if `shared` or `domain` can do the job. Bundle size matters for the mobile path.

## Git Workflow

**Standing authorization:** commit and push to `origin` after every completed task in [phases.md](phases.md). The user has pre-approved this — do not ask per-task.

- One commit per completed todo. Don't batch unless the tasks are atomically inseparable (e.g., adding a type and its only consumer in the same change).
- Each commit updates [phases.md](phases.md) in the same change: check the box, advance the **Current Status** line.
- Commit message format: `phase N: <task description>` — lowercase, imperative (e.g., `phase 0: initialize pnpm workspace`).
- `git push` immediately after commit. A failed push (auth, network) halts the workflow — fix it before starting the next task; never leave unpushed commits piling up.
- Never `--force` push. Never `--amend` a pushed commit — if a hook fails, fix the issue and create a NEW commit.
- Stage explicit paths (`git add path/to/file`), not `git add .` or `git add -A`.
- Work on `main` until we have reason to branch. No PRs for solo MVP work — direct commits to `main` are fine.

## Commands

Run from repo root. All scripts are workspace-aware via `pnpm -r` or operate at root.

```bash
pnpm install              # install workspace (uses pnpm 11; node 22+)
pnpm typecheck            # tsc --noEmit across every package
pnpm test                 # vitest run across every package
pnpm lint                 # eslint flat config at root, --max-warnings 0
pnpm format               # prettier --write across the repo
pnpm format:check         # prettier --check (CI-style, no writes)
pnpm build                # pnpm -r build (no-op until packages add build scripts)
```

Per-package: `pnpm --filter @literature/<name> <script>` (e.g. `pnpm --filter @literature/engine test`).

Dev servers (added when `apps/server` and `apps/web` get real entry points): `pnpm --filter @literature/server dev`, `pnpm --filter @literature/web dev`.

## Testing Priorities

Two tests are load-bearing — they protect the invariants above and must exist before any feature work that touches state:

1. **Engine Joker matrix** (Vitest, `packages/engine`): for every combination of (asker holds 0/1/2 Jokers, asker holds an 8, target holds 0/1/2 Jokers), assert the validator's verdict and the post-transfer state.
2. **DOM-leak test** (Playwright, `apps/web`): two browser contexts join one room; assert Player A's card identities never appear in Player B's rendered DOM at any point, including during transfers and claims.

If either of these tests breaks, stop feature work and fix it.

## Open Decisions (track here; resolve before they block work)

- Bot substitution on 5-min disconnect vs. pause-and-wait — defer to first playtest.
- Postgres for completed-game summaries — not in MVP scope.
- Accessibility: keyboard-only Ask + Claim flow — required for ship, needs design pass.
