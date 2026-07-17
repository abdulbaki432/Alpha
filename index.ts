export type CallDirection = 'incoming' | 'outgoing';

export type ChatRole = 'caller' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  ts: number;
}

export interface CallLog {
  id: string;
  callerName: string;
  phoneNumber: string;
  direction: CallDirection;
  durationSec: number;
  startedAt: number;
  endedAt: number;
  urgent: boolean;
  savedToPublic: boolean;
  audioUri: string | null;
  transcript: ChatMessage[];
  language?: 'bn' | 'banglish' | 'en';
  contactKnown: boolean;
}

export interface AppSettings {
  profileName: string;
  greeting: string;
  groqKey: string;
  hfToken: string;
  assistantActive: boolean;
  autoCleanDays: 15 | 30;
  lastCleanAt: number | null;
}

export interface DashboardStats {
  todayCount: number;
  todayIncoming: number;
  todayOutgoing: number;
  todayUrgent: number;
  todayTotalDurationSec: number;
  totalIncoming: number;
  totalOutgoing: number;
  totalMessages: number;
}
