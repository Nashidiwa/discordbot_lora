import crypto from 'node:crypto';
import { config } from '../../config.js';
import { logger } from '../../logger.js';
import type { BotRoute, RouteContext } from '../../types/index.js';
import {
  generateOAuthState,
  signSessionToken,
  verifyOAuthState,
} from '../auth/session.util.js';
import {
  extractAuthContext,
  getJwtSecret,
  requireAuth,
} from '../guards/auth.guard.js';
import { PermitFlag, PermitService } from '../../../shared/permit/index.js';

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUserResponse {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string | null;
  avatar: string | null;
}

export const route: BotRoute = {
  prefix: '/api',
  register: async (fastify, { client }: RouteContext) => {
    const clientId = config.CLIENT_ID;
    const clientSecret = config.DISCORD_CLIENT_SECRET ?? '';
    const redirectUri =
      config.DISCORD_DASHBOARD_REDIRECT_URI ||
      `http://localhost:${config.PORT}/api/auth/discord/callback`;

    // 1. Chuyển hướng tới Discord OAuth2 kèm CSRF State Parameter
    fastify.get('/auth/discord', async (_request, reply) => {
      const state = generateOAuthState(getJwtSecret());

      // Lưu state vào httpOnly cookie có thời hạn ngắn (10 phút) để đối chiếu
      reply.setCookie('lora_oauth_state', state, {
        path: '/api/auth',
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 phút
      });

      const scope = encodeURIComponent('identify guilds');
      const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&response_type=code&scope=${scope}&state=${encodeURIComponent(state)}`;

      return reply.redirect(discordAuthUrl);
    });

    // 2. Callback OAuth2 trao đổi token, xác thực CSRF State và tạo Session Cookie
    fastify.get('/auth/discord/callback', async (request, reply) => {
      const { code, state } = request.query as { code?: string; state?: string };
      const cookieState = (
        request.cookies as Record<string, string | undefined> | undefined
      )?.lora_oauth_state;

      // Xóa cookie state ngay lập tức để ngăn ngừa tấn công replay
      reply.clearCookie('lora_oauth_state', { path: '/api/auth' });

      // Kiểm tra sự tồn tại của State token và Cookie
      if (!state || !cookieState) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Thiếu tham số bảo mật OAuth2 state hoặc cookie phiên hợp lệ.',
        });
      }

      // Đối chiếu Timing-Safe giữa query state và cookie state
      const stateBuf = Buffer.from(state);
      const cookieBuf = Buffer.from(cookieState);
      const isStateEqual =
        stateBuf.length === cookieBuf.length &&
        crypto.timingSafeEqual(stateBuf, cookieBuf);

      if (!isStateEqual || !verifyOAuthState(state, getJwtSecret())) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Xác thực OAuth2 state thất bại. Khả năng cao có hành vi can thiệp CSRF.',
        });
      }

      if (!code) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Thiếu mã ủy quyền (code) từ Discord.',
        });
      }

      try {
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId.trim(),
            client_secret: clientSecret.trim(),
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri.trim(),
          }).toString(),
        });

        if (!tokenRes.ok) {
          const errBody = await tokenRes.text();
          logger.error(
            { errBody, clientId: clientId.trim(), redirectUri: redirectUri.trim() },
            'Failed to exchange Discord OAuth2 code',
          );
          const isInvalidClient = errBody.includes('invalid_client');
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: isInvalidClient
              ? 'Xác thực thất bại (invalid_client): DISCORD_CLIENT_SECRET trong .env không khớp với CLIENT_ID trên Discord Developer Portal hoặc Secret đã bị Reset.'
              : 'Không thể xác thực với Discord API.',
          });
        }

        const tokenData = (await tokenRes.json()) as DiscordTokenResponse;

        // Lấy thông tin user
        const userRes = await fetch('https://discord.com/api/users/@me', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });

        if (!userRes.ok) {
          return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Không thể tải thông tin tài khoản Discord.',
          });
        }

        const userData = (await userRes.json()) as DiscordUserResponse;

        // Ký Session Token
        const sessionToken = signSessionToken(
          {
            userId: userData.id,
            username: userData.username,
            globalName: userData.global_name,
            avatar: userData.avatar,
          },
          getJwtSecret(),
        );

        // Thiết lập Cookie phiên lora_session
        reply.setCookie('lora_session', sessionToken, {
          path: '/',
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 ngày
        });

        // Nếu ở local dev, redirect sang Vite dev server (5173); nếu production, redirect /dashboard
        const isDev = config.NODE_ENV !== 'production';
        const targetRedirect = isDev
          ? 'http://localhost:5173/dashboard'
          : '/dashboard';

        return reply.redirect(targetRedirect);
      } catch (err: unknown) {
        logger.error({ err }, 'Error during Discord OAuth2 callback');
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Lỗi hệ thống khi xử lý phiên đăng nhập.',
        });
      }
    });

    // 3. Lấy thông tin tài khoản hiện tại
    fastify.get('/auth/me', async (request, reply) => {
      const auth = extractAuthContext(request);
      if (!auth) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Chưa đăng nhập.',
        });
      }

      return reply.send({
        user: {
          userId: auth.userId,
          username: auth.username,
          avatar: auth.avatar,
          isBotOwner: auth.isBotOwner,
          isMasterKey: auth.isMasterKey,
        },
      });
    });

    // 4. Đăng xuất
    fastify.post('/auth/logout', async (_request, reply) => {
      reply.clearCookie('lora_session', { path: '/' });
      return reply.send({ success: true, message: 'Đăng xuất thành công.' });
    });

    // 5. Lấy danh sách Guilds mà người dùng có quyền quản trị
    fastify.get(
      '/guilds',
      { preHandler: [requireAuth] },
      async (request, reply) => {
        if (!client.isReady()) {
          return reply.status(503).send({
            statusCode: 503,
            error: 'Service Unavailable',
            message: 'Discord Gateway chưa sẵn sàng, vui lòng thử lại sau giây lát.',
          });
        }

        const auth = request.auth!;
        const botOwnerId = config.BOT_OWNER_ID ?? '';

        const checkGuildTasks = Array.from(client.guilds.cache.values()).map(
          async (guild) => {
            // Bot Owner xem được toàn bộ guilds
            if (auth.isBotOwner) {
              return {
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                memberCount: guild.memberCount,
                isOwner: guild.ownerId === auth.userId,
                roleTier: 'BOT_OWNER',
                permissions: 0xffff,
              };
            }

            // Server Owner luôn có quyền quản trị cao nhất trên server của mình
            if (guild.ownerId === auth.userId) {
              return {
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                memberCount: guild.memberCount,
                isOwner: true,
                roleTier: 'SERVER_OWNER',
                permissions: 0xffff,
              };
            }

            // Kiểm tra xem user có trong guild này không (dùng cache trước, fallback fetch)
            let memberRoleIds: string[] = [];
            try {
              const member =
                guild.members.cache.get(auth.userId) ??
                (await guild.members.fetch(auth.userId).catch(() => null));
              if (!member) {
                return null;
              }
              memberRoleIds = Array.from(member.roles.cache.keys());
            } catch {
              return null; // Lỗi tra cứu member, bỏ qua
            }

            const resolved = await PermitService.resolveMemberPermissions({
              guildId: guild.id,
              userId: auth.userId,
              memberRoleIds,
              serverOwnerId: guild.ownerId,
              botOwnerId,
            });

            if (resolved.hasPermission(PermitFlag.VIEW_DASHBOARD)) {
              return {
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                memberCount: guild.memberCount,
                isOwner: false,
                roleTier: resolved.tier,
                permissions: resolved.effectivePermissions,
              };
            }

            return null;
          },
        );

        const evaluatedGuilds = await Promise.all(checkGuildTasks);
        const manageableGuilds = evaluatedGuilds.filter(
          (g): g is NonNullable<typeof g> => g !== null,
        );

        return reply.send({ guilds: manageableGuilds });
      },
    );
  },
};

export default route;
