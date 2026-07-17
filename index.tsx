import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Clock,
  Mic,
  Phone,
  Sparkles,
  TriangleAlert,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { Card, SectionTitle, Toggle, Tag } from '@/components/ui';
import { Colors, Radius, Typography } from '@/constants/theme';
import { runAutoCleanIfNeeded, stopUrgentAlarm, triggerUrgentAlarm } from '@/lib/callEngine';

export default function DashboardScreen() {
  const { settings, stats, logs, ready, updateSettings, refreshLogs } = useApp();
  const [processing, setProcessing] = useState(false);
  const [lastClean, setLastClean] = useState<string | null>(null);

  useEffect(() => {
    // Periodic auto-clean check while on the dashboard.
    const t = setInterval(async () => {
      const { removed } = await runAutoCleanIfNeeded(settings);
      if (removed > 0) {
        setLastClean(`Auto-clean removed ${removed} old record${removed === 1 ? '' : 's'}.`);
        await refreshLogs();
      }
    }, 60_000);
    return () => clearInterval(t);
  }, [settings, refreshLogs]);

  const todayUrgentLogs = useMemo(
    () => logs.filter((l) => l.urgent && isToday(l.startedAt)),
    [logs],
  );

  const onToggleActive = async (v: boolean) => {
    if (v && (!settings.groqKey || !settings.hfToken)) {
      Alert.alert(
        'API keys required',
        'Add your Groq API Key and Hugging Face Token in Settings before activating the assistant.',
      );
      return;
    }
    await updateSettings({ assistantActive: v });
  };

  const runDemo = async () => {
    setProcessing(true);
    try {
      // Demo urgent path without real audio.
      await triggerUrgentAlarm();
      Alert.alert(
        'Demo urgent alert',
        'A loud alarm was triggered bypassing silent mode. Tap Stop to silence.',
        [{ text: 'Stop', onPress: () => stopUrgentAlarm() }],
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!ready) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.loadingText}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Assalamu Alaikum</Text>
            <Text style={styles.title}>
              {settings.profileName ? `Hi, ${settings.profileName}` : 'Welcome to Alpha'}
            </Text>
          </View>
          <View style={styles.avatar}>
            <Sparkles color={Colors.accent[300]} size={20} />
          </View>
        </View>

        <Card style={styles.activeCard}>
          <View style={styles.activeRow}>
            <View style={styles.activeLeft}>
              <View
                style={[
                  styles.activeBadge,
                  settings.assistantActive ? styles.activeBadgeOn : styles.activeBadgeOff,
                ]}
              >
                <Activity
                  size={18}
                  color={settings.assistantActive ? Colors.success[400] : Colors.text.tertiary}
                />
              </View>
              <View>
                <Text style={styles.activeTitle}>AI Assistant</Text>
                <Text style={styles.activeStatus}>
                  {settings.assistantActive ? 'Active · answering calls' : 'Inactive'}
                </Text>
              </View>
            </View>
            <Toggle value={settings.assistantActive} onValueChange={onToggleActive} />
          </View>
          {!settings.assistantActive ? (
            <Text style={styles.activeHint}>
              Toggle on to let Alpha answer incoming calls with your custom greeting.
            </Text>
          ) : (
            <Text style={styles.activeHintOn}>
              Listening for incoming calls. Urgent keywords will trigger a loud alarm.
            </Text>
          )}
        </Card>

        <SectionTitle subtitle="আজকের দিনের কলের বিবরণ">
          Today's Call Summary
        </SectionTitle>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.miniIcon, { backgroundColor: 'rgba(62,91,176,0.18)' }]}>
                <Phone size={16} color={Colors.accent[300]} />
              </View>
              <Text style={styles.summaryValue}>{stats.todayCount}</Text>
              <Text style={styles.summaryLabel}>Calls today</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <View style={[styles.miniIcon, { backgroundColor: 'rgba(63,185,140,0.16)' }]}>
                <Clock size={16} color={Colors.success[400]} />
              </View>
              <Text style={styles.summaryValue}>{fmtDuration(stats.todayTotalDurationSec)}</Text>
              <Text style={styles.summaryLabel}>Talk time</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <View style={[styles.miniIcon, { backgroundColor: 'rgba(255,77,77,0.18)' }]}>
                <TriangleAlert size={16} color={Colors.urgent[400]} />
              </View>
              <Text style={styles.summaryValue}>{stats.todayUrgent}</Text>
              <Text style={styles.summaryLabel}>Urgent</Text>
            </View>
          </View>
        </Card>

        <SectionTitle subtitle="Messages processed (lifetime)">Message Counters</SectionTitle>
        <View style={styles.counterRow}>
          <Card style={styles.counterCard}>
            <View style={[styles.miniIcon, { backgroundColor: 'rgba(62,91,176,0.18)' }]}>
              <ArrowDownLeft size={18} color={Colors.accent[300]} />
            </View>
            <Text style={styles.counterValue}>{stats.totalIncoming}</Text>
            <Text style={styles.counterLabel}>Incoming summaries</Text>
          </Card>
          <Card style={styles.counterCard}>
            <View style={[styles.miniIcon, { backgroundColor: 'rgba(63,185,140,0.16)' }]}>
              <ArrowUpRight size={18} color={Colors.success[400]} />
            </View>
            <Text style={styles.counterValue}>{stats.totalOutgoing}</Text>
            <Text style={styles.counterLabel}>Outgoing summaries</Text>
          </Card>
        </View>
        <Card style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Mic size={16} color={Colors.text.secondary} />
            <Text style={styles.totalText}>
              {stats.totalMessages} total messages transcribed
            </Text>
          </View>
        </Card>

        {todayUrgentLogs.length > 0 ? (
          <>
            <SectionTitle subtitle="High-priority calls today">Urgent Alerts</SectionTitle>
            {todayUrgentLogs.map((l) => (
              <Card key={l.id} style={styles.urgentCard}>
                <View style={styles.urgentRow}>
                  <View style={styles.urgentLeft}>
                    <View style={styles.urgentBadge}>
                      <Bell size={14} color={Colors.urgent[400]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.urgentName}>{l.callerName}</Text>
                      <Text style={styles.urgentSub}>
                        {l.phoneNumber} · {fmtTime(l.startedAt)}
                      </Text>
                    </View>
                  </View>
                  <Tag label="Urgent" tone="urgent" />
                </View>
              </Card>
            ))}
          </>
        ) : null}

        {lastClean ? <Text style={styles.cleanNote}>{lastClean}</Text> : null}

        <Pressable onPress={runDemo} style={styles.demoBtn} disabled={processing}>
          <TriangleAlert size={16} color={Colors.text.inverse} />
          <Text style={styles.demoLabel}>Test urgent alarm</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function isToday(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg[900] },
  loading: { flex: 1, backgroundColor: Colors.bg[900], alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...Typography.body, color: Colors.text.secondary },
  scroll: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  eyebrow: { ...Typography.caption, color: Colors.accent[300], letterSpacing: 1, textTransform: 'uppercase' },
  title: { ...Typography.h1, color: Colors.text.primary, marginTop: 4 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bg[700],
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCard: {
    backgroundColor: Colors.bg[700],
    borderColor: Colors.lineStrong,
    marginBottom: 24,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  activeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadgeOn: { backgroundColor: 'rgba(63,185,140,0.16)' },
  activeBadgeOff: { backgroundColor: Colors.bg[500] },
  activeTitle: { ...Typography.h3, color: Colors.text.primary },
  activeStatus: { ...Typography.bodySm, color: Colors.text.secondary, marginTop: 2 },
  activeHint: {
    ...Typography.bodySm,
    color: Colors.text.tertiary,
    marginTop: 14,
  },
  activeHintOn: {
    ...Typography.bodySm,
    color: Colors.success[400],
    marginTop: 14,
  },
  summaryCard: { padding: 18, marginBottom: 24 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 6 },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryValue: { ...Typography.h2, color: Colors.text.primary },
  summaryLabel: { ...Typography.caption, color: Colors.text.tertiary },
  divider: { width: 1, height: 44, backgroundColor: Colors.line },
  counterRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  counterCard: { flex: 1, padding: 16, gap: 10 },
  counterValue: { ...Typography.h2, color: Colors.text.primary },
  counterLabel: { ...Typography.caption, color: Colors.text.tertiary },
  totalCard: { padding: 14, marginBottom: 24 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  totalText: { ...Typography.bodySm, color: Colors.text.secondary },
  urgentCard: { padding: 14, marginBottom: 10, borderColor: 'rgba(255,77,77,0.3)' },
  urgentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  urgentLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  urgentBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,77,77,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentName: { ...Typography.h3, color: Colors.text.primary },
  urgentSub: { ...Typography.caption, color: Colors.text.tertiary, marginTop: 2 },
  cleanNote: {
    ...Typography.bodySm,
    color: Colors.success[400],
    textAlign: 'center',
    marginVertical: 12,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.urgent[500],
    backgroundColor: 'rgba(255,77,77,0.12)',
    marginTop: 8,
  },
  demoLabel: { ...Typography.body, color: Colors.text.inverse, fontWeight: '600' },
});
