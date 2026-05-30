# Backend Architecture: Literature Online

## 1. Overview

The backend is the authoritative source of truth for all game state. It enforces rules, validates actions, manages hand privacy, and pushes real-time updates to clients over a persistent connection. Clients are treated as untrusted renderers; no rule logic runs on them.

**Primary concerns:**

- Real-time bi-directional messaging (WebSockets)
- Authoritative, server-side game engine
- Per-player payload filtering (hand privacy)
- Session continuity through reconnect
- Configuration-driven game variants (Classic / Extended)

## 2. Technology Stack

| Layer                  | Choice                        | Rationale                                                                                    |
| :--------------------- | :---------------------------- | :------------------------------------------------------------------------------------------- |
| Runtime                | Node.js + TypeScript          | Shared type definitions with frontend; strong ecosystem for WebSocket workloads.             |
| Transport              | Socket.IO (over WebSocket)    | Rooms primitive, ack-based RPC, automatic reconnect, fallback transport.                     |
| HTTP                   | Fastify (or Express)          | Lobby REST endpoints, health checks, JWT issuance.                                           |
| State Store            | Redis                         | Authoritative in-memory game state, pub/sub for horizontal scaling, TTLs for orphaned rooms. |
| Persistence (optional) | Postgres                      | Completed-game summaries only; live state stays in Redis.                                    |
| Auth                   | Stateless JWT (signed cookie) | Anonymous identity tied to a guest profile; survives refresh/disconnect.                     |
| Schema                 | Zod                           | Runtime validation at every socket boundary.                                                 |

## 3. High-Level Topology

```
                  ┌──────────────────────────┐
   HTTP REST ───▶ │  Fastify (lobby, auth)   │
                  └────────────┬─────────────┘
                               │
                  ┌────────────┴─────────────┐
   WebSocket ───▶ │   Socket.IO Gateway      │ ◀── multi-instance
                  └────────────┬─────────────┘
                               │
                  ┌────────────┴─────────────┐
                  │  GameRoomService         │  (one per room, in-memory)
                  │   ├─ GameEngine (pure)   │
                  │   ├─ TurnController      │
                  │   └─ ClaimController     │
                  └────────────┬─────────────┘
                               │
                  ┌────────────┴─────────────┐
                  │  Redis (state + pub/sub) │
                  └──────────────────────────┘
```

## 4. Core Modules

### 4.1 Lobby Service

- `POST /rooms` — Host creates a room. Body: `{ variant: "classic" | "extended" }`. Generates a 6-digit short code (collision-checked), returns `{ roomId, shortCode, hostToken }`.
- `POST /rooms/:code/join` — Returns `{ playerId, sessionToken }` (signed JWT). Issued before the socket connection so the socket can authenticate.
- `GET /rooms/:code` — Returns lobby metadata (variant, seats, ready status) — never live hand data.

The 6-digit code maps to an internal `roomId` (UUID). Codes expire after 30 minutes if the game never starts.

### 4.2 Socket Gateway

Single namespace, rooms keyed by `roomId`. The gateway is thin: it authenticates the JWT, dispatches typed events to `GameRoomService`, and emits filtered payloads back.

**Event taxonomy:**

| Direction | Event                         | Payload                                            |
| :-------- | :---------------------------- | :------------------------------------------------- |
| C → S     | `lobby:seat`                  | `{ team: "A" \| "B", seatIndex }`                  |
| C → S     | `lobby:randomize` (host only) | `{}`                                               |
| C → S     | `lobby:start` (host only)     | `{}`                                               |
| C → S     | `game:ask`                    | `{ targetPlayerId, card }`                         |
| C → S     | `game:claim`                  | `{ setId, assignments: Record<cardId, playerId> }` |
| S → C     | `lobby:update`                | sanitized lobby state                              |
| S → C     | `game:state`                  | **per-player** view (only that player's hand)      |
| S → C     | `game:event`                  | broadcast action (ask, transfer, claim outcome)    |
| S → C     | `error`                       | `{ code, message }`                                |

All inbound payloads are validated by Zod before reaching the engine. Any failure → typed `error` event, no engine mutation.

### 4.3 Game Engine (pure)

A pure, deterministic module that takes `(state, action) → { state, events[] }`. No I/O, no sockets, no random number generation outside an injected RNG. This is the rule core and is the only place where game rules live.

**Sub-components:**

- `Dealer` — Reads `GameVariant` config, builds a deck, shuffles via injected RNG, deals N cards per player.
- `ActionValidator` — Enforces the four ask-validation rules (targeting, base requirement, absence requirement, Joker exception).
- `ClaimResolver` — Resolves a claim attempt against ground truth; produces a score delta and removes the set.
- `TurnController` — Advances turn; handles "successful ask retains turn" / "failed ask passes turn" semantics.

The engine is the only consumer of full state. The gateway never reads `state.players[*].hand` directly when emitting to clients.

### 4.4 Variant Configuration

Variants live in a static config file conforming to the `GameVariant` interface in the requirements doc. The dealer and validator are 100% driven by this config — there are no `if (variant === "extended")` branches in the engine. Adding a regional variant means adding a config, not editing the engine.

```ts
// src/engine/variants/extended.ts
export const EXTENDED: GameVariant = {
  name: 'extended',
  totalCards: 54,
  totalSets: 9,
  cardsPerPlayer: 9,
  sets: [
    /* 8 standard half-suits + jokers-and-eights set */
  ],
};
```

### 4.5 Hand Privacy & State Projection

After every state mutation, the gateway emits a **per-socket projection**:

```ts
function project(state: GameState, viewerId: PlayerId): ClientGameState {
  return {
    you: { id: viewerId, hand: state.hands[viewerId] },
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      handCount: state.hands[p.id].length, // count only, never cards
    })),
    turn: state.turn,
    score: state.score,
    claimedSets: state.claimedSets,
  };
}
```

No `broadcast` ever carries `state.hands`. Every emit is iterated per recipient through `project`. This is the single most important invariant in the system.

### 4.6 Action Validation Details

The Joker exception is encoded explicitly in `ActionValidator`:

```ts
function canAskFor(card: Card, hand: Card[], set: SetDef): ValidationResult {
  if (!hand.some((c) => set.cards.includes(c.id))) return fail('BASE_REQUIREMENT');
  if (card.kind === 'joker') {
    const jokerCount = hand.filter((c) => c.kind === 'joker').length;
    return jokerCount >= 2 ? fail('ABSENCE_REQUIREMENT') : ok();
  }
  return hand.some((c) => c.id === card.id) ? fail('ABSENCE_REQUIREMENT') : ok();
}
```

Joker transfer is also explicit: if the target holds ≥1 Joker, exactly one is moved — not both — regardless of how many they hold.

### 4.7 Claiming System

A claim can be triggered by any player at any time, subject only to the turn lock (one in-flight action at a time). The controller:

1. Acquires a per-room mutex (Redis SETNX or in-process lock).
2. Verifies the claimant has at least one card in the set, or has zero cards and a teammate does.
3. Compares assignments to ground truth.
4. Awards 1 point to the correct team; removes all 6 cards.
5. Emits a `game:event` with the outcome and the (now-revealed) true distribution.

Concurrency note: an active ask and a claim cannot interleave. The room-level mutex serializes all engine inputs.

### 4.8 Session & Reconnection

- JWT issued at join time, signed with a server secret, claims `{ playerId, roomId, iat }`.
- Client stores token in an `HttpOnly` cookie (web) or secure storage (mobile-ready).
- On socket connect: token verified → player marked `connected: true`, full projected state re-sent.
- On disconnect: player marked `connected: false`, **state preserved**. Turn does not advance.
- After 5 minutes of disconnect, the host can kick + substitute a bot, or the room is abandoned.

### 4.9 Ephemeral Action Feed

The server emits `game:event` for every public action with `{ id, type, payload, ts }`. The server does **not** track per-client visibility — the 15-second fade is a UI concern (see frontend doc). The server retains the last N events only for late-joining reconnects (so a player who reconnects mid-fade can see in-flight events).

## 5. Scaling Model

**Single-instance MVP:** All room state lives in the Node process. Redis is optional.

**Multi-instance (post-MVP):**

- Sticky room→instance routing via a consistent hash on `roomId` at the load balancer.
- Redis pub/sub for cross-instance lobby discovery and presence.
- Authoritative state still owned by exactly one instance per room — no distributed consensus needed because rooms are independent shards.

Horizontal scaling is by sharding rooms across instances, not by sharing a room's state.

## 6. Security & Anti-Cheat

| Threat                                     | Mitigation                                                                          |
| :----------------------------------------- | :---------------------------------------------------------------------------------- |
| Client spoofs another player's action      | JWT claims `playerId`; server ignores any client-supplied identity.                 |
| Client inspects network for opponent hands | Server never sends them — projection enforced at the emit boundary.                 |
| Replay attack on actions                   | Each action carries a server-issued `turnToken`; engine rejects stale tokens.       |
| Brute-forcing room codes                   | 6-digit code is rate-limited per IP; codes expire after 30 min.                     |
| Malformed payloads                         | Zod schemas at every socket handler; failures are typed and never crash the engine. |

## 7. Testability

The pure engine is the seam. Tests are written as `(state, action) → expected state + events` cases — no sockets, no async, no mocks. Critical scenarios:

- Joker ask with 0/1/2 Jokers in hand (3 cases each for hold/don't-hold target).
- Mid-turn claim by a teammate not on active turn.
- Claim with one wrong assignment → opponents score.
- Reconnect after deal, after ask, after claim.

Integration tests exercise the socket layer with two real clients verifying that one client's hand never appears in the other's payload.

## 8. Observability

- Structured logs per action: `{ roomId, playerId, action, durationMs, result }`.
- Metric: `game_action_latency_ms` (p50/p99), `room_count`, `active_player_count`.
- Audit log of every state transition retained for the room's lifetime, then discarded (privacy default; no permanent gameplay history).

## 9. Open Decisions

- **Bot fill-in policy:** Should a 5-minute disconnect auto-substitute a bot, or pause the game? Defer to playtest.
- **Postgres usage:** Required only if leaderboards/persistent stats become a goal. MVP is stateless.
- **Voice/chat:** Out of scope per requirements; rely on external tools.
