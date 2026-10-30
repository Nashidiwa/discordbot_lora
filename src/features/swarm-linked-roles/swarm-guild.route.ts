import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../../core/logger.js';
import { extractAuthContext } from '../../core/server/guards/auth.guard.js';
import type { BotRoute, RouteContext } from '../../core/types/index.js';
import { PermitFlag } from '../../shared/permit/permit.constants.js';
import { PermitService } from '../../shared/permit/permit.service.js';
import { SwarmMetadataService } from './services/swarm-metadata.service.js';
import { SwarmOperatorService } from './services/swarm-operator.service.js';
import { SwarmRoleNames } from './swarm.constants.js';

interface SwarmConfigBody {
  notificationChannelId?: string | null;
}

interface SwarmMemberUpdateBody {
  level: number;
}

export const route: BotRoute = {
  prefix: '/api/guilds/:guildId/swarm',
  register: async (fastify, { client, db }: RouteContext) => {
    // 1. Lấy dữ liệu The Swarm của Guild và phân quyền thẩm quyền
    fastify.get('', async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = extractAuthContext(request);
      if (!auth) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Vui lòng đăng nhập qua Discord.',
        });
      }
      request.auth = auth;

      const guildId = (request.params as { guildId: string }).guildId;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Không tìm thấy server trong hệ thống của bot.',
        });
      }

      const requesterId = auth.userId;
      const isBotOwner = await SwarmOperatorService.isBotOwner(client, requesterId);
      const isOperator =
        isBotOwner || (await SwarmOperatorService.isOperator(client, requesterId));

      // Nếu không phải Operator / Bot Owner, kiểm tra permit cấp Server
      if (!isOperator) {
        if (guild.ownerId !== requesterId) {
          const member =
            guild.members.cache.get(requesterId) ??
            (await guild.members.fetch(requesterId).catch(() => null));

          if (!member) {
            return reply.status(403).send({
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Bạn không phải là thành viên hoặc quản trị viên của server này.',
            });
          }

          const memberRoleIds = Array.from(member.roles.cache.keys());
          const resolved = await PermitService.resolveMemberPermissions({
            guildId,
            userId: requesterId,
            memberRoleIds,
            serverOwnerId: guild.ownerId,
            botOwnerId: process.env.BOT_OWNER_ID ?? '',
          });

          if (!resolved.hasPermission(PermitFlag.VIEW_DASHBOARD)) {
            return reply.status(403).send({
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Bạn không có quyền xem thông tin The Swarm trên server này.',
            });
          }
        }
      }

      // Truy vấn cấu hình của server và toàn bộ danh sách Swarm từ DB
      const [config, operators, allMetadata] = await Promise.all([
        db.swarmGuildConfig.findUnique({ where: { guildId } }),
        isOperator
          ? db.swarmOperator.findMany({
              select: { userId: true, addedBy: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
            })
          : Promise.resolve([]),
        db.swarmMemberMetadata.findMany({
          orderBy: [{ swarmLevel: 'desc' }, { updatedAt: 'desc' }],
        }),
      ]);

      // Lọc các thành viên thực sự có mặt trong server này
      const serverMembers: Array<{
        userId: string;
        swarmLevel: number;
        updatedAt: Date;
        updatedBy?: string;
        username?: string;
        avatar?: string | null;
      }> = [];

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

      let totalLinked = 0;

      for (const m of allMetadata) {
        const gm = guild.members.cache.get(m.userId);
        if (gm) {
          serverMembers.push({
            userId: m.userId,
            swarmLevel: m.swarmLevel,
            updatedAt: m.updatedAt,
            // ẨN HOÀN TOÀN updatedBy nếu caller không phải Operator / Bot Owner
            ...(isOperator ? { updatedBy: m.updatedBy } : {}),
            username: gm.user.username,
            avatar: gm.user.avatar,
          });

          if (m.swarmLevel >= 1 && m.swarmLevel <= 8) {
            levelDistribution[m.swarmLevel] =
              (levelDistribution[m.swarmLevel] || 0) + 1;
            totalLinked += 1;
          }
        }
      }

      return reply.send({
        config,
        // Chỉ gửi operators nếu là Operator / Bot Owner
        operators: isOperator ? operators : undefined,
        serverMembers,
        stats: {
          totalLinked,
          ...(isOperator ? { totalOperators: operators.length } : {}),
          rolesCount: SwarmRoleNames.length,
          levelDistribution,
        },
        roles: SwarmRoleNames.map((name, idx) => ({
          level: idx + 1,
          name,
        })),
        callerPermissions: {
          isOperator,
          isBotOwner,
          canEditConfig: isOperator, // Chỉ Operator/Owner mới có quyền đổi kênh thông báo
          canManageMembers: isOperator, // Chỉ Operator/Owner mới có quyền đổi cấp bậc
        },
      });
    });

    // 2. Cập nhật cấu hình kênh thông báo The Swarm của Guild (Chỉ Bot Owner hoặc Delegated Operator)
    fastify.put('/config', async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = extractAuthContext(request);
      if (!auth) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Vui lòng đăng nhập qua Discord.',
        });
      }
      request.auth = auth;

      const guildId = (request.params as { guildId: string }).guildId;
      const isOperator = await SwarmOperatorService.isOperator(
        client,
        auth.userId,
      );

      if (!isOperator) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Từ chối quyền: Chỉ Bot Owner hoặc Delegated Operator mới có thẩm quyền cấu hình kênh thông báo The Swarm.',
        });
      }

      const body = request.body as SwarmConfigBody | undefined;
      const notificationChannelId = body?.notificationChannelId ?? null;

      if (notificationChannelId) {
        const channel = client.channels.cache.get(notificationChannelId);
        if (!channel || !('guildId' in channel) || channel.guildId !== guildId) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Kênh thông báo không tồn tại hoặc không thuộc máy chủ này.',
          });
        }
      }

      const config = await db.swarmGuildConfig.upsert({
        where: { guildId },
        create: {
          guildId,
          notificationChannelId,
        },
        update: {
          notificationChannelId,
        },
      });

      logger.info(
        { guildId, notificationChannelId, operatorId: auth.userId },
        'Updated Swarm Guild notification channel by authorized operator',
      );

      return reply.send({
        success: true,
        config,
      });
    });

    // 3. Gán hoặc thu hồi level Swarm trực tiếp (Yêu cầu Delegated Operator hoặc Bot Owner)
    fastify.post(
      '/members/:userId',
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

        const { guildId, userId } = request.params as {
          guildId: string;
          userId: string;
        };
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
              'Từ chối quyền: Cấp độ The Swarm có hiệu lực toàn cầu ở cấp Ứng Dụng. Bạn không phải là Delegated Operator hoặc Bot Owner được ủy quyền.',
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
              guildId,
              userId,
              level: body.level,
              synced: result.synced,
              operatorId: auth.userId,
            },
            'Updated Swarm user level via dashboard API by authorized operator',
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
            'Failed to set Swarm user level',
          );
          return reply.status(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: errMsg,
          });
        }
      },
    );
  },
};

export default route;
