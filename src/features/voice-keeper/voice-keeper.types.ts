import type { VoiceConnection } from '@discordjs/voice';

export const VoiceConnectionStatusType = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  READY: 'READY',
  RECONNECTING: 'RECONNECTING',
  SUSPENDED: 'SUSPENDED',
  IDLE: 'IDLE',
} as const;

export type VoiceConnectionStatusType =
  (typeof VoiceConnectionStatusType)[keyof typeof VoiceConnectionStatusType];

export interface VoiceKeeperConfigRecord {
  guildId: string;
  channelId: string;
  isEnabled: boolean;
  selfDeaf: boolean;
  selfMute: boolean;
  autoReconnect: boolean;
  lastConnectedAt: Date | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceSession {
  guildId: string;
  channelId: string;
  connection: VoiceConnection | null;
  status: VoiceConnectionStatusType;
  reconnectAttempts: number;
  reconnectTimer: NodeJS.Timeout | null;
  isConnecting?: boolean;
  connectedAt: Date | null;
  lastPing: number | null;
}

export interface VoiceStatusResult {
  guildId: string;
  channelId: string | null;
  channelName: string | null;
  isEnabled: boolean;
  status: VoiceConnectionStatusType;
  selfDeaf: boolean;
  selfMute: boolean;
  autoReconnect: boolean;
  lastConnectedAt: Date | null;
  reconnectAttempts: number;
  ping: number | null;
}

export interface SetVoiceKeeperOptions {
  guildId: string;
  channelId: string;
  selfDeaf?: boolean;
  selfMute?: boolean;
  autoReconnect?: boolean;
  updatedBy: string;
}
