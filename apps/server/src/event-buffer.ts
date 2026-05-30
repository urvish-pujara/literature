import type { ServerGameEvent } from './emit.js';

const MAX_EVENTS = 20;

export class EventBuffer {
  private readonly buffers = new Map<string, ServerGameEvent[]>();

  append(roomId: string, event: ServerGameEvent): void {
    const current = this.buffers.get(roomId) ?? [];
    const next = [...current, event];
    if (next.length > MAX_EVENTS) next.splice(0, next.length - MAX_EVENTS);
    this.buffers.set(roomId, next);
  }

  get(roomId: string): ServerGameEvent[] {
    return this.buffers.get(roomId) ?? [];
  }

  clear(roomId: string): void {
    this.buffers.delete(roomId);
  }
}
