import http from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { initSocket } from './lib/socket.js';
import { initRealtime } from './realtime/index.js';
import prisma from './lib/prisma.js';

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  const io = initSocket(server);
  initRealtime(io);

  server.listen(env.port, () => {
    console.log(`🎮 Ivoire Gaming API — http://localhost:${env.port}`);
    console.log(`    environment: ${env.nodeEnv}`);
  });

  // shutdown propre
  const shutdown = async () => {
    console.log('\nArrêt…');
    await prisma.$disconnect();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});