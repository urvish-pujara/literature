import { SignJWT, jwtVerify } from 'jose';

export type SessionClaims = {
  playerId: string;
  roomId: string;
};

const ISSUER = 'literature';
const AUDIENCE = 'literature-client';

export async function signSession(claims: SessionClaims, secret: Uint8Array): Promise<string> {
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifySession(token: string, secret: Uint8Array): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, audience: AUDIENCE });
  const playerId = payload.playerId;
  const roomId = payload.roomId;
  if (typeof playerId !== 'string' || typeof roomId !== 'string') {
    throw new Error('invalid session claims');
  }
  return { playerId, roomId };
}
