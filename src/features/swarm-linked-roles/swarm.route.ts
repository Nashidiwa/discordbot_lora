import type { FastifyPluginAsync } from 'fastify';
import { logger } from '../../core/logger.js';
import type { BotRoute, RouteContext } from '../../core/types/index.js';
import { SwarmAuthService } from './services/swarm-auth.service.js';
import { SwarmMetadataService } from './services/swarm-metadata.service.js';
import { swarmConfig } from './swarm.config.js';
import { DiscordApiEndpoints, SwarmRoleNames } from './swarm.constants.js';
import { DiscordUserResponseSchema } from './swarm.types.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSuccessHtml(
  username: string,
  level: number,
  roleName: string | null,
): string {
  const safeUsername = escapeHtml(username);
  const safeRoleName = roleName ? escapeHtml(roleName) : null;
  const roleDisplay =
    level > 0 && safeRoleName
      ? `<span class="badge level-${level}">${safeRoleName} (Level ${level})</span>`
      : `<span class="badge unranked">Unranked (Level 0)</span>`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Swarm - Liên Kết Thành Công</title>
  <style>
    :root {
      --bg-color: #0f1117;
      --card-bg: #1a1d26;
      --accent-color: #5865F2;
      --success-color: #57F287;
      --text-main: #FFFFFF;
      --text-muted: #949BA4;
      --border-color: #2b2f3a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 2.5rem 2rem;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    .icon {
      width: 64px;
      height: 64px;
      background: rgba(87, 242, 135, 0.15);
      color: var(--success-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      font-size: 32px;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }
    p.desc {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-bottom: 1.75rem;
      line-height: 1.5;
    }
    .info-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      text-align: left;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
    }
    .info-label { color: var(--text-muted); }
    .badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.8rem;
      background: var(--accent-color);
      color: #fff;
    }
    .badge.unranked { background: #4e5058; }
    .footer-note {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Liên Kết Thành Công!</h1>
    <p class="desc">Tài khoản Discord <strong>${safeUsername}</strong> đã được đồng bộ với mạng lưới The Swarm.</p>
    
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Tài khoản</span>
        <span style="font-weight: 600;">@${safeUsername}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Danh hiệu</span>
        ${roleDisplay}
      </div>
    </div>

    <p class="footer-note">✨ Bạn có thể đóng tab trình duyệt này và quay trở lại Discord để nhận Linked Role.</p>
  </div>
</body>
</html>`;
}

function renderErrorHtml(message: string): string {
  const safeMessage = escapeHtml(message);
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Swarm - Lỗi Xác Thực</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f1117; color: #fff;
      display: flex; align-items: center; justify-content: center; min-height: 100vh;
      padding: 1rem; margin: 0;
    }
    .card {
      background: #1a1d26; border: 1px solid #2b2f3a; border-radius: 16px;
      padding: 2.5rem; max-width: 420px; text-align: center;
    }
    .icon { font-size: 48px; color: #ED4245; margin-bottom: 1rem; }
    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
    p { color: #949BA4; font-size: 0.95rem; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h1>Xác Thực Thất Bại</h1>
    <p>${safeMessage}</p>
  </div>
</body>
</html>`;
}

const swarmRoutePlugin: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /auth/discord/login
   */
  fastify.get('/discord/login', async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const userId = query.userId || 'direct-verification';
    const guildId = query.guildId;

    const authUrl = SwarmAuthService.getAuthorizationUrl(userId, guildId);
    return reply.redirect(authUrl);
  });

  /**
   * GET /auth/discord/callback
   */
  fastify.get('/discord/callback', async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const { code, state, error, error_description } = query;

    if (error) {
      logger.warn(
        { error, error_description },
        'Discord OAuth2 returned error callback',
      );
      reply.type('text/html');
      return reply
        .status(400)
        .send(
          renderErrorHtml(
            error_description || 'Bạn đã từ chối cấp quyền hoặc liên kết đã bị hủy.',
          ),
        );
    }

    if (!code) {
      reply.type('text/html');
      return reply
        .status(400)
        .send(renderErrorHtml('Thiếu mã xác thực (authorization code).'));
    }

    if (!state) {
      reply.type('text/html');
      return reply
        .status(400)
        .send(
          renderErrorHtml(
            'Thiếu mã bảo mật phiên xác thực (CSRF State Parameter).',
          ),
        );
    }

    try {
      SwarmAuthService.verifyState(state);
    } catch (err) {
      logger.warn({ err, state }, 'Invalid state during OAuth2 callback');
      reply.type('text/html');
      return reply
        .status(400)
        .send(
          renderErrorHtml(
            'Mã bảo mật phiên xác thực (CSRF State) không hợp lệ hoặc đã hết hạn.',
          ),
        );
    }

    try {
      // 1. Exchange code for access & refresh tokens
      const tokenData = await SwarmAuthService.exchangeCodeForToken(code);

      // 2. Fetch Discord user identity
      const userRes = await fetch(DiscordApiEndpoints.USER_ME, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userRes.ok) {
        throw new Error('Failed to fetch Discord user profile');
      }

      const userJson: unknown = await userRes.json();
      const discordUser = DiscordUserResponseSchema.parse(userJson);

      // 3. Save tokens into database
      await SwarmAuthService.saveToken(discordUser.id, tokenData);

      // 4. Retrieve current swarm level from DB
      const userStatus = await SwarmMetadataService.getUserStatus(
        discordUser.id,
      );

      // 5. Push metadata to Discord
      await SwarmMetadataService.pushUserMetadata(
        discordUser.id,
        userStatus.swarmLevel,
        discordUser.username,
      );

      reply.type('text/html');
      return reply.send(
        renderSuccessHtml(
          discordUser.username,
          userStatus.swarmLevel,
          userStatus.roleName,
        ),
      );
    } catch (err) {
      logger.error({ err }, 'Error during OAuth2 callback execution');
      reply.type('text/html');
      return reply
        .status(500)
        .send(
          renderErrorHtml(
            'Đã xảy ra lỗi nội bộ trong quá trình trao đổi dữ liệu với Discord. Vui lòng thử lại sau.',
          ),
        );
    }
  });
};

export const swarmRoute: BotRoute = {
  prefix: '/auth',
  register: swarmRoutePlugin,
};

export default swarmRoute;
