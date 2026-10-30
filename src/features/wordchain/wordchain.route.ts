import type { FastifyPluginAsync } from 'fastify';
import { logger } from '../../core/logger.js';
import { requirePermit } from '../../core/server/guards/index.js';
import type { BotRoute, RouteContext } from '../../core/types/index.js';
import { PermitFlag } from '../../shared/permit/permit.constants.js';
import { wordChainGameService } from './services/wordchain-game.service.js';
import { GameMode } from './types/wordchain.types.js';

interface WordChainConfigBody {
  normalModeChannelId?: string | null;
  hardModeChannelId?: string | null;
  reliableRoleId?: string | null;
  failedRoleId?: string | null;
  languages?: string;
}

interface WordChainResetBody {
  mode?: 'normal' | 'hard' | 'all';
}

export const route: BotRoute = {
  prefix: '/api/guilds/:guildId/wordchain',
  register: async (fastify, { client, db }: RouteContext) => {
    // 1. Lấy dữ liệu tổng quan Word Chain của Guild
    fastify.get(
      '',
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

        const [config, topKarma, topScores, usedNormal, usedHard, totalMembers] =
          await Promise.all([
            db.wordChainConfig.findUnique({ where: { guildId } }),
            db.wordChainMember.findMany({
              where: { guildId },
              orderBy: { karma: 'desc' },
              take: 10,
            }),
            db.wordChainMember.findMany({
              where: { guildId },
              orderBy: { score: 'desc' },
              take: 10,
            }),
            db.wordChainUsedWord.count({
              where: { guildId, gameMode: GameMode.NORMAL },
            }),
            db.wordChainUsedWord.count({
              where: { guildId, gameMode: GameMode.HARD },
            }),
            db.wordChainMember.count({ where: { guildId } }),
          ]);

        return reply.send({
          config: config || null,
          sessions: {
            normal: {
              currentWord: config?.currentWordNormal ?? null,
              currentCount: config?.currentCountNormal ?? 0,
              highScore: config?.highScoreNormal ?? 0,
              lastMemberId: config?.lastMemberIdNormal ?? null,
              usedWordsCount: usedNormal,
            },
            hard: {
              currentWord: config?.currentWordHard ?? null,
              currentCount: config?.currentCountHard ?? 0,
              highScore: config?.highScoreHard ?? 0,
              lastMemberId: config?.lastMemberIdHard ?? null,
              usedWordsCount: usedHard,
            },
          },
          topKarma,
          topScores,
          stats: {
            totalMembers,
            totalUsedWords: usedNormal + usedHard,
          },
        });
      },
    );

    // 2. Cập nhật cấu hình kênh, vai trò và ngôn ngữ Word Chain
    fastify.put(
      '/config',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_WORDCHAIN)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const body = request.body as WordChainConfigBody | undefined;

        // Thẩm tra xác thực phân thuộc máy chủ (Cross-Guild Injection Guard)
        const guild = client.guilds.cache.get(guildId);
        if (body?.normalModeChannelId) {
          const ch = client.channels.cache.get(body.normalModeChannelId);
          if (!ch || !('guildId' in ch) || ch.guildId !== guildId) {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Kênh Normal Mode không hợp lệ hoặc không thuộc máy chủ này.',
            });
          }
        }

        if (body?.hardModeChannelId) {
          const ch = client.channels.cache.get(body.hardModeChannelId);
          if (!ch || !('guildId' in ch) || ch.guildId !== guildId) {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Kênh Hard Mode không hợp lệ hoặc không thuộc máy chủ này.',
            });
          }
        }

        if (body?.reliableRoleId && guild && !guild.roles.cache.has(body.reliableRoleId)) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Vai trò Reliable Role không tồn tại trong máy chủ này.',
          });
        }

        if (body?.failedRoleId && guild && !guild.roles.cache.has(body.failedRoleId)) {
          return reply.status(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Vai trò Failed Role không tồn tại trong máy chủ này.',
          });
        }

        const updateData: Record<string, unknown> = {};

        if (body?.normalModeChannelId !== undefined) {
          updateData.normalModeChannelId = body.normalModeChannelId;
        }
        if (body?.hardModeChannelId !== undefined) {
          updateData.hardModeChannelId = body.hardModeChannelId;
        }
        if (body?.reliableRoleId !== undefined) {
          updateData.reliableRoleId = body.reliableRoleId;
        }
        if (body?.failedRoleId !== undefined) {
          updateData.failedRoleId = body.failedRoleId;
        }
        if (body?.languages !== undefined) {
          if (
            typeof body.languages === 'string' &&
            /^[a-z]{2}(,[a-z]{2})*$/.test(body.languages.trim().toLowerCase())
          ) {
            updateData.languages = body.languages.trim().toLowerCase();
          } else {
            return reply.status(400).send({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'Mã ngôn ngữ không hợp lệ. Vui lòng nhập định dạng mã 2 ký tự (ví dụ: "en").',
            });
          }
        }

        const config = await db.wordChainConfig.upsert({
          where: { guildId },
          create: {
            guildId,
            ...updateData,
          },
          update: updateData,
        });

        logger.info({ guildId, updateData }, 'Updated Word Chain configuration');

        return reply.send({
          success: true,
          config,
        });
      },
    );

    // 3. Reset ván chơi bị kẹt (xóa used words và đưa đếm về 0)
    fastify.post(
      '/reset',
      { preHandler: [requirePermit(client, PermitFlag.MANAGE_WORDCHAIN)] },
      async (request, reply) => {
        const guildId = (request.params as { guildId: string }).guildId;
        const body = request.body as WordChainResetBody | undefined;
        const targetMode = body?.mode ?? 'all';

        try {
          if (targetMode === 'normal' || targetMode === 'all') {
            await wordChainGameService.resetChain(guildId, GameMode.NORMAL);
          }
          if (targetMode === 'hard' || targetMode === 'all') {
            await wordChainGameService.resetChain(guildId, GameMode.HARD);
          }

          logger.warn(
            { guildId, targetMode },
            'Wordchain session reset triggered via dashboard API',
          );

          return reply.send({
            success: true,
            mode: targetMode,
            message: `Đã reset chuỗi nối từ ${targetMode === 'all' ? 'cả 2 chế độ' : targetMode} thành công.`,
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          logger.error(
            { err, guildId, targetMode },
            'Failed to reset Word Chain session',
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
