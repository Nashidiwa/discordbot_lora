import { PermitFlag } from '../../../shared/permit/permit.constants.js';
import type { BotRoute, RouteContext } from '../../types/index.js';
import { requireBotOwner } from '../guards/auth.guard.js';
import { requirePermit } from '../guards/permit.guard.js';
import { SSEManager } from '../sse/sse-manager.js';

export const route: BotRoute = {
  prefix: '/api/sse',
  register: async (fastify, { client }: RouteContext) => {
    // 1. SSE Stream dành riêng cho Guild (trạng thái Voice, Perks, Permits)
    fastify.get(
      '/guilds/:guildId',
      { preHandler: [requirePermit(client, PermitFlag.VIEW_DASHBOARD)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        SSEManager.registerGuildClient(guildId, request, reply);
      },
    );

    // 2. SSE Stream Hệ thống dành cho Bot Owner (Push RAM, CPU, Ping mỗi 3 giây)
    fastify.get(
      '/system',
      { preHandler: [requireBotOwner] },
      async (request, reply) => {
        SSEManager.registerSystemMetricsClient(request, reply, () => {
          const memory = process.memoryUsage();
          return {
            uptime: process.uptime(),
            ping: client.ws.ping,
            memory: {
              rssMb: Math.round(memory.rss / 1024 / 1024),
              heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
              heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
            },
          };
        });
      },
    );
  },
};

export default route;
