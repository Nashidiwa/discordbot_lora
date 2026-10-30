import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../../logger.js';

export async function registerStaticPlugin(
  server: FastifyInstance,
): Promise<void> {
  const dashboardDistPath = path.resolve(process.cwd(), 'dashboard/dist');

  if (!fs.existsSync(dashboardDistPath)) {
    logger.debug(
      { path: dashboardDistPath },
      'Dashboard dist directory not found, static SPA serving is disabled',
    );
    return;
  }

  await server.register(fastifyStatic, {
    root: dashboardDistPath,
    prefix: '/',
    decorateReply: false,
  });

  server.setNotFoundHandler(async (request, reply) => {
    // Nếu request là API hoặc Auth route mà không tìm thấy -> trả về 404 JSON
    if (
      request.url.startsWith('/api/') ||
      request.url.startsWith('/auth/') ||
      request.url.startsWith('/sse/')
    ) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Endpoint ${request.method}:${request.url} not found`,
      });
    }

    // Với mọi route SPA khác của React Router -> trả về index.html
    const indexPath = path.join(dashboardDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      const html = await fs.promises.readFile(indexPath, 'utf-8');
      return reply.type('text/html').send(html);
    }

    return reply.status(404).send('Not Found');
  });

  logger.info({ path: dashboardDistPath }, 'Registered Static SPA file serving');
}
