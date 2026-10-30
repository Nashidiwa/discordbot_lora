import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';
import { getSecretKey } from '../auth/session.util.js';

export async function registerCookiePlugin(
  server: FastifyInstance,
): Promise<void> {
  await server.register(cookie, {
    secret: getSecretKey('COOKIE_SECRET'),
  });
}
