import { ChannelType } from 'discord.js';
import type { FastifyPluginAsync } from 'fastify';
import { eventBus } from '../../core/bus.js';
import type { BotRoute, RouteContext } from '../../core/types/index.js';
import { PermitFlag } from '../../shared/permit/permit.constants.js';
import { requirePermit } from '../../core/server/guards/index.js';
import { voiceKeeperService } from './services/voice-keeper.service.js';

export const route: BotRoute = {
  prefix: '/api/guilds/:guildId',
  register: async (fastify, { client }: RouteContext) => {
    // 1. Lấy trạng thái Voice Keeper của Guild
    fastify.get(
      '/voice-keeper',
      { preHandler: [requirePermit(client, PermitFlag.VIEW_DASHBOARD)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Không tìm thấy server trong cache.',
          });
        }

        const status = await voiceKeeperService.getStatus(guild);
        return reply.send({ status });
      },
    );

    // 2. Lấy danh sách kênh thoại (Voice & Stage) có trong Guild
    fastify.get(
      '/voice-channels',
      { preHandler: [requirePermit(client, PermitFlag.VIEW_DASHBOARD)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Không tìm thấy server.',
          });
        }

        const channels = guild.channels.cache
          .filter(
            (ch) =>
              ch.type === ChannelType.GuildVoice ||
              ch.type === ChannelType.GuildStageVoice,
          )
          .map((ch) => ({
            id: ch.id,
            name: ch.name,
            type: ch.type === ChannelType.GuildVoice ? 'VOICE' : 'STAGE',
          }));

        return reply.send({ channels });
      },
    );

    // 3. Thiết lập / Khởi động kết nối Voice Keeper 24/7
    fastify.post(
      '/voice-keeper/set',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_VOICE_KEEPER)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Không tìm thấy server.',
          });
        }

        const body = request.body as
          | {
              channelId?: string;
              selfDeaf?: boolean;
              selfMute?: boolean;
              autoReconnect?: boolean;
            }
          | undefined;

        if (!body || !body.channelId || typeof body.channelId !== 'string') {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Thiếu hoặc sai định dạng channelId của kênh thoại.',
          });
        }

        const targetChannel = guild.channels.cache.get(body.channelId);
        if (
          !targetChannel ||
          (targetChannel.type !== ChannelType.GuildVoice &&
            targetChannel.type !== ChannelType.GuildStageVoice)
        ) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'Kênh thoại không tồn tại trong server này hoặc không phải kênh Voice/Stage hợp lệ.',
          });
        }

        const botMember = guild.members.me;
        if (
          botMember &&
          !targetChannel.permissionsFor(botMember).has(['ViewChannel', 'Connect'])
        ) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message:
              'Bot không có quyền xem hoặc kết nối (ViewChannel, Connect) tới kênh thoại này.',
          });
        }

        await voiceKeeperService.connect({
          guild,
          channelId: body.channelId,
          selfDeaf: body.selfDeaf,
          selfMute: body.selfMute,
          autoReconnect: body.autoReconnect,
          updatedBy: request.auth?.userId ?? 'DASHBOARD',
          isManual: true,
        });

        eventBus.emit('voice:status', {
          guildId,
          status: 'CONNECTING',
        });

        const status = await voiceKeeperService.getStatus(guild);
        return reply.send({ success: true, status });
      },
    );

    // 4. Buộc kết nối lại tức thì (Force Reconnect)
    fastify.post(
      '/voice-keeper/reconnect',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_VOICE_KEEPER)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Không tìm thấy server.',
          });
        }

        await voiceKeeperService.forceReconnect(
          guild,
          request.auth?.userId ?? 'DASHBOARD',
        );

        eventBus.emit('voice:status', {
          guildId,
          status: 'RECONNECTING',
        });

        const status = await voiceKeeperService.getStatus(guild);
        return reply.send({ success: true, status });
      },
    );

    // 5. Ngắt kết nối và dừng giữ kênh
    fastify.post(
      '/voice-keeper/stop',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_VOICE_KEEPER)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;

        await voiceKeeperService.disconnect(guildId);

        eventBus.emit('voice:status', {
          guildId,
          status: 'DISCONNECTED',
        });

        return reply.send({ success: true, message: 'Đã dừng Voice Keeper.' });
      },
    );
  },
};

export default route;
