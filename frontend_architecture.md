# Frontend Architecture: Literature Online

## 1. Overview
The frontend is a thin renderer over the authoritative server state. It owns presentation, input, animation, and ephemeral UX timers (e.g., the 15-second action-feed fade) — but holds **no game rules**. Every state change comes from the server; every player action is a server-validated RPC.

**Primary concerns:**
- Real-time rendering of server-pushed state with minimal latency
- Circular table layout with alternating team seating
- Responsive 8- or 9-card hand with auto-sort
- Ephemeral, self-deleting action feed (15s)
- Reconnect-safe session continuity
- Cross-platform readiness (web first, React Native later)

## 2. Technology Stack

| Layer | Choice | Rationale |
| :--- | :--- | :--- |
| Framework | React + TypeScript | Component model maps cleanly to table/seat/hand; ecosystem for RN reuse. |
| Bundler | Vite | Fast HMR; ESM-native; minimal config. |
| State | Zustand | Lightweight, no boilerplate; one store per concern; trivially testable. |
| Transport | Socket.IO client | Mirrors backend; built-in reconnect with exponential backoff. |
| Styling | Tailwind + CSS variables | Token-based theming; works inside RN via NativeWind for portability. |
| Animation | Framer Motion (web) / Reanimated (RN) | Hand layout, card transfers, feed fade. |
| Routing | React Router | `/`, `/room/:code`, `/play/:code`. |
| Forms / Validation | React Hook Form + Zod | Same Zod schemas the backend uses — shared via a `packages/shared` workspace. |

## 3. Architectural Boundary
The codebase is split into **three layers** with strict downward dependency:

```
┌─────────────────────────────────────────┐
│  Presentation (React components, JSX)   │   stateless where possible
├─────────────────────────────────────────┤
│  Domain (Zustand stores, selectors)     │   pure derivation of UI state
├─────────────────────────────────────────┤
│  Transport (socket client, REST client) │   no React, no DOM
└─────────────────────────────────────────┘
```

Presentation reads from Domain; Domain receives updates from Transport. Components never call the socket directly — they dispatch intents through the store.

The Domain layer is platform-agnostic (no DOM, no `window`). This is what makes React Native reuse feasible: the same stores, selectors, and intent dispatchers ship to mobile; only the Presentation layer is re-skinned.

## 4. Project Structure

```
apps/
  web/                    # React web app (MVP)
  mobile/                 # React Native app (post-MVP, shares packages/)
packages/
  shared/                 # Zod schemas, types, GameVariant configs — shared with backend
  domain/                 # Zustand stores, selectors, transport-agnostic logic
  ui-web/                 # Web-specific presentation components
```

## 5. State Stores

Five small stores, each with a single responsibility:

| Store | Owns | Source of truth |
| :--- | :--- | :--- |
| `sessionStore` | JWT, playerId, displayName, avatar | Cookie / local storage |
| `lobbyStore` | Room code, variant, seats, ready status | Server `lobby:update` |
| `gameStore` | Projected game state (your hand, others' counts, turn, score, claimed sets) | Server `game:state` |
| `feedStore` | Last N action events with their `expiresAt` timestamps | Server `game:event` + local timer |
| `uiStore` | Modal state, selected card, claim-builder draft | Local only |

Each store exposes selectors (e.g., `selectMyHandSorted`, `selectIsMyTurn`) so components subscribe to derived slices and avoid unnecessary re-renders.

### Why split this way
- Server-driven stores (`lobbyStore`, `gameStore`, `feedStore`) are write-only-from-transport.
- Local stores (`uiStore`) are write-only-from-components.
- This split makes it impossible to accidentally mutate authoritative state from a click handler.

## 6. Transport Layer

A singleton socket client wraps Socket.IO:

```ts
// packages/domain/src/transport/socket.ts
export const socket = new SocketClient({
  url: env.SOCKET_URL,
  auth: () => ({ token: sessionStore.getState().token }),
  onEvent: {
    "lobby:update": lobbyStore.getState().applyUpdate,
    "game:state":   gameStore.getState().applyState,
    "game:event":   feedStore.getState().appendEvent,
    "error":        uiStore.getState().showError,
  },
});
```

Outbound intents are typed and use ack-style RPC:

```ts
async function askForCard(targetPlayerId: string, card: Card) {
  const result = await socket.emitWithAck("game:ask", { targetPlayerId, card });
  if (!result.ok) uiStore.getState().showError(result.error);
}
```

All payloads (in and out) are validated by the **same Zod schemas** the backend uses, imported from `packages/shared`. A schema mismatch is a build-time error, not a runtime surprise.

## 7. Reconnection Flow

1. Socket disconnects (network blip, refresh).
2. `sessionStore` retains the JWT in an `HttpOnly` cookie.
3. Socket.IO auto-reconnects with backoff; on success it re-authenticates.
4. Server pushes a fresh `game:state` projection.
5. `feedStore` receives any recent events the server retained; expired ones are filtered out client-side.

The UI shows a non-blocking "Reconnecting…" banner during disconnect. The game does not auto-forfeit.

## 8. Key UI Modules

### 8.1 Table Layout (circular, alternating teams)
A `<Table>` component places 6 `<Seat>` components on an ellipse keyed by viewer perspective — the local player always sits at the bottom-center. Seat order is computed from server-assigned `seatIndex` such that teams alternate: A, B, A, B, A, B.

```
        Seat 4 (B)
   Seat 3 (A)   Seat 5 (A)
   Seat 2 (B)   Seat 0 (B)  ◀ opponent slots
        Seat 1 (A) ◀ you (always bottom-center, rotated)
```

Implementation: a `useSeatPositions(viewerId, players)` hook returns `{ x, y, angle }` per seat. Rotation is purely visual; underlying seat indices stay server-canonical.

### 8.2 Hand Sorting
`selectMyHandSorted` sorts the local hand:
1. By suit, in canonical order.
2. Within each suit, by half-suit (Minor 2–7, Major 9–A).
3. Sequentially within a half-suit.
4. The 8s-and-Jokers set is clustered as its own visual group, separated by a small gap.

Hand UI uses CSS `flex` with negative margins for overlap, falling back to a fan layout at narrow viewports. 8 vs 9 cards is handled by the same layout — the breakpoint adjusts spacing, not structure.

### 8.3 The Ask Modal
A two-step modal:
1. **Pick a target** — only opposing-team players are selectable.
2. **Pick a card** — only cards in half-suits where the player holds at least one card are enabled (client-side pre-filter for UX; server still enforces).

For the 8s/Jokers set, the modal presents **"Joker"** as a single option with no Red/Black specifier, per requirements. The card object sent to the server is `{ kind: "joker" }` without a specific suit, and the server's Joker exception logic handles the rest.

### 8.4 The Claim Builder
A draggable interface where the claimant assigns each of 6 cards in a set to a teammate. The submit button is enabled only when every card has an assignee. Submission is irreversible (the server immediately resolves).

The Claim entry point is always visible — any player, any time, per requirements — but submission contends for the per-room mutex on the server.

### 8.5 Ephemeral Action Feed (15-second fade)
This is the only piece of game-relevant state the frontend owns timing for, and it's intentional: the fade is a UX device, not a rule.

```ts
// feedStore.ts
appendEvent(e: GameEvent) {
  const expiresAt = performance.now() + 15_000;
  set(state => ({ events: [...state.events, { ...e, expiresAt }] }));
  setTimeout(() => {
    set(state => ({ events: state.events.filter(x => x.id !== e.id) }));
  }, 15_000);
}
```

Rendering uses Framer Motion `AnimatePresence` for the fade-out. On reconnect, the server retransmits recent events; the client trusts the server's `ts` and filters anything older than 15 seconds locally.

**Critical:** no permanent log surface anywhere in the UI. No scroll-up, no "show history" toggle. Memory pressure is the game.

## 9. Cross-Platform Path

The Domain and Shared packages have zero DOM / `window` references. To ship React Native:
1. Add `apps/mobile/` with Expo + React Navigation.
2. Re-implement `ui-web` as `ui-native` using the same store selectors.
3. Swap Framer Motion → Reanimated; the animation contracts (durations, easings) live in `packages/shared` as tokens.

The socket client and Zod schemas ship unchanged.

## 10. Performance Considerations

- Subscribe components to narrow selectors; never `useStore(s => s)` at component scope.
- Memoize seat-position math — it depends only on viewer + roster.
- Animate transforms, not layout properties — card transfers must run at 60fps on mid-range hardware.
- Lazy-load the claim builder and the lobby creation flow; they aren't needed on first paint.

## 11. Testing

| Layer | Tool | What's tested |
| :--- | :--- | :--- |
| Domain stores | Vitest | Selectors are pure functions; given a server payload, do they produce the right derived state? |
| Components | React Testing Library | User can pick a target, pick a card, hit Ask. |
| Integration | Playwright | Two browser contexts join one room; verify Player A's hand never appears in Player B's DOM. |

The DOM-leak Playwright test is the frontend mirror of the backend's projection invariant — it's the most important test we own.

## 12. Open Decisions

- **Animation library on web:** Framer Motion is the default; revisit if bundle size becomes a constraint.
- **Avatar set:** Curated set vs. user upload — defer to design.
- **Sound design:** Soft cue when it's your turn; deferred to post-MVP.
- **Accessibility:** Keyboard-only flow for Ask + Claim — required for ship; needs design pass.
