import type { AppSettings, ChatMessage } from '@/types';

const GROQ_STT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const URGENT_KEYWORDS = [
  'জরুরি',
  'emergency',
  'হাসপাতাল',
  'রক্ত লাগবে',
  'অ্যাক্সিডেন্ট',
  'তাড়াতাড়ি',
  'urgent',
  'hospital',
  'accident',
  'blood',
  'help',
  'danger',
];

export function detectUrgent(text: string): boolean {
  const lower = text.toLowerCase();
  return URGENT_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

export function detectLanguage(text: string): 'bn' | 'banglish' | 'en' {
  const hasBengali = /[\u0980-\u09FF]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasBengali && hasLatin) return 'banglish';
  if (hasBengali) return 'bn';
  return hasLatin ? 'en' : 'bn';
}

const LATENCY_FILLERS = [
  'হুমম, একটু লাইনে থাকুন...',
  'একটু সময় দিন, ভাবছি...',
  'হ্যাঁ, বলুন, শুনছি...',
  'এক সেকেন্ড, দেখছি...',
];

export function pickFiller(): string {
  return LATENCY_FILLERS[Math.floor(Math.random() * LATENCY_FILLERS.length)];
}

export class MissingKeyError extends Error {
  constructor(public which: 'groq' | 'hf') {
    super(`${which === 'groq' ? 'Groq API Key' : 'Hugging Face Token'} is not configured.`);
    this.name = 'MissingKeyError';
  }
}

async function ensureGroq(settings: AppSettings): Promise<string> {
  const key = settings.groqKey || (await import('@/lib/storage').then((m) => m.getApiKey('groq', settings)));
  if (!key) throw new MissingKeyError('groq');
  return key;
}

async function ensureHf(settings: AppSettings): Promise<string> {
  const key = settings.hfToken || (await import('@/lib/storage').then((m) => m.getApiKey('hf', settings)));
  if (!key) throw new MissingKeyError('hf');
  return key;
}

// --- Speech-to-Text via Groq Whisper ---
export async function transcribeAudio(audioUri: string, settings: AppSettings): Promise<string> {
  const key = await ensureGroq(settings);
  const filename = audioUri.split('/').pop() || 'audio.webm';
  const ext = filename.split('.').pop()?.toLowerCase() || 'webm';
  const mime = ext === 'mp3' ? 'audio/mpeg' : ext === 'wav' ? 'audio/wav' : ext === 'm4a' ? 'audio/mp4' : 'audio/webm';

  const form = new FormData();
  form.append('file', {
    uri: audioUri,
    name: filename,
    type: mime,
  } as any);
  form.append('model', 'whisper-large-v3');
  form.append('language', 'bn');

  const res = await fetch(GROQ_STT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form as any,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Groq STT failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text || '').trim();
}

// --- Conversation via Groq Chat ---
export interface AssistantReply {
  text: string;
  language: 'bn' | 'banglish' | 'en';
  urgent: boolean;
}

export async function generateAssistantReply(
  callerText: string,
  history: ChatMessage[],
  settings: AppSettings,
  contactKnown: boolean,
  callerName: string | null,
): Promise<AssistantReply> {
  const key = await ensureGroq(settings);
  const lang = detectLanguage(callerText);

  const systemPrompt = buildSystemPrompt(settings, contactKnown, callerName, lang);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8).map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.text,
    })),
    { role: 'user', content: callerText },
  ];

  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.6,
      max_tokens: 220,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Groq Chat failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = (data.choices?.[0]?.message?.content || '').trim();
  return {
    text: text || pickFiller(),
    language: detectLanguage(text || callerText),
    urgent: detectUrgent(callerText) || detectUrgent(text),
  };
}

function buildSystemPrompt(
  settings: AppSettings,
  contactKnown: boolean,
  callerName: string | null,
  lang: 'bn' | 'banglish' | 'en',
): string {
  const owner = settings.profileName || 'the user';
  const greeting = settings.greeting;
  const nameGuidance = contactKnown
    ? `The caller is already known as "${callerName}". Do NOT ask for their name. Address them politely.`
    : 'The caller is unknown. Politely ask for their identification once (e.g. "আপনার নাম কি?" or "দয়া করে আপনার পরিচয়টি জানাবেন কি?") before continuing.';

  const langGuidance =
    lang === 'bn'
      ? 'Respond in pure Bangla.'
      : lang === 'banglish'
        ? 'Respond in Banglish (Bangla written in English letters) matching the caller style.'
        : 'Respond in clear Bangla, but if the caller insists on English, mix Banglish naturally.';

  return [
    `You are an AI call assistant answering on behalf of ${owner}.`,
    `${nameGuidance}`,
    `${langGuidance}`,
    `Keep replies short, warm, and helpful (1-3 sentences).`,
    `Default greeting if no context: "${greeting}"`,
    `If the caller mentions danger, hospital, accident, blood, or urgency, treat it as urgent and reassure them you will alert ${owner} immediately.`,
  ].join(' ');
}

// --- Text-to-Speech via Hugging Face ---
export async function synthesizeSpeech(
  text: string,
  settings: AppSettings,
): Promise<string> {
  const token = await ensureHf(settings);
  // Hugging Face inference endpoint for a Bangla/English TTS model.
  const url = 'https://api-inference.huggingface.co/models/facebook/mms-tts-ben';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HF TTS failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const blob = await res.blob();
  // Convert blob to a local file URI so expo-av can play it.
  return writeBlobToCache(blob, 'tts');
}

async function writeBlobToCache(blob: Blob, prefix: string): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const { File, Paths, Directory } = await import('expo-file-system/next');
  const dir = new Directory(Paths.cache, 'alpha-tts');
  if (!dir.exists) dir.create({ intermediates: true });
  const filename = `${prefix}-${Date.now()}.wav`;
  const file = new File(dir, filename);
  const buf = new Uint8Array(arrayBuffer);
  file.write(buf as unknown as string);
  return file.uri;
}
