import { describe, it, expect, afterEach } from 'vitest';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { type AddressInfo } from 'node:net';
import type { AppContext } from './server.js';
import { buildServer } from './server.js';
import { CLASSIC, getDeck } from '@literature/shared';

const secret = new TextEncoder().encode('test-secret');

let ctx: AppContext | null = null;
let clients: ClientSocket[] = [];

afterEach(async () => {
  for (const c of clients) c.disconnect();
  clients = [];
  if (ctx) {
    await ctx.fastify.close();
    ctx = null;
  }
});

async function start(): Promise<{ url: string; ctx: AppContext }> {
  const c = await buildServer({
    port: 0,
    host: '127.0.0.1',
    jwtSecret: secret,
    corsOrigin: '*',
    roomTtlMs: 30 * 60 * 1000,
  });
  await c.fastify.listen({ port: 0, host: '127.0.0.1' });
  const addr = c.fastify.server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${addr.port}`, ctx: c };
}

type CreateBody = { roomId: string; code: string; playerId: string; token: string };
type JoinBody = { roomId: string; playerId: string; token: string };

async function http<T>(
  c: AppContext,
  method: 'POST',
  url: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const r = await c.fastify.inject({ method, url, payload });
  return r.json<T>();
}

function connect(url: string, token: string): ClientSocket {
  const c = ioClient(url, { auth: { token }, transports: ['websocket'], reconnection: false });
  clients.push(c);
  return c;
}

function waitFor<T>(socket: ClientSocket, event: string, predicate?: (p: T) => boolean): Promise<T> {
  return new Promise((resolve) => {
    const handler = (payload: T): void => {
      if (!predicate || predicate(payload)) {
        socket.off(event, handler);
        resolve(payload);
      }
    };
    socket.on(event, handler);
  });
}

describe('LEAK INVARIANT — game:state payloads never expose other players’ cards', () => {
  it('initial deal: every client sees only their own hand; no other card ids appear in their payload', async () => {
    const { url, ctx: c } = await start();
    ctx = c;

    // Create + 5 join
    const host = await http<CreateBody>(c, 'POST', '/rooms', { variant: 'classic' });
    const joins: JoinBody[] = [];
    for (let i = 0; i < 5; i++) {
      joins.push(await http<JoinBody>(c, 'POST', `/rooms/${host.code}/join`, { displayName: `P${i + 1}` }));
    }

    const sessions = [host, ...joins];
    const sockets = sessions.map((s) => connect(url, s.token));

    // Collect game:state for each socket and wait until all received one
    const gameStates: { viewerId: string; payload: string }[] = [];
    const gameStatePromises = sockets.map((sock, idx) =>
      waitFor<{ you: { id: string; hand: { id: string }[] } }>(sock, 'game:state').then((payload) => {
        gameStates.push({ viewerId: sessions[idx]!.playerId, payload: JSON.stringify(payload) });
      }),
    );

    // Wait for each socket to connect AND receive initial lobby:update
    await Promise.all(
      sockets.map(
        (s) =>
          new Promise<void>((resolve) => {
            s.once('connect', () => resolve());
          }),
      ),
    );

    // Host starts the game
    sockets[0]!.emit('lobby:start', {});

    await Promise.all(gameStatePromises);

    // Now load the server-side truth
    const room = await c.store.getById(host.roomId);
    expect(room?.state).toBeDefined();
    const trueHands = room!.state!.hands;

    const allCardIds = new Set(getDeck(CLASSIC).map((card) => card.id));

    for (const { viewerId, payload } of gameStates) {
      const myHandIds = new Set(trueHands[viewerId]!.map((c) => c.id));
      // Strip the "you.hand" segment from the payload — those card ids are legitimately there.
      // Use a regex-safe strip: replace the value of you.hand with []
      const stripped = payload.replace(/"you":\{"id":"[^"]*","hand":\[[^\]]*\]/, '"you":{}');

      // Any card id that appears in the stripped payload AND is in the deck is a leak,
      // UNLESS it's a card the viewer holds (defense in depth — shouldn't happen since we stripped).
      for (const cardId of allCardIds) {
        if (myHandIds.has(cardId)) continue;
        const occurrence = stripped.indexOf(`"${cardId}"`);
        expect(occurrence, `viewer ${viewerId} payload leaks card ${cardId}`).toBe(-1);
      }
    }
  });

  it('after an ask, the projected state for non-participants still shows only their hand', async () => {
    const { url, ctx: c } = await start();
    ctx = c;

    const host = await http<CreateBody>(c, 'POST', '/rooms', { variant: 'classic' });
    const joins: JoinBody[] = [];
    for (let i = 0; i < 5; i++) {
      joins.push(await http<JoinBody>(c, 'POST', `/rooms/${host.code}/join`, { displayName: `P${i + 1}` }));
    }
    const sessions = [host, ...joins];
    const sockets = sessions.map((s) => connect(url, s.token));

    await Promise.all(
      sockets.map(
        (s) =>
          new Promise<void>((resolve) => {
            s.once('connect', () => resolve());
          }),
      ),
    );

    // Capture initial game:state for each viewer
    const initialPromises = sockets.map((s) =>
      waitFor<{ you: { id: string; hand: { id: string }[] } }>(s, 'game:state'),
    );

    sockets[0]!.emit('lobby:start', {});
    const initialStates = await Promise.all(initialPromises);

    // Find a valid ask: p1 picks a card from a set p1 has at least one card in, that p1 doesn't hold,
    // that an opponent does hold.
    const hostHand = initialStates[0]!.you.hand.map((c) => c.id);
    const room = await c.store.getById(host.roomId);
    // Host is at seat 0 → team A. Opponents (team B) are players at seats 1, 3, 5.
    const opponentIds = room!.players.filter((p) => p.team === 'B').map((p) => p.id);
    let askCardId: string | undefined;
    let targetId: string | undefined;
    for (const set of CLASSIC.sets) {
      if (!hostHand.some((id) => set.cards.some((c) => c.id === id))) continue;
      for (const sc of set.cards) {
        if (hostHand.includes(sc.id)) continue;
        for (const oppId of opponentIds) {
          if (room!.state!.hands[oppId]!.some((c) => c.id === sc.id)) {
            askCardId = sc.id;
            targetId = oppId;
            break;
          }
        }
        if (askCardId) break;
      }
      if (askCardId) break;
    }
    expect(askCardId).toBeDefined();
    expect(targetId).toBeDefined();

    // After the ask, every client should receive an updated game:state. Capture them.
    const nextStates = sockets.map((s) =>
      waitFor<{ you: { id: string; hand: { id: string }[] } }>(s, 'game:state'),
    );
    const askAck = await new Promise<{ ok: boolean; code?: string; message?: string }>((resolve) => {
      sockets[0]!.emit(
        'game:ask',
        {
          type: 'ask',
          askerId: host.playerId,
          targetId,
          request: { kind: 'standard', cardId: askCardId },
        },
        (resp: { ok: boolean; code?: string; message?: string }) => resolve(resp),
      );
    });
    expect(askAck.ok, `ask ack: ${JSON.stringify(askAck)}`).toBe(true);
    const afterAsk = await Promise.all(nextStates);

    const updatedRoom = await c.store.getById(host.roomId);
    const trueHands = updatedRoom!.state!.hands;
    const allCardIds = new Set(getDeck(CLASSIC).map((c) => c.id));

    // For each NON-PARTICIPANT viewer (not the asker, not the target), assert their payload
    // contains only their hand's card ids — nothing else.
    for (let i = 0; i < sockets.length; i++) {
      const viewerId = sessions[i]!.playerId;
      if (viewerId === host.playerId || viewerId === targetId) continue;
      const payload = JSON.stringify(afterAsk[i]);
      const myHandIds = new Set(trueHands[viewerId]!.map((c) => c.id));
      const stripped = payload.replace(/"you":\{"id":"[^"]*","hand":\[[^\]]*\]/, '"you":{}');
      for (const cardId of allCardIds) {
        if (myHandIds.has(cardId)) continue;
        expect(stripped.indexOf(`"${cardId}"`), `viewer ${viewerId} leaks ${cardId}`).toBe(-1);
      }
    }
  });
});
