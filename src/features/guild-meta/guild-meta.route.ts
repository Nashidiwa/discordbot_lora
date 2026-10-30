import { ChannelType } from 'discord.js';
import type { FastifyPluginAsync } from 'fastify';
import { logger } from '../../core/logger.js';
import { requireAuth, requirePermit } from '../../core/server/guards/index.js';
import type { BotRoute, RouteContext } from '../../core/types/index.js';
import { PermitFlag } from '../../shared/permit/permit.constants.js';

interface UsersLookupBody {
  userIds?: string[];
}

export const route: BotRoute = {
  prefix: '/api',
  register: async (fastify, { client }: RouteContext) => {
    // 1. Lấy danh sách Channels trong Guild (Text, Announcement, Voice, Stage) có phân nhóm và đúng thứ tự
    fastify.get(
      '/guilds/:guildId/channels',
      { preHandler: [requirePermit(client, PermitFlag.VIEW_DASHBOARD)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Không tìm thấy server trong hệ thống của bot.',
          });
        }

        // Lấy danh mục Category để hiển thị group
        const categories = new Map<string, { id: string; name: string; position: number }>();
        for (const ch of guild.channels.cache.values()) {
          if (ch.type === ChannelType.GuildCategory) {
            const rawPos = 'rawPosition' in ch ? (ch.rawPosition as number) : 0;
            categories.set(ch.id, {
              id: ch.id,
              name: ch.name,
              position: rawPos,
            });
          }
        }

        const validTypes = new Set([
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
          ChannelType.GuildVoice,
          ChannelType.GuildStageVoice,
        ]);

        const channels = Array.from(guild.channels.cache.values())
          .filter((ch) => validTypes.has(ch.type))
          .map((ch) => {
            let typeString: 'TEXT' | 'ANNOUNCEMENT' | 'VOICE' | 'STAGE' = 'TEXT';
            if (ch.type === ChannelType.GuildAnnouncement) typeString = 'ANNOUNCEMENT';
            else if (ch.type === ChannelType.GuildVoice) typeString = 'VOICE';
            else if (ch.type === ChannelType.GuildStageVoice) typeString = 'STAGE';

            const parentId = 'parentId' in ch ? (ch.parentId as string | null) : null;
            const parent = parentId ? categories.get(parentId) : undefined;
            const position = 'rawPosition' in ch ? (ch.rawPosition as number) : 0;

            return {
              id: ch.id,
              name: ch.name,
              type: typeString,
              position,
              parentId,
              parentName: parent?.name ?? null,
              parentPosition: parent?.position ?? -1,
            };
          })
          .sort((a, b) => {
            // Sắp xếp theo Category Position, sau đó đến Channel Position
            if (a.parentPosition !== b.parentPosition) {
              return a.parentPosition - b.parentPosition;
            }
            return a.position - b.position;
          });

        return reply.send({ channels });
      },
    );

    // 2. Lấy danh sách Roles trong Guild theo đúng thứ tự Discord Hierarchy (Role cao nhất xếp trên cùng)
    fastify.get(
      '/guilds/:guildId/roles',
      { preHandler: [requirePermit(client, PermitFlag.VIEW_DASHBOARD)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Không tìm thấy server trong hệ thống của bot.',
          });
        }

        const roles = Array.from(guild.roles.cache.values())
          .filter((role) => role.id !== guild.id) // Loại bỏ @everyone khỏi danh sách lựa chọn
          .map((role) => ({
            id: role.id,
            name: role.name,
            color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : null,
            position: role.position,
            isManaged: role.managed,
          }))
          .sort((a, b) => b.position - a.position); // Position giảm dần: Role cao nhất trên cùng

        return reply.send({ roles });
      },
    );

    // 3. Xác thực & Tra cứu thông tin User ID từ Discord
    fastify.get(
      '/users/:userId',
      { preHandler: [requireAuth] },
      async (request, reply) => {
        const { userId } = request.params as { userId: string };

        if (!userId || !/^\d{17,20}$/.test(userId)) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Định dạng Discord User ID không hợp lệ (phải gồm 17-20 chữ số).',
          });
        }

        try {
          const user =
            client.users.cache.get(userId) ??
            (await client.users.fetch(userId));

          return reply.send({
            user: {
              id: user.id,
              username: user.username,
              globalName: user.globalName ?? user.username,
              avatar: user.displayAvatarURL({ size: 64 }),
              isBot: user.bot,
            },
          });
        } catch {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: `Không tìm thấy người dùng Discord có ID: ${userId}. Vui lòng kiểm tra lại.`,
          });
        }
      },
    );

    // 4. Batch Lookup danh sách User IDs (tối đa 50 users/lần)
    fastify.post(
      '/users/lookup',
      { preHandler: [requireAuth] },
      async (request, reply) => {
        const body = request.body as UsersLookupBody | undefined;
        const SNOWFLAKE_REGEX = /^\d{17,20}$/;
        const userIds = Array.isArray(body?.userIds)
          ? body.userIds
              .filter((id): id is string => typeof id === 'string' && SNOWFLAKE_REGEX.test(id))
              .slice(0, 50)
          : [];

        const usersRecord: Record<
          string,
          {
            id: string;
            username: string;
            globalName: string;
            avatar: string;
          }
        > = {};

        const missingIds: string[] = [];

        // 1. Kiểm tra trong RAM cache trước
        for (const id of userIds) {
          const cached = client.users.cache.get(id);
          if (cached) {
            usersRecord[id] = {
              id: cached.id,
              username: cached.username,
              globalName: cached.globalName ?? cached.username,
              avatar: cached.displayAvatarURL({ size: 64 }),
            };
          } else {
            missingIds.push(id);
          }
        }

        // 2. Fetch song song các users chưa có trong cache
        if (missingIds.length > 0) {
          const fetchPromises = missingIds.map(async (id) => {
            try {
              const fetched = await client.users.fetch(id);
              usersRecord[id] = {
                id: fetched.id,
                username: fetched.username,
                globalName: fetched.globalName ?? fetched.username,
                avatar: fetched.displayAvatarURL({ size: 64 }),
              };
            } catch {
              // Bỏ qua nếu user không tồn tại hoặc bị xóa
            }
          });

          await Promise.allSettled(fetchPromises);
        }

        return reply.send({ users: usersRecord });
      },
    );
  },
};

export default route;
