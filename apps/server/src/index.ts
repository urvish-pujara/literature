import { loadConfig } from './config.js';
import { buildServer } from './server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const ctx = await buildServer(config);
  await ctx.fastify.listen({ port: config.port, host: config.host });
}

main().catch((err: unknown) => {
  console.error('server failed to start', err);
  process.exit(1);
});
