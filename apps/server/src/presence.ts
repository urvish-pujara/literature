export class PresenceTracker {
  private readonly counts = new Map<string, Map<string, number>>();

  add(roomId: string, playerId: string): { wentOnline: boolean } {
    const room = this.counts.get(roomId) ?? new Map<string, number>();
    const next = (room.get(playerId) ?? 0) + 1;
    room.set(playerId, next);
    this.counts.set(roomId, room);
    return { wentOnline: next === 1 };
  }

  remove(roomId: string, playerId: string): { wentOffline: boolean } {
    const room = this.counts.get(roomId);
    if (!room) return { wentOffline: false };
    const current = room.get(playerId) ?? 0;
    if (current <= 1) {
      room.delete(playerId);
      return { wentOffline: current === 1 };
    }
    room.set(playerId, current - 1);
    return { wentOffline: false };
  }

  isOnline(roomId: string, playerId: string): boolean {
    return (this.counts.get(roomId)?.get(playerId) ?? 0) > 0;
  }

  onlinePlayerIds(roomId: string): Set<string> {
    const room = this.counts.get(roomId);
    if (!room) return new Set();
    return new Set(room.keys());
  }

  clearRoom(roomId: string): void {
    this.counts.delete(roomId);
  }
}
