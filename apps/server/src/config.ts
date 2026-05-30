export type ServerConfig = {
  port: number;
  host: string;
  jwtSecret: Uint8Array;
  corsOrigin: string;
  roomTtlMs: number;
};

function required(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (v === undefined) throw new Error(`missing required env var: ${key}`);
  return v;
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 4000),
    host: process.env.HOST ?? '0.0.0.0',
    jwtSecret: new TextEncoder().encode(required('JWT_SECRET', 'dev-secret-change-me')),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    roomTtlMs: Number(process.env.ROOM_TTL_MS ?? 30 * 60 * 1000),
  };
}
