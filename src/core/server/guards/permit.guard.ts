import type { FastifyReply, FastifyRequest } from 'fastify';
import { ALL_PERMIT_FLAGS } from '../../../shared/permit/permit.constants.js';
import { PermitService } from '../../../shared/permit/permit.service.js';
import { config } from '../../config.js';
import type { ExtendedClient } from '../../client.js';
import { extractAuthContext } from './auth.guard.js';

/**
 * PreHandler Guard: Bắt buộc có quyền Permit cụ thể trên Guild
 */
export function requirePermit(client: ExtendedClient, requiredFlag: number) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const auth = extractAuthContext(request);
    if (!auth) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập qua Discord.',
      });
    }
    request.auth = auth;

    const guildId =
      (request.params as { guildId?: string })?.guildId ||
      (request.query as { guildId?: string })?.guildId;

    if (!guildId) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Thiếu định danh guildId trong yêu cầu.',
      });
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Bot không tham gia hoặc không tìm thấy server này.',
      });
    }

    // 1. Bot Owner hoặc Master API Key tự động có toàn quyền trên mọi Guild của bot
    if (auth.isMasterKey || auth.isBotOwner) {
      request.permit = {
        userId: auth.userId,
        guildId,
        tier: 'BOT_OWNER',
        effectivePermissions: ALL_PERMIT_FLAGS,
        isBotOwner: true,
        isServerOwner: guild.ownerId === auth.userId,
        isCoOwner: false,
        isTrustedAdmin: false,
        hasPermission: () => true,
      };
      return;
    }

    // 2. Server Owner luôn có toàn quyền tuyệt đối trên server của họ
    if (guild.ownerId === auth.userId) {
      request.permit = {
        userId: auth.userId,
        guildId,
        tier: 'SERVER_OWNER',
        effectivePermissions: ALL_PERMIT_FLAGS,
        isBotOwner: false,
        isServerOwner: true,
        isCoOwner: false,
        isTrustedAdmin: false,
        hasPermission: () => true,
      };
      return;
    }

    // 3. Tra cứu Member và danh sách Roles trong Guild
    let memberRoleIds: string[] = [];
    try {
      const member =
        guild.members.cache.get(auth.userId) ??
        (await guild.members.fetch(auth.userId).catch(() => null));

      if (!member) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Bạn không phải là thành viên của server này.',
        });
      }
      memberRoleIds = Array.from(member.roles.cache.keys());
    } catch {
      // Thành viên không có trong Guild hoặc lỗi kết nối
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Bạn không phải là thành viên của server này.',
      });
    }

    const resolved = await PermitService.resolveMemberPermissions({
      guildId,
      userId: auth.userId,
      memberRoleIds,
      serverOwnerId: guild.ownerId,
      botOwnerId: config.BOT_OWNER_ID,
    });

    if (!resolved.hasPermission(requiredFlag)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Bạn không có quyền hạn cần thiết để thực hiện tác vụ này.',
      });
    }

    request.permit = resolved;
  };
}
