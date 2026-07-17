import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';
import type { AppSettings, CallLog, ChatMessage } from '@/types';
import {
  detectLanguage,
  detectUrgent,
  generateAssistantReply,
  pickFiller,
  synthesizeSpeech,
  transcribeAudio,
} from '@/lib/ai';
import { saveLogs, loadLogs } from '@/lib/storage';

export interface SimulatedCallInput {
  phoneNumber: string;
  direction: 'incoming' | 'outgoing';
  audioUri: string;
}

export interface ProcessedCall {
  log: CallLog;
  urgentAlert: boolean;
}

let alertSound: Audio.Sound | null = null;

export async function ensureAudioMode() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    // ignore on web
  }
}

export async function lookupContact(phone: string): Promise<{ known: boolean; name: string | null }> {
  if (Platform.OS === 'web') {
    return { known: false, name: null };
  }
  try {
    const perm = await Contacts.requestPermissionsAsync();
    if (!perm.granted) return { known: false, name: null };
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
      pageSize: 200,
    });
    const norm = normalizePhone(phone);
    const match = data.find((c) =>
      (c.phoneNumbers || []).some((p) => normalizePhone(p.number || '') === norm),
    );
    return match ? { known: true, name: match.name || null } : { known: false, name: null };
  } catch {
    return { known: false, name: null };
  }
}

function normalizePhone(p: string): string {
  return p.replace(/[^0-9]/g, '').slice(-10);
}

export async function processIncomingCall(
  input: SimulatedCallInput,
  settings: AppSettings,
): Promise<ProcessedCall> {
  await ensureAudioMode();

  const contact = await lookupContact(input.phoneNumber);
  const callerName = contact.name || input.phoneNumber;

  // 1. Play latency filler immediately.
  await playFiller();

  // 2. Transcribe caller audio.
  let callerText = '';
  try {
    callerText = await transcribeAudio(input.audioUri, settings);
  } catch (e) {
    callerText = 'দয়া করে আপনার পরিচয় দিন।';
  }
  if (!callerText) callerText = 'এসো, বলুন।';

  const transcript: ChatMessage[] = [
    {
      id: `m-${Date.now()}-c`,
      role: 'caller',
      text: callerText,
      ts: Date.now(),
    },
  ];

  // 3. Generate assistant reply.
  let replyText = pickFiller();
  let urgent = detectUrgent(callerText);
  let lang: 'bn' | 'banglish' | 'en' = detectLanguage(callerText);
  try {
    const reply = await generateAssistantReply(
      callerText,
      transcript,
      settings,
      contact.known,
      contact.name,
    );
    replyText = reply.text;
    urgent = urgent || reply.urgent;
    lang = reply.language;
  } catch {
    // keep filler
  }

  transcript.push({
    id: `m-${Date.now()}-a`,
    role: 'assistant',
    text: replyText,
    ts: Date.now(),
  });

  // 4. Speak the reply (TTS via HF, fallback to OS speech).
  await speakReply(replyText, settings);

  // 5. Urgent alert: bypass silent mode with a loud alarm.
  if (urgent) {
    await triggerUrgentAlarm();
  }

  const now = Date.now();
  const log: CallLog = {
    id: `log-${now}`,
    callerName,
    phoneNumber: input.phoneNumber,
    direction: input.direction,
    durationSec: 18,
    startedAt: now - 18000,
    endedAt: now,
    urgent,
    savedToPublic: false,
    audioUri: input.audioUri,
    transcript,
    language: lang,
    contactKnown: contact.known,
  };

  const logs = await loadLogs();
  logs.unshift(log);
  await saveLogs(logs);

  return { log, urgentAlert: urgent };
}

async function playFiller() {
  try {
    if (Platform.OS === 'web') {
      // Use Speech as a filler on web.
      Speech.speak(pickFiller(), { language: 'bn' });
      return;
    }
    // Try HF TTS for the filler; fall back to OS speech.
    try {
      const uri = await synthesizeSpeech(pickFiller(), await currentSettings());
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
    } catch {
      Speech.speak(pickFiller(), { language: 'bn' });
    }
  } catch {
    // ignore
  }
}

let currentSettingsRef: AppSettings | null = null;
export function setRuntimeSettings(s: AppSettings) {
  currentSettingsRef = s;
}
async function currentSettings(): Promise<AppSettings> {
  if (currentSettingsRef) return currentSettingsRef;
  const { loadSettings } = await import('@/lib/storage');
  return loadSettings();
}

async function speakReply(text: string, settings: AppSettings) {
  try {
    if (Platform.OS !== 'web') {
      const uri = await synthesizeSpeech(text, settings);
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
      return;
    }
  } catch {
    // fall back to OS speech
  }
  try {
    Speech.speak(text, { language: 'bn', pitch: 1.0, rate: 0.95 });
  } catch {
    // ignore
  }
}

export async function triggerUrgentAlarm() {
  try {
    if (Platform.OS === 'web') {
      Speech.speak('জরুরি বার্তা! একটি জরুরি কল এসেছে।', { language: 'bn', pitch: 1.2, rate: 1.1 });
      return;
    }
    // Play a loud beep repeatedly. We reuse a short generated tone via Audio.Sound.
    if (!alertSound) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/buttons/sounds/alarm-01.mp3' },
        { shouldPlay: false, volume: 1.0 },
      );
      alertSound = sound;
    }
    await alertSound.setVolumeAsync(1.0);
    await alertSound.setIsLoopingAsync(true);
    await alertSound.replayAsync();
  } catch {
    // ignore
  }
}

export async function stopUrgentAlarm() {
  try {
    if (alertSound) {
      await alertSound.stopAsync();
      await alertSound.setIsLoopingAsync(false);
    }
  } catch {
    // ignore
  }
}

// --- Auto-clean scheduler ---
export async function runAutoCleanIfNeeded(settings: AppSettings): Promise<{ settings: AppSettings; removed: number }> {
  const now = Date.now();
  const last = settings.lastCleanAt || 0;
  // Run at most once per 6 hours.
  if (now - last < 6 * 60 * 60 * 1000) {
    return { settings, removed: 0 };
  }
  const cutoff = now - settings.autoCleanDays * 24 * 60 * 60 * 1000;
  const logs = await loadLogs();
  const remaining = logs.filter((l) => l.startedAt >= cutoff);
  const removed = logs.length - remaining.length;
  if (removed > 0) await saveLogs(remaining);
  const updated: AppSettings = { ...settings, lastCleanAt: now };
  const { saveSettings } = await import('@/lib/storage');
  await saveSettings(updated);
  return { settings: updated, removed };
}
