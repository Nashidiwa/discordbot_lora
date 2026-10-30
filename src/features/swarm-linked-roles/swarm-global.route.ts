import type { FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../../core/logger.js';
import { extractAuthContext } from '../../core/server/guards/auth.guard.js';
import type { BotRoute, RouteContext } from '../../core/types/index.js';
import { SwarmMetadataService } from './services/swarm-metadata.service.js';
import { SwarmOperatorService } from './services/swarm-operator.service.js';
import { SwarmRoleNames } from './swarm.constants.js';

interface SwarmMemberUpdateBody {
  level: number;
}

interface SwarmOperatorAddBody {
  userId?: string;
}

export const route: BotRoute = {
  prefix: '/api/swarm',
  register: async (fastify, { client, db }: RouteContext) => {
    // 1. Kiểm tra trạng thái phân quyền The Swarm của phiên đăng nhập hiện tại
    fastify.get('/auth-status', async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = extractAuthContext(request);
      if (!auth) {
        return reply.send({
          authenticated: false,
          isOperator: false,
          isBotOwner: false,
          userId: null,
        });
      }

      const isBotOwner = await SwarmOperatorService.isBotOwner(client, auth.userId);
      const isOperator =
        isBotOwner || (await SwarmOperatorService.isOperator(client, auth.userId));

      return reply.send({
        authenticated: true,
        isOperator,
        isBotOwner,
        userId: auth.userId,
      });
    });

    // 2. Lấy dữ liệu tổng quan The Swarm Cấp Ứng Dụng (Global Scope)
    fastify.get('/global', async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = extractAuthContext(request);
      if (!auth) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Vui lòng đăng nhập qua Discord.',
        });
      }
      request.auth = auth;

      const isBotOwner = await SwarmOperatorService.isBotOwner(client, auth.userId);
      const isOperator =
        isBotOwner || (await SwarmOperatorService.isOperator(client, auth.userId));

      if (!isOperator) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Từ chối quyền: Bảng điều khiển The Swarm Toàn Cầu chỉ dành riêng cho Delegated Operator hoặc Bot Owner.',
        });
      }

      const [operators, allMembers, totalLinked, guildConfigsRaw] = await Promise.all([
        db.swarmOperator.findMany({
          select: { userId: true, addedBy: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        db.swarmMemberMetadata.findMany({
          orderBy: [{ swarmLevel: 'desc' }, { updatedAt: 'desc' }],
        }),
        db.swarmMemberMetadata.count({
          where: { swarmLevel: { gt: 0 } },
        }),
        db.swarmGuildConfig.findMany({
          orderBy: { updatedAt: 'desc' },
        }),
      ]);

      // Thống kê phân bổ theo từng level (1..8) toàn cầu
      const levelDistribution: Record<number, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
      };

      for (const m of allMembers) {
        if (m.swarmLevel >= 1 && m.swarmLevel <= 8) {
          levelDistribution[m.swarmLevel] =
            (levelDistribution[m.swarmLevel] || 0) + 1;
        }
      }

      const guildConfigs = guildConfigsRaw.map((cfg) => {
        const guild = client.guilds.cache.get(cfg.guildId);
        return {
          guildId: cfg.guildId,
          guildName: guild?.name ?? `Server (${cfg.guildId})`,
          notificationChannelId: cfg.notificationChannelId,
        };
      });

      return reply.send({
        stats: {
          totalLinked,
          totalOperators: operators.length,
          rolesCount: SwarmRoleNames.length,
          levelDistribution,
          configuredGuildsCount: guildConfigs.filter((g) => g.notificationChannelId).length,
        },
        operators,
        allMembers,
        guildConfigs,
        roles: SwarmRoleNames.map((name, idx) => ({
          level: idx + 1,
          name,
        })),
        isBotOwner,
      });
    });

    // 3. Gán hoặc thu hồi level Swarm cấp Ứng Dụng (Global)
    fastify.post(
      '/global/members/:userId',
      async (request: FastifyRequest, reply: FastifyReply) => {
        const auth = extractAuthContext(request);
        if (!auth) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Yêu cầu phiên đăng nhập hợp lệ.',
          });
        }
        request.auth = auth;

        const { userId } = request.params as { userId: string };
        const body = request.body as SwarmMemberUpdateBody | undefined;

        const isOperator = await SwarmOperatorService.isOperator(
          client,
          auth.userId,
        );

        if (!isOperator) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            code: 'SWARM_UNAUTHORIZED_OPERATOR',
            message:
              'Từ chối quyền: Bạn không phải là Delegated Operator hoặc Bot Owner được ủy quyền.',
          });
        }

        if (
          !body ||
          typeof body.level !== 'number' ||
          body.level < 0 ||
          body.level > 8
        ) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Cấp độ Swarm phải là số nguyên từ 0 (thu hồi) đến 8.',
          });
        }

        const targetUser = await client.users.fetch(userId).catch(() => null);

        try {
          let result: { level: number; synced: boolean };

          if (body.level === 0) {
            result = await SwarmMetadataService.removeUserLevel(
              userId,
              auth.userId,
              targetUser?.username,
            );
          } else {
            result = await SwarmMetadataService.setUserLevel(
              userId,
              body.level,
              auth.userId,
              targetUser?.username,
            );
          }

          logger.info(
            {
              userId,
              level: body.level,
              synced: result.synced,
              operatorId: auth.userId,
            },
            'Updated Swarm user level via Global API by authorized operator',
          );

          return reply.send({
            success: true,
            userId,
            level: result.level,
            synced: result.synced,
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          logger.error(
            { err, userId, level: body.level },
            'Failed to set Swarm user level globally',
          );
          return reply.status(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: errMsg,
          });
        }
      },
    );

    // 4. Ủy quyền Delegated Operator mới (Độc quyền Bot Owner)
    fastify.post(
      '/global/operators',
      async (request: FastifyRequest, reply: FastifyReply) => {
        const auth = extractAuthContext(request);
        if (!auth) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Yêu cầu phiên đăng nhập hợp lệ.',
          });
        }
        request.auth = auth;

        const isOwner = await SwarmOperatorService.isBotOwner(
          client,
          auth.userId,
        );
        if (!isOwner) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message:
              'Từ chối quyền: Chỉ Bot Owner mới có quyền ủy quyền thêm Delegated Operator.',
          });
        }

        const body = request.body as SwarmOperatorAddBody | undefined;
        const targetUserId = body?.userId?.trim();
        if (!targetUserId) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Thiếu Discord User ID của thành viên cần ủy quyền.',
          });
        }

        try {
          await SwarmOperatorService.addOperator(
            client,
            auth.userId,
            targetUserId,
          );
          return reply.send({
            success: true,
            message: `Đã ủy quyền Delegated Operator cho người dùng ${targetUserId}.`,
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: errMsg,
          });
        }
      },
    );

    // 5. Thu hồi quyền Delegated Operator (Độc quyền Bot Owner)
    fastify.delete(
      '/global/operators/:targetUserId',
      async (request: FastifyRequest, reply: FastifyReply) => {
        const auth = extractAuthContext(request);
        if (!auth) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Yêu cầu phiên đăng nhập hợp lệ.',
          });
        }
        request.auth = auth;

        const isOwner = await SwarmOperatorService.isBotOwner(
          client,
          auth.userId,
        );
        if (!isOwner) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message:
              'Từ chối quyền: Chỉ Bot Owner mới có quyền thu hồi Delegated Operator.',
          });
        }

        const { targetUserId } = request.params as { targetUserId: string };

        try {
          await SwarmOperatorService.removeOperator(
            client,
            auth.userId,
            targetUserId,
          );
          return reply.send({
            success: true,
            message: `Đã thu hồi quyền Delegated Operator của người dùng ${targetUserId}.`,
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: errMsg,
          });
        }
      },
    );
  },
};

export default route;
