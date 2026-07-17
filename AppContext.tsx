import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AppSettings, CallLog, DashboardStats } from '@/types';
import { loadLogs, loadSettings, saveLogs, saveSettings } from '@/lib/storage';
import { runAutoCleanIfNeeded, setRuntimeSettings } from '@/lib/callEngine';

interface AppContextValue {
  settings: AppSettings;
  logs: CallLog[];
  stats: DashboardStats;
  ready: boolean;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  refreshLogs: () => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  clearAllLogs: () => Promise<void>;
  markSavedToPublic: (id: string) => Promise<void>;
}

const defaultStats: DashboardStats = {
  todayCount: 0,
  todayIncoming: 0,
  todayOutgoing: 0,
  todayUrgent: 0,
  todayTotalDurationSec: 0,
  totalIncoming: 0,
  totalOutgoing: 0,
  totalMessages: 0,
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [ready, setReady] = useState(false);
  const bootRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadSettings();
      let lg = await loadLogs();
      const { settings: cleaned, removed } = await runAutoCleanIfNeeded(s);
      if (removed > 0) lg = await loadLogs();
      if (cancelled) return;
      setSettings(cleaned);
      setLogs(lg);
      setRuntimeSettings(cleaned);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-sync runtime settings whenever settings change.
  useEffect(() => {
    if (settings) setRuntimeSettings(settings);
  }, [settings]);

  const updateSettings = async (patch: Partial<AppSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
    setRuntimeSettings(next);
  };

  const refreshLogs = async () => {
    const lg = await loadLogs();
    setLogs(lg);
  };

  const deleteLog = async (id: string) => {
    const next = logs.filter((l) => l.id !== id);
    setLogs(next);
    await saveLogs(next);
  };

  const clearAllLogs = async () => {
    setLogs([]);
    await saveLogs([]);
  };

  const markSavedToPublic = async (id: string) => {
    const next = logs.map((l) => (l.id === id ? { ...l, savedToPublic: true } : l));
    setLogs(next);
    await saveLogs(next);
  };

  const stats = useMemo<DashboardStats>(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let todayCount = 0,
      todayIncoming = 0,
      todayOutgoing = 0,
      todayUrgent = 0,
      todayTotalDurationSec = 0,
      totalIncoming = 0,
      totalOutgoing = 0,
      totalMessages = 0;
    for (const l of logs) {
      if (l.startedAt >= startOfToday) {
        todayCount++;
        if (l.direction === 'incoming') todayIncoming++;
        else todayOutgoing++;
        if (l.urgent) todayUrgent++;
        todayTotalDurationSec += l.durationSec;
      }
      if (l.direction === 'incoming') totalIncoming++;
      else totalOutgoing++;
      totalMessages += l.transcript.length;
    }
    return {
      todayCount,
      todayIncoming,
      todayOutgoing,
      todayUrgent,
      todayTotalDurationSec,
      totalIncoming,
      totalOutgoing,
      totalMessages,
    };
  }, [logs]);

  const value: AppContextValue = {
    settings: settings || ({} as AppSettings),
    logs,
    stats,
    ready,
    updateSettings,
    refreshLogs,
    deleteLog,
    clearAllLogs,
    markSavedToPublic,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
