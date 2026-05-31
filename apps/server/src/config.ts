export type ServerConfig = {
  port: number;
  host: string;
  jwtSecret: Uint8Array;
  corsOrigin: string[];
  roomTtlMs: number;
  redisUrl: string | null;
  env: 'development' | 'production' | 'test';
};

function readEnv(): 'development' | 'production' | 'test' {
  const e = process.env['NODE_ENV'];
  if (e === 'production' || e === 'test') return e;
  return 'development';
}

function readSecret(env: ServerConfig['env']): string {
  const v = process.env['JWT_SECRET'];
  if (v && v.length >= 16) return v;
  if (env === 'production') {
    throw new Error('JWT_SECRET must be set to a value of at least 16 characters in production');
  }
  // dev/test fallback — explicit string so we don't accidentally ship the prod-default change
  return 'dev-secret-change-me-min-16';
}

function readCors(): string[] {
  const raw = process.env['CORS_ORIGIN'];
  if (!raw) return ['http://localhost:5173'];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function loadConfig(): ServerConfig {
  const env = readEnv();
  return {
    port: Number(process.env['PORT'] ?? 4000),
    host: process.env['HOST'] ?? '0.0.0.0',
    jwtSecret: new TextEncoder().encode(readSecret(env)),
    corsOrigin: readCors(),
    roomTtlMs: Number(process.env['ROOM_TTL_MS'] ?? 30 * 60 * 1000),
    redisUrl: process.env['REDIS_URL'] ?? null,
    env,
  };
}
