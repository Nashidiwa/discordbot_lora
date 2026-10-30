import type { BotRoute, RouteContext } from '../../types/index.js';
import { requireBotOwner } from '../guards/auth.guard.js';

export const route: BotRoute = {
  prefix: '',
  register: async (fastify, { client, db }: RouteContext) => {
    // 1. Health Probe
    fastify.get('/healthz', async (_request, reply) => {
      return reply.status(200).send({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    // 2. Bot System Overview (Bot Owner only)
    fastify.get(
      '/api/bot/overview',
      { preHandler: [requireBotOwner] },
      async (_request, reply) => {
        const memory = process.memoryUsage();
        const totalGuilds = client.guilds.cache.size;
        const totalMembers = client.guilds.cache.reduce(
          (acc, g) => acc + g.memberCount,
          0,
        );

        const voiceConfigsCount = await db.voiceKeeperConfig.count({
          where: { isEnabled: true },
        });

        const activeBoosterPerks = await db.customRolePerk.count({
          where: { status: 'ACTIVE' },
        });

        const totalDonators = await db.donatorAccount.count();

        return reply.send({
          system: {
            uptime: process.uptime(),
            nodeVersion: process.version,
            ping: client.ws.ping,
            memory: {
              rssMb: Math.round(memory.rss / 1024 / 1024),
              heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
              heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
            },
          },
          stats: {
            totalGuilds,
            totalMembers,
            activeVoiceKeeperConfigs: voiceConfigsCount,
            activeBoosterPerks,
            totalDonators,
          },
        });
      },
    );
  },
};

export default route;
