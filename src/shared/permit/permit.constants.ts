export const PermitFlag = {
  VIEW_DASHBOARD: 1 << 0, // 0x01 (1): Cho phép truy cập và xem Dashboard
  MANAGE_PERMITS: 1 << 1, // 0x02 (2): Cấu hình Co-Owner, Trusted Admin, Custom Permits
  MANAGE_SETTINGS: 1 << 2, // 0x04 (4): Cấu hình cài đặt chung của Guild
  MANAGE_PERKS: 1 << 3, // 0x08 (8): Quản lý Server Booster & Donator Time-Bank
  MANAGE_VOICE_KEEPER: 1 << 4, // 0x10 (16): Cấu hình kênh thoại 24/7 & kích hoạt Reconnect
  MANAGE_WORDCHAIN: 1 << 5, // 0x20 (32): Cấu hình trò chơi nối từ (Future Expansion)
  MANAGE_SWARM: 1 << 6, // 0x40 (64): Cấu hình The Swarm Linked Roles (Future Expansion)
} as const;

export type PermitFlagKey = keyof typeof PermitFlag;

export const ALL_PERMIT_FLAGS = Object.values(PermitFlag).reduce(
  (acc, flag) => acc | flag,
  0,
);

export const DEFAULT_TRUSTED_ADMIN_FLAGS =
  PermitFlag.VIEW_DASHBOARD |
  PermitFlag.MANAGE_SETTINGS |
  PermitFlag.MANAGE_PERKS |
  PermitFlag.MANAGE_VOICE_KEEPER;

export const PermitTier = {
  CO_OWNER: 'CO_OWNER',
  TRUSTED_ADMIN: 'TRUSTED_ADMIN',
  CUSTOM: 'CUSTOM',
} as const;

export type PermitTier = (typeof PermitTier)[keyof typeof PermitTier];

export const PermitTargetType = {
  USER: 'USER',
  ROLE: 'ROLE',
} as const;

export type PermitTargetType =
  (typeof PermitTargetType)[keyof typeof PermitTargetType];
