import crypto from 'node:crypto';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

export interface SessionPayload {
  userId: string;
  username: string;
  globalName?: string | null;
  avatar: string | null;
  exp: number; // Unix timestamp (seconds)
}

let ephemeralSecret: string | null = null;

/**
 * Lấy secret an toàn từ cấu hình hoặc sinh ngẫu nhiên tạm thời (phòng chống static key forgery)
 */
export function getSecretKey(envVarName: 'JWT_SECRET' | 'COOKIE_SECRET'): string {
  const envVal =
    (envVarName === 'COOKIE_SECRET' ? config.COOKIE_SECRET : process.env.JWT_SECRET) ||
    config.DISCORD_CLIENT_SECRET;
  if (envVal) {
    return envVal;
  }

  if (config.NODE_ENV === 'production') {
    logger.error(
      { envVar: envVarName },
      'Production environment missing explicit secret (COOKIE_SECRET or DISCORD_CLIENT_SECRET). All user sessions will be invalidated on server restart!',
    );
  }

  if (!ephemeralSecret) {
    ephemeralSecret = crypto.randomBytes(32).toString('hex');
  }

  return ephemeralSecret;
}

/**
 * Mã hóa payload thành Session Token kèm chữ ký HMAC-SHA256
 */
export function signSessionToken(
  payload: Omit<SessionPayload, 'exp'>,
  secret: string,
  expiresInSeconds: number = 7 * 24 * 60 * 60, // Mặc định 7 ngày
): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const jsonStr = JSON.stringify(fullPayload);
  const base64Payload = Buffer.from(jsonStr, 'utf-8').toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(base64Payload)
    .digest('base64url');

  return `${base64Payload}.${signature}`;
}

/**
 * Giải mã và xác thực tính toàn vẹn của Session Token
 */
export function verifySessionToken(
  token: string,
  secret: string,
): SessionPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const base64Payload = parts[0];
  const signature = parts[1];

  if (!base64Payload || !signature) {
    return null;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(base64Payload)
      .digest('base64url');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const jsonStr = Buffer.from(base64Payload, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as SessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Đã hết hạn
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Tạo OAuth2 CSRF State token kèm timestamp và chữ ký HMAC-SHA256
 */
export function generateOAuthState(secret: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const data = `${nonce}.${timestamp}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}

/**
 * Xác thực tính hợp lệ và thời hạn của OAuth2 CSRF State token
 */
export function verifyOAuthState(
  state: string,
  secret: string,
  maxAgeSeconds = 600, // 10 phút
): boolean {
  if (!state || typeof state !== 'string') {
    return false;
  }

  const parts = state.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const [nonce, tsStr, signature] = parts;
  if (!nonce || !tsStr || !signature) {
    return false;
  }

  const timestamp = parseInt(tsStr, 10);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  // Không cho phép token quá hạn hoặc vượt quá đồng hồ hệ thống 60s
  if (now - timestamp > maxAgeSeconds || timestamp > now + 60) {
    return false;
  }

  const data = `${nonce}.${tsStr}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  return true;
}
