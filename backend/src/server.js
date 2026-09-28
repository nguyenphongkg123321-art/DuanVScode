import { createApp } from './app.js';
import { getConfig } from './config.js';
import { createPool, runMigrations } from './db.js';

const config = getConfig();
const pool = createPool(config.databaseUrl);

await runMigrations(pool);

const app = createApp({ pool, ...config });
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Mini Game Hub API listening on port ${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
