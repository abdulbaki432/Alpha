import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { AppSettings, CallLog } from '@/types';

const KEYS = {
  settings: '@alpha:settings',
  logs: '@alpha:logs',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  profileName: '',
  greeting:
    'Assalamu Alaikum / Namaskar. I am the AI Assistant. Please state your business and I will help you.',
  groqKey: '',
  hfToken: '',
  assistantActive: false,
  autoCleanDays: 15,
  lastCleanAt: null,
};

// SecureStore is only available on native platforms. On web we fall back to
// AsyncStorage so the app remains functional in the browser preview.
async function secureSet(key: string, value: string) {
  if (Platform.OS !== 'web') {
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync(key, value, {
        keychainService: 'alpha',
      });
      return;
    } catch {
      // fall through to AsyncStorage
    }
  }
  await AsyncStorage.setItem(key, value);
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS !== 'web') {
    try {
      const SecureStore = require('expo-secure-store');
      const v = await SecureStore.getItemAsync(key, { keychainService: 'alpha' });
      if (v != null) return v;
    } catch {
      // fall through
    }
  }
  return AsyncStorage.getItem(key);
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.settings);
    const parsed = raw ? (JSON.parse(raw) as Partial<AppSettings>) : {};
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(s));
}

export async function loadLogs(): Promise<CallLog[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.logs);
    if (!raw) return [];
    const arr = JSON.parse(raw) as CallLog[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveLogs(logs: CallLog[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.logs, JSON.stringify(logs));
}

// Public API key helpers (used by the AI service layer).
export async function getApiKey(key: 'groq' | 'hf', settings: AppSettings): Promise<string | null> {
  // Prefer in-memory settings (already loaded from storage), but also check
  // secure store in case it was written from another surface.
  if (key === 'groq' && settings.groqKey) return settings.groqKey;
  if (key === 'hf' && settings.hfToken) return settings.hfToken;
  const fallback = await secureGet(key === 'groq' ? 'groq_key' : 'hf_token');
  return fallback;
}

export async function setApiKey(key: 'groq' | 'hf', value: string): Promise<void> {
  await secureSet(key === 'groq' ? 'groq_key' : 'hf_token', value);
}
