import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { config } from '../../config.js';

export async function registerCorsPlugin(server: FastifyInstance): Promise<void> {
  const isDev = config.NODE_ENV !== 'production';

  // Danh sách Origin được phép cấu hình từ biến môi trường (gộp CORS_ORIGIN và ALLOWED_ORIGINS)
  const envOrigins = [config.CORS_ORIGIN, config.ALLOWED_ORIGINS]
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .flatMap((s) => s.split(','))
    .map((o) => o.trim())
    .filter(Boolean);

  // Origins mặc định cho môi trường phát triển cục bộ
  const devOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${config.PORT}`,
    `http://127.0.0.1:${config.PORT}`,
  ];

  const allowedOrigins = new Set<string>([
    ...envOrigins,
    ...(isDev ? devOrigins : []),
  ]);

  await server.register(cors, {
    credentials: true,
    origin: (incomingOrigin, callback) => {
      // Cho phép nếu không có Origin header (same-origin, curl, health probes)
      if (!incomingOrigin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(incomingOrigin)) {
        callback(null, true);
        return;
      }

      // Từ chối các Origin ngoài whitelist một cách an toàn (tránh văng lỗi 500)
      callback(null, false);
    },
  });
}
