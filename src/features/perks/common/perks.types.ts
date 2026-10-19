export const PerkStatus = {
  ACTIVE: 'ACTIVE',
  GRACE_PERIOD: 'GRACE_PERIOD',
  REVOKED: 'REVOKED',
} as const;

export type PerkStatus = (typeof PerkStatus)[keyof typeof PerkStatus];


export const PerkType = {
  SERVER_BOOSTER: 'SERVER_BOOSTER',
  DONATOR: 'DONATOR',
} as const;

export type PerkType = (typeof PerkType)[keyof typeof PerkType];

export interface CustomRoleConfigOptions {
  name?: string;
  color1?: string;
  color2?: string;
}

export interface ConfigCustomRoleResult {
  roleName?: string | null;
  roleColor?: string | null;
  roleColor2?: string | null;
}
