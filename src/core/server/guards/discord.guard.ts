import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ExtendedClient } from '../../client.js';

/**
 * PreHandler Guard: Đảm bảo kết nối Discord Gateway đã sẵn sàng
 */
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
