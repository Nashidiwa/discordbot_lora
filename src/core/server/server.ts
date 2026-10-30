import fastify, { type FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { registerCookiePlugin } from './plugins/cookie.plugin.js';
import { registerCorsPlugin } from './plugins/cors.plugin.js';
import { registerStaticPlugin } from './plugins/static.plugin.js';
import { SSEManager } from './sse/sse-manager.js';

export const server: FastifyInstance = fastify({ logger: false });

// Hỗ trợ request mang Content-Type: application/json nhưng body rỗng phân giải an toàn thành {}
server.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  (_req, body, done) => {
    if (!body || (typeof body === 'string' && body.trim() === '')) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(body as string));
    } catch (err) {
      done(err as Error, undefined);
    }
  },
);

// Đăng ký các plugins hạ tầng theo tuần tự
await registerCorsPlugin(server);
await registerCookiePlugin(server);
await registerStaticPlugin(server);

// Khởi động server
export async function startServer(port = config.PORT): Promise<void> {
  await server.listen({ port, host: '0.0.0.0' });
  logger.info({ port }, 'Fastify Web Server is listening');
}

// Dừng server khi shutdown tiến trình
export async function stopServer(): Promise<void> {
  SSEManager.shutdown();
  await server.close();
  logger.info('Fastify Web Server closed successfully');
}

// Re-export guards để các modules/routes thuận tiện import
export * from './guards/index.js';
