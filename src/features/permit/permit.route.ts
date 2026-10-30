import { eventBus } from '../../core/bus.js';
import type { BotRoute, RouteContext } from '../../core/types/index.js';
import {
  ALL_PERMIT_FLAGS,
  PermitFlag,
  PermitService,
  PermitTargetType,
  PermitTier,
} from '../../shared/permit/index.js';
import { requirePermit } from '../../core/server/guards/index.js';

export const route: BotRoute = {
  prefix: '/api/guilds/:guildId/permits',
  register: async (fastify, { client }: RouteContext) => {
    // 1. Lấy toàn bộ tổng quan phân quyền Permit của Guild
    fastify.get(
      '',
      { preHandler: [requirePermit(client, PermitFlag.VIEW_DASHBOARD)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const guild = client.guilds.cache.get(guildId);

        const overview = await PermitService.getGuildPermitOverview(guildId);

        return reply.send({
          ownerId: guild?.ownerId ?? null,
          config: overview.config,
          coOwners: overview.coOwners,
          trustedAdmins: overview.trustedAdmins,
          customPermits: overview.customPermits,
        });
      },
    );

    // 2. Cấp phát hoặc cập nhật Permit (Ngăn chặn Privilege Escalation)
    fastify.post(
      '/assign',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_PERMITS)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const guild = client.guilds.cache.get(guildId);
        const permit = request.permit!;

        const body = request.body as
          | {
              targetType?: PermitTargetType;
              targetId?: string;
              tier?: PermitTier;
              permissions?: number;
            }
          | undefined;

        if (!body || !body.targetType || !body.targetId || !body.tier) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Thiếu thông tin targetType, targetId hoặc tier.',
          });
        }

        // Kiểm tra targetType hợp lệ
        if (
          body.targetType !== PermitTargetType.USER &&
          body.targetType !== PermitTargetType.ROLE
        ) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'targetType không hợp lệ (chỉ chấp nhận USER hoặc ROLE).',
          });
        }

        // Kiểm tra tier hợp lệ
        if (!Object.values(PermitTier).includes(body.tier)) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'tier phân quyền không hợp lệ.',
          });
        }

        // 1. Co-Owner: Chỉ Server Owner hoặc Bot Owner mới có quyền bổ nhiệm
        if (body.tier === PermitTier.CO_OWNER) {
          if (!permit.isServerOwner && !permit.isBotOwner) {
            return reply.status(403).send({
              statusCode: 403,
              error: 'Forbidden',
              message: 'Chỉ Server Owner hoặc Bot Owner mới có quyền bổ nhiệm Co-Owner.',
            });
          }

          if (body.targetType !== PermitTargetType.USER) {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Co-Owner chỉ có thể gán cho cá nhân User, không áp dụng cho Role.',
            });
          }
        }

        // 2. Trusted Admin: Chỉ Server Owner, Co-Owner hoặc Bot Owner mới có quyền bổ nhiệm
        if (body.tier === PermitTier.TRUSTED_ADMIN) {
          if (!permit.isServerOwner && !permit.isBotOwner && !permit.isCoOwner) {
            return reply.status(403).send({
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Chỉ Server Owner, Co-Owner hoặc Bot Owner mới có quyền bổ nhiệm Trusted Admin.',
            });
          }
        }

        // 3. Kiểm tra mục tiêu nếu là User hoặc Role
        if (body.targetType === PermitTargetType.USER) {
          if (guild && body.targetId === guild.ownerId) {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Server Owner đã có toàn quyền, không thể gán permit.',
            });
          }

          const targetUser = await client.users.fetch(body.targetId).catch(() => null);
          if (targetUser?.bot) {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Không thể gán quyền Permit cho tài khoản bot.',
            });
          }
        } else if (body.targetType === PermitTargetType.ROLE) {
          if (guild && !guild.roles.cache.has(body.targetId)) {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Vai trò không tồn tại trong máy chủ này.',
            });
          }
        }

        // 4. Kiểm tra permissions bitfield nếu có truyền
        if (
          body.permissions !== undefined &&
          (!Number.isInteger(body.permissions) || body.permissions < 0)
        ) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Permissions phải là số nguyên bitfield không âm.',
          });
        }

        // 5. Chống Privilege Escalation: Người cấp quyền không được cấp cờ mà mình không sở hữu
        if (
          !permit.isServerOwner &&
          !permit.isBotOwner &&
          body.permissions !== undefined &&
          (permit.effectivePermissions & body.permissions) !== body.permissions
        ) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Bạn không thể cấp các cờ quyền mà chính bạn không sở hữu.',
          });
        }

        const updatedPermit = await PermitService.assignPermit({
          guildId,
          targetType: body.targetType,
          targetId: body.targetId,
          tier: body.tier,
          permissions: body.permissions,
          createdBy: request.auth?.userId ?? 'DASHBOARD',
        });

        eventBus.emit('permit:changed', { guildId });

        return reply.send({ success: true, permit: updatedPermit });
      },
    );

    // 3. Thu hồi Permit (Bảo vệ Co-Owner & Trusted Admin khỏi bị thu hồi trái phép)
    fastify.post(
      '/revoke',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_PERMITS)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const permit = request.permit!;

        const body = request.body as
          | {
              targetType?: PermitTargetType;
              targetId?: string;
            }
          | undefined;

        if (!body || !body.targetType || !body.targetId) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Thiếu thông tin targetType hoặc targetId.',
          });
        }

        const assignments = await PermitService.getGuildAssignments(guildId);
        const existing = assignments.find(
          (a) => a.targetType === body.targetType && a.targetId === body.targetId,
        );

        if (!existing) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Không tìm thấy phân quyền Permit của đối tượng này.',
          });
        }

        // Co-Owner chỉ có thể bị thu hồi bởi Server Owner hoặc Bot Owner
        if (
          existing.tier === PermitTier.CO_OWNER &&
          !permit.isServerOwner &&
          !permit.isBotOwner
        ) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Chỉ Server Owner hoặc Bot Owner mới có quyền thu hồi Co-Owner.',
          });
        }

        // Trusted Admin chỉ có thể bị thu hồi bởi Server Owner, Co-Owner hoặc Bot Owner
        if (
          existing.tier === PermitTier.TRUSTED_ADMIN &&
          !permit.isServerOwner &&
          !permit.isBotOwner &&
          !permit.isCoOwner
        ) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message:
              'Chỉ Server Owner, Co-Owner hoặc Bot Owner mới có quyền thu hồi Trusted Admin.',
          });
        }

        const success = await PermitService.revokePermit(
          guildId,
          body.targetType,
          body.targetId,
        );

        eventBus.emit('permit:changed', { guildId });

        return reply.send({ success });
      },
    );

    // 4. Cập nhật cấu hình Trusted Admin default flags
    fastify.put(
      '/config',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_PERMITS)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const permit = request.permit!;

        // Chỉ Server Owner, Co-Owner hoặc Bot Owner mới được sửa cờ quyền mặc định của Trusted Admin
        if (!permit.isServerOwner && !permit.isBotOwner && !permit.isCoOwner) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message:
              'Chỉ Server Owner hoặc Co-Owner mới có quyền cập nhật cấu hình mặc định của Trusted Admin.',
          });
        }

        const body = request.body as { flags?: number } | undefined;

        if (
          !body ||
          typeof body.flags !== 'number' ||
          !Number.isInteger(body.flags) ||
          body.flags < 0 ||
          body.flags > ALL_PERMIT_FLAGS
        ) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Flags phải là số nguyên bitfield hợp lệ.',
          });
        }

        const config = await PermitService.updateTrustedAdminFlags(
          guildId,
          body.flags,
        );

        eventBus.emit('permit:changed', { guildId });

        return reply.send({ success: true, config });
      },
    );
  },
};

export default route;
