import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Download, Pause, Play, RotateCcw } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

export function AudioPlayer({
  uri,
  onDownload,
  savedToPublic,
}: {
  uri: string | null;
  onDownload?: () => void;
  savedToPublic?: boolean;
}) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playRef = useRef(false);

  useEffect(() => {
    return () => {
      sound?.unloadAsync().catch(() => {});
    };
  }, [sound]);

  const load = async () => {
    if (!uri) {
      setError('No audio file available for this call.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      const { sound: s } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, progressUpdateIntervalMillis: 250 },
        (status) => {
          if (!status.isLoaded) return;
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);
          if (!status.didJustFinish && !status.isPlaying && playRef.current) {
            // still loading or paused externally
          }
          if (status.didJustFinish) {
            setPlaying(false);
            setPosition(0);
            playRef.current = false;
          }
        },
      );
      setSound(s);
    } catch (e) {
      setError('Unable to load audio. The file may be missing on this device.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    if (!sound) {
      await load();
      return;
    }
    if (playing) {
      await sound.pauseAsync();
      setPlaying(false);
      playRef.current = false;
    } else {
      await sound.playAsync();
      setPlaying(true);
      playRef.current = true;
    }
  };

  const restart = async () => {
    if (!sound) return;
    await sound.setPositionAsync(0);
    setPosition(0);
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable onPress={toggle} style={styles.playBtn} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : playing ? (
            <Pause size={22} color={Colors.text.inverse} />
          ) : (
            <Play size={22} color={Colors.text.inverse} />
          )}
        </Pressable>
        <Pressable onPress={restart} style={styles.iconBtn}>
          <RotateCcw size={18} color={Colors.text.secondary} />
        </Pressable>
        <View style={styles.progressWrap}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, progress * 100)}%` }]} />
          </View>
          <View style={styles.times}>
            <Text style={styles.time}>{fmt(position)}</Text>
            <Text style={styles.time}>{fmt(duration)}</Text>
          </View>
        </View>
        {onDownload ? (
          <Pressable onPress={onDownload} style={styles.iconBtn}>
            <Download size={18} color={savedToPublic ? Colors.success[400] : Colors.text.secondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {savedToPublic ? (
        <Text style={styles.saved}>Saved to public storage</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.bg[600],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.accent[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bg[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
  },
  progressWrap: { flex: 1, gap: 6 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.bg[400],
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    backgroundColor: Colors.accent[400],
    borderRadius: 3,
  },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { ...Typography.caption, color: Colors.text.tertiary, fontFamily: 'Inter-Regular' },
  error: {
    ...Typography.bodySm,
    color: Colors.error[400],
    marginTop: 10,
  },
  saved: {
    ...Typography.caption,
    color: Colors.success[400],
    marginTop: 8,
  },
});
