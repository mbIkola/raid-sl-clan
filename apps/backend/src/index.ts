import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(websocket);

app.get('/api/health', async () => ({ status: 'ok' }));

app.get('/ws', { websocket: true }, (connection /*, req */) => {
  connection.socket.send('hello from ws');
});

const port = Number(process.env.PORT || 3000);
try {
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`Backend listening on ${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

