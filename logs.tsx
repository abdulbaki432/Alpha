import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { Card, EmptyState, Tag } from '@/components/ui';
import { Colors, Radius, Typography } from '@/constants/theme';
import type { CallLog } from '@/types';

export default function CallLogsScreen() {
  const { logs, refreshLogs, deleteLog, clearAllLogs } = useApp();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.callerName.toLowerCase().includes(q) ||
        l.phoneNumber.toLowerCase().includes(q),
    );
  }, [logs, query]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshLogs();
    setRefreshing(false);
  };

  const onClearAll = () => {
    Alert.alert(
      'Clear all logs?',
      'This permanently removes every call record from local storage. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: () => clearAllLogs(),
        },
      ],
    );
  };

  const onDelete = (item: CallLog) => {
    Alert.alert(
      'Delete this log?',
      `Remove the call with ${item.callerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteLog(item.id),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>সম্পূর্ণ বিবরণের তালিকা</Text>
          <Text style={styles.title}>Call History</Text>
        </View>
        {logs.length > 0 ? (
          <Pressable onPress={onClearAll} style={styles.clearBtn}>
            <Trash2 size={16} color={Colors.error[400]} />
            <Text style={styles.clearLabel}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.searchWrap}>
        <Search size={16} color={Colors.text.tertiary} />
        <TextInputLite value={query} onChange={setQuery} placeholder="Search by name or number" />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent[300]} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Phone size={28} color={Colors.text.tertiary} />}
            title="No call logs yet"
            subtitle="Incoming and outgoing calls handled by Alpha will appear here."
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Card style={[styles.card, item.urgent && styles.cardUrgent]}>
            <Pressable
              onPress={() => router.push({ pathname: '/call/[id]', params: { id: item.id } })}
              style={styles.row}
            >
              <View
                style={[
                  styles.dirBadge,
                  item.direction === 'incoming' ? styles.dirIn : styles.dirOut,
                ]}
              >
                {item.direction === 'incoming' ? (
                  <ArrowDownLeft size={16} color={Colors.accent[300]} />
                ) : (
                  <ArrowUpRight size={16} color={Colors.success[400]} />
                )}
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.callerName}
                  </Text>
                  {item.urgent ? (
                    <View style={styles.urgentPill}>
                      <TriangleAlert size={10} color={Colors.urgent[400]} />
                      <Text style={styles.urgentPillText}>Urgent</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.sub}>{item.phoneNumber}</Text>
                <View style={styles.metaRow}>
                  <Tag
                    label={item.direction === 'incoming' ? 'Received' : 'Outgoing'}
                    tone={item.direction === 'incoming' ? 'incoming' : 'outgoing'}
                  />
                  <Text style={styles.meta}>{fmtDuration(item.durationSec)} · {fmtDateTime(item.startedAt)}</Text>
                </View>
              </View>
              <Pressable
                style={styles.callBtn}
                onPress={() => dialNumber(item.phoneNumber)}
                accessibilityLabel="Quick call"
              >
                <Phone size={16} color={Colors.text.inverse} />
              </Pressable>
            </Pressable>
            <View style={styles.actions}>
              <Pressable
                onPress={() => router.push({ pathname: '/call/[id]', params: { id: item.id } })}
                style={styles.actionBtn}
              >
                <Text style={styles.actionLabel}>View details</Text>
              </Pressable>
              <Pressable onPress={() => onDelete(item)} style={styles.actionBtn}>
                <Trash2 size={14} color={Colors.error[400]} />
                <Text style={[styles.actionLabel, { color: Colors.error[400] }]}>Delete</Text>
              </Pressable>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

function dialNumber(phone: string) {
  // tel: links work on native; on web we just inform the user.
  try {
    const { Linking } = require('react-native');
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Cannot dial', `Phone dialing is not available on this device. Number: ${phone}`);
    });
  } catch {
    Alert.alert('Cannot dial', `Phone dialing is not available on this device. Number: ${phone}`);
  }
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TextInputLite({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  // Lightweight local import to avoid a top-level TextInput churn.
  const { TextInput } = require('react-native');
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={Colors.text.tertiary}
      style={styles.searchInput}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg[900] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  eyebrow: { ...Typography.caption, color: Colors.accent[300], letterSpacing: 1, textTransform: 'uppercase' },
  title: { ...Typography.h1, color: Colors.text.primary, marginTop: 4 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    backgroundColor: 'rgba(255,107,107,0.08)',
  },
  clearLabel: { ...Typography.caption, color: Colors.error[400], fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.bg[700],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    padding: 0,
  },
  card: { padding: 14 },
  cardUrgent: { borderColor: 'rgba(255,77,77,0.35)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dirBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirIn: { backgroundColor: 'rgba(62,91,176,0.18)' },
  dirOut: { backgroundColor: 'rgba(63,185,140,0.16)' },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...Typography.h3, color: Colors.text.primary, flex: 1 },
  urgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,77,77,0.18)',
  },
  urgentPillText: { ...Typography.caption, color: Colors.urgent[400], fontWeight: '700' },
  sub: { ...Typography.bodySm, color: Colors.text.tertiary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  meta: { ...Typography.caption, color: Colors.text.tertiary },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopColor: Colors.line,
    borderTopWidth: 1,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionLabel: { ...Typography.bodySm, color: Colors.accent[300], fontWeight: '600' },
});
