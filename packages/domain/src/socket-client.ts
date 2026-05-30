import { io, type Socket } from 'socket.io-client';
import type { CardRequest, ClientGameState, GameEvent } from '@literature/shared';
import { useLobbyStore, type LobbyView } from './lobby-store.js';
import { useGameStore } from './game-store.js';
import { useFeedStore } from './feed-store.js';
import { useUiStore } from './ui-store.js';
import { useSessionStore } from './session-store.js';

export type AckResponse = { ok: true } | { ok: false; code: string; message?: string };

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

type Listener = (status: ConnectionStatus) => void;

let socket: Socket | null = null;
let status: ConnectionStatus = 'idle';
const statusListeners = new Set<Listener>();

function setStatus(next: ConnectionStatus): void {
  status = next;
  for (const l of statusListeners) l(status);
}

export function getStatus(): ConnectionStatus {
  return status;
}

export function onStatusChange(listener: Listener): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function connectSocket(url: string, token: string): Socket {
  if (socket) socket.disconnect();
  setStatus('connecting');
  const s = io(url, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  });
  socket = s;

  s.on('connect', () => setStatus('connected'));
  s.on('disconnect', () => setStatus('disconnected'));
  s.io.on('reconnect_attempt', () => setStatus('connecting'));

  s.on('lobby:update', (payload: LobbyView) => {
    useLobbyStore.getState().applyUpdate(payload);
  });
  s.on('game:state', (payload: ClientGameState) => {
    useGameStore.getState().applyState(payload);
  });
  s.on('game:event', (payload: GameEvent & { id: string; ts: number }) => {
    // filter out stale events (older than fade window) on the way in
    if (Date.now() - payload.ts > 15_000) return;
    useFeedStore.getState().appendEvent(payload);
  });
  s.on('error', (payload: { code: string; message: string }) => {
    useUiStore.getState().showToast({ kind: 'error', message: payload.message });
  });

  return s;
}

export function leaveRoom(): void {
  disconnectSocket();
  useSessionStore.getState().clear();
  useLobbyStore.getState().clear();
  useGameStore.getState().clear();
  useFeedStore.getState().clear();
}

export function disconnectSocket(): void {
  if (!socket) return;
  socket.disconnect();
  socket = null;
  setStatus('idle');
}

function getSocketOrThrow(): Socket {
  if (!socket) throw new Error('socket not connected');
  return socket;
}

function emitAck<R = AckResponse>(event: string, payload: unknown): Promise<R> {
  const s = getSocketOrThrow();
  return new Promise((resolve) => {
    s.emit(event, payload, (resp: R) => resolve(resp));
  });
}

export function seat(team: 'A' | 'B', seatIndex: number): Promise<AckResponse> {
  return emitAck('lobby:seat', { team, seatIndex });
}

export function randomizeSeats(): Promise<AckResponse> {
  return emitAck('lobby:randomize', {});
}

export function startGame(): Promise<AckResponse> {
  return emitAck('lobby:start', {});
}

export function askForCard(args: {
  askerId: string;
  targetId: string;
  request: CardRequest;
}): Promise<AckResponse> {
  return emitAck('game:ask', { type: 'ask', ...args });
}

export function submitClaim(args: {
  claimantId: string;
  setId: string;
  assignments: Record<string, string>;
}): Promise<AckResponse> {
  return emitAck('game:claim', { type: 'claim', ...args });
}
