import React, { ReactNode } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Toggle({
  value,
  onValueChange,
  disabled,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[styles.toggle, value && styles.toggleOn, disabled && styles.toggleDisabled]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

export function Tag({
  label,
  tone,
}: {
  label: string;
  tone: 'incoming' | 'outgoing' | 'urgent' | 'neutral';
}) {
  const palette = {
    incoming: { bg: 'rgba(62,91,176,0.18)', fg: Colors.accent[100], border: Colors.accent[400] },
    outgoing: { bg: 'rgba(63,185,140,0.16)', fg: Colors.success[400], border: Colors.success[500] },
    urgent: { bg: 'rgba(255,77,77,0.18)', fg: Colors.urgent[400], border: Colors.urgent[500] },
    neutral: { bg: 'rgba(255,255,255,0.06)', fg: Colors.text.secondary, border: Colors.line },
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.tagText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  destructive,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primary,
        pressed && styles.primaryPressed,
        (disabled || loading) && styles.primaryDisabled,
        destructive && styles.primaryDestructive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.text.inverse} />
      ) : (
        <Text style={styles.primaryLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.ghost, pressed && styles.ghostPressed]}
    >
      {icon}
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg[700],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 18,
  },
  sectionTitleWrap: { marginBottom: 10 },
  sectionTitle: { ...Typography.h3, color: Colors.text.primary },
  sectionSubtitle: { ...Typography.bodySm, color: Colors.text.tertiary, marginTop: 2 },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: Radius.pill,
    backgroundColor: Colors.bg[500],
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: Colors.accent[500],
    borderColor: Colors.accent[400],
  },
  toggleDisabled: { opacity: 0.5 },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.text.secondary,
    alignSelf: 'flex-start',
  },
  knobOn: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  tagText: { ...Typography.caption, fontWeight: '600' },
  primary: {
    backgroundColor: Colors.accent[500],
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: { backgroundColor: Colors.accent[400] },
  primaryDisabled: { opacity: 0.5 },
  primaryDestructive: { backgroundColor: Colors.error[500] },
  primaryLabel: {
    ...Typography.h3,
    color: Colors.text.inverse,
    fontWeight: '700',
  },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    gap: 8,
  },
  ghostPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  ghostLabel: { ...Typography.body, color: Colors.text.primary },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.bg[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { ...Typography.h2, color: Colors.text.primary },
  emptySubtitle: {
    ...Typography.bodySm,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: 6,
  },
});
