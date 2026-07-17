import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  CheckCheck,
  Download,
  Phone,
  Trash2,
  TriangleAlert,
  User as UserIcon,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Card, SectionTitle, Tag, GhostButton, PrimaryButton } from '@/components/ui';
import { Colors, Radius, Typography } from '@/constants/theme';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { File, Paths, Directory } from 'expo-file-system/next';

export default function CallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { logs, markSavedToPublic, deleteLog } = useApp();
  const [saving, setSaving] = useState(false);

  const log = useMemo(() => logs.find((l) => l.id === id), [logs, id]);

  if (!log) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>This call record no longer exists.</Text>
          <GhostButton label="Back to logs" onPress={() => router.replace('/(tabs)/logs')} />
        </View>
      </SafeAreaView>
    );
  }

  const onDownload = async () => {
    if (!log.audioUri) {
      Alert.alert('No audio', 'There is no recorded audio file attached to this call.');
      return;
    }
    setSaving(true);
    try {
      if (Platform.OS === 'web') {
        // Trigger a browser download by creating an anchor element.
        const a = document.createElement('a');
        a.href = log.audioUri;
        a.download = `${sanitize(log.callerName)}-${log.startedAt}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await markSavedToPublic(log.id);
        Alert.alert('Downloaded', 'Audio saved via your browser.');
        return;
      }
      // On native, copy the file to a public Media Library album.
      const perm = await MediaLibrary.requestPermissionsAsync(false);
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Grant media library access to save the recording.');
        return;
      }
      // Copy into a stable cache file first (in case source is a temp URI).
      const src = log.audioUri;
      const outDir = new Directory(Paths.cache, 'alpha-exports');
      if (!outDir.exists) outDir.create({ intermediates: true });
      const outFile = new File(outDir, `${sanitize(log.callerName)}-${log.startedAt}.wav`);
      const srcFile = new File(src);
      srcFile.copy(outFile);
      const asset = await MediaLibrary.createAssetAsync(outFile.uri);
      const album = await MediaLibrary.getAlbumAsync('Alpha Call Assistant');
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync(asset, album, false);
      } else {
        await MediaLibrary.createAlbumAsync('Alpha Call Assistant', asset, false);
      }
      await markSavedToPublic(log.id);
      Alert.alert('Saved', 'Audio saved to your phone under "Alpha Call Assistant".');
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Unknown error while saving audio.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Delete this log?',
      'This permanently removes the call record and its transcript.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLog(log.id);
            router.replace('/(tabs)/logs');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={styles.delBtn}>
            <Trash2 size={16} color={Colors.error[400]} />
          </Pressable>
        </View>

        <View style={styles.titleRow}>
          <View
            style={[
              styles.dirBadge,
              log.direction === 'incoming' ? styles.dirIn : styles.dirOut,
            ]}
          >
            {log.direction === 'incoming' ? (
              <ArrowDownLeft size={18} color={Colors.accent[300]} />
            ) : (
              <ArrowUpRight size={18} color={Colors.success[400]} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{log.callerName}</Text>
            <Text style={styles.sub}>{log.phoneNumber}</Text>
          </View>
          {log.urgent ? <Tag label="Urgent" tone="urgent" /> : null}
        </View>

        <View style={styles.metaRow}>
          <Tag
            label={log.direction === 'incoming' ? 'Received' : 'Outgoing'}
            tone={log.direction === 'incoming' ? 'incoming' : 'outgoing'}
          />
          <Text style={styles.metaText}>
            {fmtDuration(log.durationSec)} · {fmtDateTime(log.startedAt)}
          </Text>
          {log.contactKnown ? (
            <Tag label="Known contact" tone="neutral" />
          ) : (
            <Tag label="Unknown caller" tone="neutral" />
          )}
        </View>

        <SectionTitle subtitle="Listen to the recorded conversation">
          Audio Player
        </SectionTitle>
        <AudioPlayer
          uri={log.audioUri}
          onDownload={onDownload}
          savedToPublic={log.savedToPublic}
        />
        <PrimaryButton
          label={saving ? 'Saving…' : log.savedToPublic ? 'Saved to public storage' : 'Download to phone'}
          onPress={onDownload}
          loading={saving}
          disabled={log.savedToPublic || !log.audioUri}
        />

        <SectionTitle subtitle="Chat preview / transcription">
          Conversation
        </SectionTitle>
        <Card style={styles.transcriptCard}>
          {log.transcript.length === 0 ? (
            <Text style={styles.emptyText}>No transcript available.</Text>
          ) : (
            <View style={styles.chat}>
              {log.transcript.map((m) => {
                const isCaller = m.role === 'caller';
                return (
                  <View
                    key={m.id}
                    style={[styles.bubbleRow, isCaller ? styles.bubbleRowCaller : styles.bubbleRowAssistant]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        isCaller ? styles.bubbleCaller : styles.bubbleAssistant,
                      ]}
                    >
                      <View style={styles.bubbleHeader}>
                        {isCaller ? (
                          <UserIcon size={12} color={Colors.accent[300]} />
                        ) : (
                          <Bot size={12} color={Colors.success[400]} />
                        )}
                        <Text style={styles.bubbleRole}>
                          {isCaller ? 'Caller' : 'Alpha AI'}
                        </Text>
                        <Text style={styles.bubbleTime}>{fmtTime(m.ts)}</Text>
                      </View>
                      <Text style={styles.bubbleText}>{m.text}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        <View style={styles.footActions}>
          <GhostButton
            label="Quick call"
            onPress={() => dialNumber(log.phoneNumber)}
            icon={<Phone size={16} color={Colors.text.primary} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function dialNumber(phone: string) {
  try {
    const { Linking } = require('react-native');
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Cannot dial', `Phone dialing is not available on this device. Number: ${phone}`);
    });
  } catch {
    Alert.alert('Cannot dial', `Phone dialing is not available on this device. Number: ${phone}`);
  }
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) || 'call';
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

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg[900] },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.pill, backgroundColor: Colors.bg[700] },
  backLabel: { ...Typography.bodySm, color: Colors.accent[300], fontWeight: '600' },
  delBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  dirBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirIn: { backgroundColor: 'rgba(62,91,176,0.18)' },
  dirOut: { backgroundColor: 'rgba(63,185,140,0.16)' },
  name: { ...Typography.h1, color: Colors.text.primary },
  sub: { ...Typography.bodySm, color: Colors.text.tertiary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  metaText: { ...Typography.bodySm, color: Colors.text.secondary },
  transcriptCard: { padding: 14, marginBottom: 24 },
  emptyText: { ...Typography.body, color: Colors.text.tertiary, textAlign: 'center', paddingVertical: 20 },
  chat: { gap: 10 },
  bubbleRow: { flexDirection: 'row', marginBottom: 4 },
  bubbleRowCaller: { justifyContent: 'flex-start' },
  bubbleRowAssistant: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '85%',
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
  },
  bubbleCaller: {
    backgroundColor: 'rgba(62,91,176,0.16)',
    borderColor: 'rgba(126,150,214,0.3)',
  },
  bubbleAssistant: {
    backgroundColor: 'rgba(63,185,140,0.14)',
    borderColor: 'rgba(63,185,140,0.3)',
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bubbleRole: { ...Typography.caption, color: Colors.text.secondary, fontWeight: '600' },
  bubbleTime: { ...Typography.caption, color: Colors.text.tertiary, marginLeft: 'auto' },
  bubbleText: { ...Typography.body, color: Colors.text.primary },
  footActions: { marginTop: 8 },
});
