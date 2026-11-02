import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../core/errors.js';
import { logger } from '../../core/logger.js';
import { requirePermit } from '../../core/server/guards/index.js';
import type { BotRoute, RouteContext } from '../../core/types/index.js';
import { PermitFlag } from '../../shared/permit/permit.constants.js';
import {
  LandmineLimits,
  LeaderboardSortType,
  ScopeType,
} from './landmine.constants.js';
import { landmineService } from './services/landmine.service.js';

const UpdateGuildConfigSchema = z.object({
  forcedLocale: z.enum(['auto', 'vi', 'en']),
});

const CreateModuleSchema = z.object({
  ratePercent: z.number().min(0.01).max(100),
  durationSeconds: z.number().int().min(LandmineLimits.MIN_PUNISHMENT_SECONDS).max(LandmineLimits.MAX_PUNISHMENT_SECONDS),
  note: z.string().trim().max(255).optional(),
});

const EditModuleSchema = z.object({
  ratePercent: z.number().min(0.01).max(100).optional(),
  durationSeconds: z.number().int().min(LandmineLimits.MIN_PUNISHMENT_SECONDS).max(LandmineLimits.MAX_PUNISHMENT_SECONDS).optional(),
  note: z.string().trim().max(255).nullable().optional(),
  channelScopeType: z.enum([ScopeType.ALL, ScopeType.WHITELIST, ScopeType.BLACKLIST]).optional(),
  channelIds: z.array(z.string()).optional(),
  roleScopeType: z.enum([ScopeType.ALL, ScopeType.WHITELIST, ScopeType.BLACKLIST]).optional(),
  roleIds: z.array(z.string()).optional(),
  includeInServerLeaderboard: z.boolean().optional(),
  autoDeleteNotification: z.boolean().optional(),
  successMessage: z.string().trim().max(500).nullable().optional(),
  failedMessage: z.string().trim().max(500).nullable().optional(),
});

const ToggleModuleSchema = z.object({
  isEnabled: z.boolean(),
});

const LeaderboardQuerySchema = z.object({
  module: z.string().optional().default('server'),
  sort: z.enum([LeaderboardSortType.COUNT, LeaderboardSortType.DURATION]).optional().default(LeaderboardSortType.COUNT),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const ResetStatsSchema = z.object({
  moduleKey: z.string().trim().default('all'),
});

function handleRouteError(reply: FastifyReply, error: unknown) {
  if (error instanceof z.ZodError) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
    });
  }
  if (error instanceof AppError) {
    return reply.status(400).send({
      statusCode: 400,
      error: error.code || 'Bad Request',
      message: error.message,
    });
  }
  logger.error({ error }, 'Unhandled error in landmine route');
  return reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: error instanceof Error ? error.message : 'Unknown server error',
  });
}

export const route: BotRoute = {
  prefix: '/api/guilds/:guildId/landmine',
  register: async (fastify, { client, db }: RouteContext) => {
    // 1. Lấy toàn bộ cấu hình Landmine & 10 Modules của Guild
    fastify.get(
      '/config',
      { preHandler: [requirePermit(client, PermitFlag.VIEW_DASHBOARD)] },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { guildId } = request.params as { guildId: string };
          await landmineService.ensureDefaultModules(guildId);

          const [guildConfig, modules] = await Promise.all([
            db.landmineGuildConfig.findUnique({ where: { guildId } }),
            landmineService.getModules(guildId),
          ]);

          const moduleDTOs = modules.map((m) => ({
            id: m.id,
            guildId: m.guildId,
            moduleKey: m.moduleKey,
            isDefault: m.isDefault,
            isEnabled: m.isEnabled,
            note: m.note,
            algorithmType: m.algorithmType,
            staticRate: m.staticRate,
            ratePercent: Number((m.staticRate * 100).toFixed(4)),
            punishmentDurationSeconds: m.punishmentDurationSeconds,
            channelScopeType: m.channelScopeType,
            channelIds: landmineService.parseJsonArray(m.channelIds),
            roleScopeType: m.roleScopeType,
            roleIds: landmineService.parseJsonArray(m.roleIds),
            includeInServerLeaderboard: m.includeInServerLeaderboard,
            autoDeleteNotification: m.autoDeleteNotification,
            successMessage: m.successMessage,
            failedMessage: m.failedMessage,
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
          }));

          return reply.send({
            config: {
              guildId,
              forcedLocale: guildConfig?.forcedLocale ?? 'auto',
            },
            modules: moduleDTOs,
          });
        } catch (error) {
          return handleRouteError(reply, error);
        }
      },
    );

    // 2. Cập nhật cấu hình chung của Guild (forcedLocale)
    fastify.put(
      '/config',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_SETTINGS)] },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { guildId } = request.params as { guildId: string };
          const body = UpdateGuildConfigSchema.parse(request.body);

          await landmineService.setGuildLocale(guildId, body.forcedLocale);
          return reply.send({
            success: true,
            forcedLocale: body.forcedLocale,
          });
        } catch (error) {
          return handleRouteError(reply, error);
        }
      },
    );

    // 3. Tạo Custom Module mới vào slot trống (M3..M10)
    fastify.post(
      '/modules',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_SETTINGS)] },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { guildId } = request.params as { guildId: string };
          const body = CreateModuleSchema.parse(request.body);

          const moduleKey = await landmineService.createCustomModule(guildId, body);
          return reply.send({
            success: true,
            moduleKey,
          });
        } catch (error) {
          return handleRouteError(reply, error);
        }
      },
    );

    // 4. Chỉnh sửa cấu hình module
    fastify.put(
      '/modules/:moduleKey',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_SETTINGS)] },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { guildId, moduleKey } = request.params as {
            guildId: string;
            moduleKey: string;
          };
          const body = EditModuleSchema.parse(request.body);

          // Cập nhật Channel Scope nếu có
          if (body.channelScopeType !== undefined || body.channelIds !== undefined) {
            const current = await db.landmineModule.findUnique({
              where: { guildId_moduleKey: { guildId, moduleKey } },
            });
            const mode = body.channelScopeType ?? (current?.channelScopeType as ScopeType) ?? ScopeType.ALL;
            await landmineService.setChannels(guildId, moduleKey, mode, body.channelIds);
          }

          // Cập nhật Role Scope nếu có
          if (body.roleScopeType !== undefined || body.roleIds !== undefined) {
            const current = await db.landmineModule.findUnique({
              where: { guildId_moduleKey: { guildId, moduleKey } },
            });
            const mode = body.roleScopeType ?? (current?.roleScopeType as ScopeType) ?? ScopeType.ALL;
            await landmineService.setRoles(guildId, moduleKey, mode, body.roleIds);
          }

          const updatedName = await landmineService.editModule(guildId, moduleKey, {
            ratePercent: body.ratePercent,
            durationSeconds: body.durationSeconds,
            note: body.note,
            channelScopeType: body.channelScopeType,
            roleScopeType: body.roleScopeType,
            includeInServerLeaderboard: body.includeInServerLeaderboard,
            autoDeleteNotification: body.autoDeleteNotification,
            successMessage: body.successMessage,
            failedMessage: body.failedMessage,
          });

          return reply.send({
            success: true,
            moduleKey: updatedName,
          });
        } catch (error) {
          return handleRouteError(reply, error);
        }
      },
    );

    // 5. Bật / Tắt module
    fastify.post(
      '/modules/:moduleKey/toggle',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_SETTINGS)] },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { guildId, moduleKey } = request.params as {
            guildId: string;
            moduleKey: string;
          };
          const body = ToggleModuleSchema.parse(request.body);

          const moduleName = await landmineService.toggleModule(
            guildId,
            moduleKey,
            body.isEnabled,
          );

          return reply.send({
            success: true,
            moduleName,
            isEnabled: body.isEnabled,
          });
        } catch (error) {
          return handleRouteError(reply, error);
        }
      },
    );

    // 6. Xóa Custom Module (Chặn M1, M2)
    fastify.delete(
      '/modules/:moduleKey',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_SETTINGS)] },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { guildId, moduleKey } = request.params as {
            guildId: string;
            moduleKey: string;
          };

          const moduleName = await landmineService.deleteCustomModule(
            guildId,
            moduleKey,
          );

          return reply.send({
            success: true,
            moduleName,
          });
        } catch (error) {
          return handleRouteError(reply, error);
        }
      },
    );

    // 7. Lấy Bảng Xếp Hạng (Leaderboard)
    fastify.get(
      '/leaderboard',
      { preHandler: [requirePermit(client, PermitFlag.VIEW_DASHBOARD)] },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { guildId } = request.params as { guildId: string };
          const query = LeaderboardQuerySchema.parse(request.query);

          const result = await landmineService.getLeaderboard(
            guildId,
            query.module,
            query.sort,
            query.limit,
          );

          return reply.send({
            scope: result.scope,
            sortBy: result.sortBy,
            entries: result.entries,
          });
        } catch (error) {
          return handleRouteError(reply, error);
        }
      },
    );

    // 8. Đặt lại số liệu BXH (Reset stats)
    fastify.post(
      '/reset',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_SETTINGS)] },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { guildId } = request.params as { guildId: string };
          const body = ResetStatsSchema.parse(request.body);

          const target = await landmineService.resetStats(
            guildId,
            body.moduleKey,
          );

          return reply.send({
            success: true,
            target,
          });
        } catch (error) {
          return handleRouteError(reply, error);
        }
      },
    );
  },
};
