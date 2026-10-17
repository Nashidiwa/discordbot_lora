import cors from '@fastify/cors';
import fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import type { ExtendedClient } from '../client.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

export const server: FastifyInstance = fastify({ logger: false });

void server.register(cors, { origin: true });

server.get('/healthz', async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.status(200).send({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export function requireDiscordReady(client: ExtendedClient) {
  return async (_request: FastifyRequest, reply: FastifyReply) => {
    if (!client.isReady()) {
      return reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Discord Gateway is not ready yet. Please try again later.',
      });
    }
  };
}

export async function startServer(port = config.PORT): Promise<void> {
  await server.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'Fastify Web Server is listening');
}

export async function stopServer(): Promise<void> {
  await server.close();
  logger.info('Fastify Web Server closed successfully');
}
