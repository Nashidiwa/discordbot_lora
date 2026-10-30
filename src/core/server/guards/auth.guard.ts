import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PermitResolvedResult } from '../../../shared/permit/permit.types.js';
import { config } from '../../config.js';
import { getSecretKey, verifySessionToken } from '../auth/session.util.js';

export interface AuthContext {
  userId: string;
  username: string;
  avatar: string | null;
  isMasterKey: boolean;
  isBotOwner: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
    permit?: PermitResolvedResult;
  }
}

export function getJwtSecret(): string {
  return getSecretKey('JWT_SECRET');
}

/**
 * Trích xuất AuthContext từ cookie lora_session hoặc header x-api-key
 */
export function extractAuthContext(request: FastifyRequest): AuthContext | null {
  const botOwnerId = config.BOT_OWNER_ID ?? '';

  // 1. Kiểm tra Master API Key (cho Bot Owner / Automation scripts) với timing-safe comparison
  const masterApiKey = config.MASTER_API_KEY;
  const rawApiKey = request.headers['x-api-key'];
  const reqApiKey =
    typeof rawApiKey === 'string'
      ? rawApiKey
      : Array.isArray(rawApiKey) && rawApiKey.length > 0
        ? rawApiKey[0]
        : undefined;

  if (masterApiKey && reqApiKey) {
    const keyBuf = Buffer.from(reqApiKey);
    const masterBuf = Buffer.from(masterApiKey);

    if (
      keyBuf.length === masterBuf.length &&
      crypto.timingSafeEqual(keyBuf, masterBuf)
    ) {
      return {
        userId: botOwnerId || 'MASTER_API_KEY',
        username: 'Bot Owner (API Key)',
        avatar: null,
        isMasterKey: true,
        isBotOwner: true,
      };
    }
  }

  // 2. Kiểm tra Cookie Session
  const sessionCookie = (
    request.cookies as Record<string, string | undefined> | undefined
  )?.lora_session;
  if (!sessionCookie) {
    return null;
  }

  const payload = verifySessionToken(sessionCookie, getJwtSecret());
  if (!payload) {
    return null;
  }

  const isBotOwner = Boolean(botOwnerId && payload.userId === botOwnerId);

  return {
    userId: payload.userId,
    username: payload.username,
    avatar: payload.avatar,
    isMasterKey: false,
    isBotOwner,
  };
}

/**
 * PreHandler Guard: Bắt buộc đã đăng nhập (Cookie hoặc API Key)
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = extractAuthContext(request);
  if (!auth) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Vui lòng đăng nhập qua Discord hoặc cung cấp API Key hợp lệ.',
    });
  }

  request.auth = auth;
}

/**
 * PreHandler Guard: Bắt buộc là Bot Owner hoặc Master API Key
 */
export async function requireBotOwner(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const auth = extractAuthContext(request);
  if (!auth) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Yêu cầu đăng nhập quản trị hệ thống.',
    });
  }

  if (!auth.isBotOwner && !auth.isMasterKey) {
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Chỉ Bot Owner mới có quyền truy cập endpoint này.',
    });
  }

  request.auth = auth;
}
