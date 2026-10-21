import { z } from 'zod';
import type { DonatorActionType, DonatorBurnRate } from './donator.constants.js';

// ==========================================
// ZOD VALIDATION SCHEMAS (External Input Boundaries)
// ==========================================

export const addDonationSchema = z.object({
  targetUserId: z
    .string()
    .trim()
    .min(1, 'Target user ID is required')
    .regex(/^\d{17,20}$/, 'Invalid Discord Snowflake ID'),
  amountVnd: z
    .number()
    .int('Số tiền phải là số nguyên')
    .positive('Số tiền ủng hộ phải lớn hơn 0')
    .max(2_000_000_000, 'Số tiền vượt quá giới hạn cho phép'),
  note: z.string().trim().max(255, 'Ghi chú tối đa 255 ký tự').optional(),
});

export type AddDonationInput = z.infer<typeof addDonationSchema>;

export const adjustCreditSchema = z.object({
  targetUserId: z
    .string()
    .trim()
    .min(1, 'Target user ID is required')
    .regex(/^\d{17,20}$/, 'Invalid Discord Snowflake ID'),
  seconds: z
    .number()
    .int('Số giây phải là số nguyên')
    .refine((val) => val !== 0, 'Số giây điều chỉnh phải khác 0')
    .refine((val) => Math.abs(val) <= 315_360_000, 'Giới hạn điều chỉnh tối đa 10 năm'),
  reason: z.string().trim().max(255, 'Lý do tối đa 255 ký tự').optional(),
});

export type AdjustCreditInput = z.infer<typeof adjustCreditSchema>;

export const setStreakSchema = z.object({
  targetUserId: z
    .string()
    .trim()
    .min(1, 'Target user ID is required')
    .regex(/^\d{17,20}$/, 'Invalid Discord Snowflake ID'),
  streak: z
    .number()
    .int('Bậc streak phải là số nguyên')
    .min(0, 'Bậc streak không được âm')
    .max(100, 'Bậc streak tối đa là 100'),
});

export type SetStreakInput = z.infer<typeof setStreakSchema>;

export const toggleDonatorSchema = z.object({
  state: z.boolean(),
});

export type ToggleDonatorInput = z.infer<typeof toggleDonatorSchema>;

export const configRoleSchema = z.object({
  roleId: z
    .string()
    .trim()
    .min(1, 'Role ID is required')
    .regex(/^\d{17,20}$/, 'Invalid Discord Snowflake ID'),
});

export type ConfigRoleInput = z.infer<typeof configRoleSchema>;

export const configChannelSchema = z.object({
  channelId: z
    .string()
    .trim()
    .regex(/^\d{17,20}$/, 'Invalid Discord Snowflake ID')
    .nullable()
    .optional(),
});

export type ConfigChannelInput = z.infer<typeof configChannelSchema>;

export const viewStatusSchema = z.object({
  targetUserId: z
    .string()
    .trim()
    .regex(/^\d{17,20}$/, 'Invalid Discord Snowflake ID')
    .optional(),
});

export type ViewStatusInput = z.infer<typeof viewStatusSchema>;

// ==========================================
// DOMAIN CALCULATION & EVALUATION CONTRACTS
// ==========================================

export interface DonationCalculationOptions {
  amountVnd: number;
  currentStreak: number;
  benchmarkAmountVnd: number;
  benchmarkDays: number;
}

export interface DonationCalculationResult {
  baseCreditSeconds: number;
  bonusVolumePercent: number;
  bonusStreakPercent: number;
  totalMultiplier: number;
  creditSecondsAdded: number;
  newStreak: number;
  isStreakIncremented: boolean;
}

export interface LazyEvaluationResult {
  previousCreditSeconds: number;
  newCreditSeconds: number;
  consumedSeconds: number;
  deltaSeconds: number;
  burnRate: DonatorBurnRate;
  isDepleted: boolean;
  evaluatedAt: Date;
}

export interface DonatorAccountStatus {
  guildId: string;
  userId: string;
  creditSeconds: number;
  remainingDays: number;
  remainingHours: number;
  isEquipped: boolean;
  currentBurnRate: DonatorBurnRate;
  streak: number;
  currentWeekTotalVnd: number;
  totalDonatedVnd: bigint;
  estimatedDepletionDate: Date | null;
  lastDeductedAt: Date;
  isEnabled: boolean;
}

export interface DonatorTransactionDTO {
  id: string;
  guildId: string;
  userId: string;
  amountVnd: number;
  bonusVolumePercent: number;
  bonusStreakPercent: number;
  creditSecondsAdded: number;
  actionType: DonatorActionType;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}
