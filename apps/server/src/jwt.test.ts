import { describe, it, expect } from 'vitest';
import { signSession, verifySession } from './jwt.js';

const secret = new TextEncoder().encode('test-secret');
const otherSecret = new TextEncoder().encode('different-secret');

describe('signSession / verifySession', () => {
  it('round-trips claims', async () => {
    const token = await signSession({ playerId: 'p1', roomId: 'room-123' }, secret);
    const claims = await verifySession(token, secret);
    expect(claims.playerId).toBe('p1');
    expect(claims.roomId).toBe('room-123');
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSession({ playerId: 'p1', roomId: 'r1' }, secret);
    await expect(verifySession(token, otherSecret)).rejects.toThrow();
  });

  it('rejects garbage', async () => {
    await expect(verifySession('not-a-jwt', secret)).rejects.toThrow();
  });
});
