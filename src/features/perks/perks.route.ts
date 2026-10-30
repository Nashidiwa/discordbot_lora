import type { FastifyPluginAsync } from 'fastify';
import type { BotRoute, RouteContext } from '../../core/types/index.js';
import { PermitFlag } from '../../shared/permit/permit.constants.js';
import { requirePermit } from '../../core/server/guards/index.js';
import { donatorPerkService } from './donator/services/donator-perk.service.js';

export const route: BotRoute = {
  prefix: '/api/guilds/:guildId/perks',
  register: async (fastify, { client, db }: RouteContext) => {
    // 1. Tổng quan Perks (Booster + Donator)
    fastify.get(
      '/overview',
      { preHandler: [requirePermit(client, PermitFlag.VIEW_DASHBOARD)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;

        const [boosterConfig, boosterRoles, donatorConfig, donatorAccounts] =
          await Promise.all([
            db.boosterPerkConfig.findUnique({ where: { guildId } }),
            db.customRolePerk.findMany({
              where: { guildId },
              orderBy: { createdAt: 'desc' },
              take: 50,
            }),
            db.donatorPerkConfig.findUnique({ where: { guildId } }),
            db.donatorAccount.findMany({
              where: { guildId },
              orderBy: { totalDonated: 'desc' },
              take: 50,
            }),
          ]);

        // Serialize BigInt safely for JSON
        const safeDonators = donatorAccounts.map((d) => ({
          ...d,
          totalDonated: d.totalDonated.toString(),
        }));

        return reply.send({
          booster: {
            config: boosterConfig,
            customRoles: boosterRoles,
          },
          donator: {
            config: donatorConfig,
            accounts: safeDonators,
          },
        });
      },
    );

    // 2. Cập nhật cấu hình Server Booster
    fastify.put(
      '/booster/config',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_PERKS)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const body = request.body as
          | {
              gracePeriodDays?: number;
              anchorRoleId?: string | null;
              notificationChannelId?: string | null;
              auditLogChannelId?: string | null;
            }
          | undefined;

        if (
          body?.gracePeriodDays !== undefined &&
          (!Number.isInteger(body.gracePeriodDays) ||
            body.gracePeriodDays < 0 ||
            body.gracePeriodDays > 365)
        ) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'gracePeriodDays phải là số nguyên từ 0 đến 365 ngày.',
          });
        }

        const guild = client.guilds.cache.get(guildId);
        if (body?.notificationChannelId) {
          const ch = client.channels.cache.get(body.notificationChannelId);
          if (!ch || !('guildId' in ch) || ch.guildId !== guildId) {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Kênh thông báo không tồn tại hoặc không thuộc máy chủ này.',
            });
          }
        }
        if (body?.auditLogChannelId) {
          const ch = client.channels.cache.get(body.auditLogChannelId);
          if (!ch || !('guildId' in ch) || ch.guildId !== guildId) {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Kênh audit log không tồn tại hoặc không thuộc máy chủ này.',
            });
          }
        }
        if (body?.anchorRoleId && guild && !guild.roles.cache.has(body.anchorRoleId)) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Vai trò anchorRoleId không tồn tại trong máy chủ này.',
          });
        }

        const updated = await db.boosterPerkConfig.upsert({
          where: { guildId },
          update: {
            ...(body?.gracePeriodDays !== undefined && {
              gracePeriodDays: body.gracePeriodDays,
            }),
            ...(body?.anchorRoleId !== undefined && {
              anchorRoleId: body.anchorRoleId,
            }),
            ...(body?.notificationChannelId !== undefined && {
              notificationChannelId: body.notificationChannelId,
            }),
            ...(body?.auditLogChannelId !== undefined && {
              auditLogChannelId: body.auditLogChannelId,
            }),
          },
          create: {
            guildId,
            gracePeriodDays: body?.gracePeriodDays ?? 21,
            anchorRoleId: body?.anchorRoleId ?? null,
            notificationChannelId: body?.notificationChannelId ?? null,
            auditLogChannelId: body?.auditLogChannelId ?? null,
          },
        });

        return reply.send({ success: true, config: updated });
      },
    );

    // 3. Cập nhật cấu hình Donator
    fastify.put(
      '/donator/config',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_PERKS)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const body = request.body as
          | {
              isEnabled?: boolean;
              donatorRoleId?: string | null;
              notificationChannelId?: string | null;
              baseBenchmarkVnd?: number;
              baseBenchmarkDays?: number;
              weeklyMinVnd?: number;
              idleBurnRate?: number;
            }
          | undefined;

        if (body?.baseBenchmarkVnd !== undefined && (typeof body.baseBenchmarkVnd !== 'number' || body.baseBenchmarkVnd <= 0)) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'baseBenchmarkVnd phải là số dương lớn hơn 0.',
          });
        }

        if (body?.baseBenchmarkDays !== undefined && (!Number.isInteger(body.baseBenchmarkDays) || body.baseBenchmarkDays <= 0 || body.baseBenchmarkDays > 365)) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'baseBenchmarkDays phải là số nguyên từ 1 đến 365 ngày.',
          });
        }

        if (body?.weeklyMinVnd !== undefined && (typeof body.weeklyMinVnd !== 'number' || body.weeklyMinVnd < 0)) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'weeklyMinVnd phải là số không âm.',
          });
        }

        if (body?.idleBurnRate !== undefined && (typeof body.idleBurnRate !== 'number' || body.idleBurnRate < 0 || body.idleBurnRate > 1)) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'idleBurnRate phải là số thực từ 0.0 đến 1.0.',
          });
        }

        const donatorGuild = client.guilds.cache.get(guildId);
        if (body?.notificationChannelId) {
          const ch = client.channels.cache.get(body.notificationChannelId);
          if (!ch || !('guildId' in ch) || ch.guildId !== guildId) {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Kênh thông báo không tồn tại hoặc không thuộc máy chủ này.',
            });
          }
        }
        if (body?.donatorRoleId && donatorGuild && !donatorGuild.roles.cache.has(body.donatorRoleId)) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Vai trò donatorRoleId không tồn tại trong máy chủ này.',
          });
        }

        const updated = await db.donatorPerkConfig.upsert({
          where: { guildId },
          update: {
            ...(body?.isEnabled !== undefined && { isEnabled: body.isEnabled }),
            ...(body?.donatorRoleId !== undefined && {
              donatorRoleId: body.donatorRoleId,
            }),
            ...(body?.notificationChannelId !== undefined && {
              notificationChannelId: body.notificationChannelId,
            }),
            ...(body?.baseBenchmarkVnd !== undefined && {
              baseBenchmarkVnd: body.baseBenchmarkVnd,
            }),
            ...(body?.baseBenchmarkDays !== undefined && {
              baseBenchmarkDays: body.baseBenchmarkDays,
            }),
            ...(body?.weeklyMinVnd !== undefined && {
              weeklyMinVnd: body.weeklyMinVnd,
            }),
            ...(body?.idleBurnRate !== undefined && {
              idleBurnRate: body.idleBurnRate,
            }),
          },
          create: {
            guildId,
            isEnabled: body?.isEnabled ?? false,
            donatorRoleId: body?.donatorRoleId ?? null,
            notificationChannelId: body?.notificationChannelId ?? null,
            baseBenchmarkVnd: body?.baseBenchmarkVnd ?? 200000,
            baseBenchmarkDays: body?.baseBenchmarkDays ?? 30,
            weeklyMinVnd: body?.weeklyMinVnd ?? 50000,
            idleBurnRate: body?.idleBurnRate ?? 0.2,
          },
        });

        return reply.send({ success: true, config: updated });
      },
    );

    // 4. Nạp tiền / giờ vào Quỹ thời gian Donator (Top-up)
    fastify.post(
      '/donator/topup',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_PERKS)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const body = request.body as
          | {
              userId?: string;
              amountVnd?: number;
              note?: string;
            }
          | undefined;

        if (
          !body ||
          !body.userId ||
          typeof body.userId !== 'string' ||
          typeof body.amountVnd !== 'number' ||
          !Number.isInteger(body.amountVnd) ||
          body.amountVnd <= 0 ||
          body.amountVnd > 1_000_000_000_000
        ) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'userId hoặc số tiền amountVnd không hợp lệ (amountVnd phải là số nguyên dương).',
          });
        }

        const targetUserId = body.userId;
        const targetAmountVnd = body.amountVnd;
        const topupNote = body.note ?? 'Top-up qua Web Dashboard';

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Không tìm thấy máy chủ trong hệ thống của bot.',
          });
        }

        const result = await donatorPerkService.addDonation({
          guildId,
          userId: targetUserId,
          amountVnd: targetAmountVnd,
          note: topupNote,
          createdBy: request.auth?.userId ?? 'DASHBOARD',
          guild,
        });

        return reply.send({
          success: true,
          account: {
            ...result.account,
            totalDonated: result.account.totalDonated.toString(),
          },
          calculation: result.calculation,
        });
      },
    );

    // 5. Xem lịch sử giao dịch Donator (Hỗ trợ truy xuất tối đa 500 bản ghi cho báo cáo CSV)
    fastify.get(
      '/donator/transactions',
      { preHandler: [requirePermit(client, PermitFlag.VIEW_DASHBOARD)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const queryLimit = Number((request.query as { limit?: string })?.limit);
        const take = Number.isInteger(queryLimit) && queryLimit > 0
          ? Math.min(queryLimit, 500)
          : 100;

        const transactions = await db.donatorTransaction.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
          take,
        });

        return reply.send({ transactions });
      },
    );
  },
};

export default route;
