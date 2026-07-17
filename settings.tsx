import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  User as UserIcon,
  MessageSquareText,
  CalendarClock,
  ShieldCheck,
  Save,
  Sparkles,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { Card, SectionTitle, PrimaryButton, Toggle } from '@/components/ui';
import { Colors, Radius, Typography } from '@/constants/theme';

export default function SettingsScreen() {
  const { settings, updateSettings, clearAllLogs, logs } = useApp();
  const [profileName, setProfileName] = useState(settings.profileName);
  const [greeting, setGreeting] = useState(settings.greeting);
  const [groqKey, setGroqKey] = useState(settings.groqKey);
  const [hfToken, setHfToken] = useState(settings.hfToken);
  const [showGroq, setShowGroq] = useState(false);
  const [showHf, setShowHf] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProfileName(settings.profileName);
    setGreeting(settings.greeting);
    setGroqKey(settings.groqKey);
    setHfToken(settings.hfToken);
  }, [settings]);

  const onSaveAll = async () => {
    setSaving(true);
    try {
      await updateSettings({
        profileName: profileName.trim(),
        greeting: greeting.trim(),
        groqKey: groqKey.trim(),
        hfToken: hfToken.trim(),
      });
      Alert.alert('Saved', 'Your settings and API keys were saved securely on this device.');
    } finally {
      setSaving(false);
    }
  };

  const onAutoCleanChange = async (days: 15 | 30) => {
    await updateSettings({ autoCleanDays: days, lastCleanAt: null });
  };

  const onClearData = () => {
    Alert.alert(
      'Erase all call data?',
      'This permanently deletes every call log, transcript, and audio reference from local storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Erase', style: 'destructive', onPress: () => clearAllLogs() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.eyebrow}>সেটিংস</Text>
            <Text style={styles.title}>Settings</Text>
          </View>

          <SectionTitle subtitle="Personalize your assistant">Profile</SectionTitle>
          <Card style={styles.card}>
            <View style={styles.fieldRow}>
              <UserIcon size={18} color={Colors.accent[300]} />
              <Text style={styles.fieldLabel}>Profile Name</Text>
            </View>
            <TextInput
              value={profileName}
              onChangeText={setProfileName}
              placeholder="e.g. Rahim Uddin"
              placeholderTextColor={Colors.text.tertiary}
              style={styles.input}
            />
          </Card>

          <SectionTitle subtitle="The first automated greeting the AI uses">
            Welcome Greeting
          </SectionTitle>
          <Card style={styles.card}>
            <View style={styles.fieldRow}>
              <MessageSquareText size={18} color={Colors.accent[300]} />
              <Text style={styles.fieldLabel}>Greeting</Text>
            </View>
            <TextInput
              value={greeting}
              onChangeText={setGreeting}
              placeholder="Assalamu Alaikum. I am the AI Assistant..."
              placeholderTextColor={Colors.text.tertiary}
              multiline
              style={[styles.input, styles.textarea]}
            />
            <Pressable
              onPress={() =>
                setGreeting(
                  `Assalamu Alaikum / Namaskar. I am ${profileName || 'the user'}'s AI Assistant. Please tell me why you are calling and I will help you.`,
                )
              }
              style={styles.autofillBtn}
            >
              <Sparkles size={12} color={Colors.accent[300]} />
              <Text style={styles.autofillLabel}>Use default with my name</Text>
            </Pressable>
          </Card>

          <SectionTitle subtitle="Keys are stored securely on this device only">
            AI Configuration
          </SectionTitle>
          <Card style={styles.card}>
            <View style={styles.fieldRow}>
              <KeyRound size={18} color={Colors.accent[300]} />
              <Text style={styles.fieldLabel}>Groq API Key</Text>
              <Pressable onPress={() => setShowGroq((s) => !s)} style={styles.eyeBtn}>
                {showGroq ? (
                  <EyeOff size={16} color={Colors.text.tertiary} />
                ) : (
                  <Eye size={16} color={Colors.text.tertiary} />
                )}
              </Pressable>
            </View>
            <TextInput
              value={groqKey}
              onChangeText={setGroqKey}
              placeholder="gsk_..."
              placeholderTextColor={Colors.text.tertiary}
              secureTextEntry={!showGroq}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <View style={[styles.fieldRow, { marginTop: 14 }]}>
              <KeyRound size={18} color={Colors.accent[300]} />
              <Text style={styles.fieldLabel}>Hugging Face Token</Text>
              <Pressable onPress={() => setShowHf((s) => !s)} style={styles.eyeBtn}>
                {showHf ? (
                  <EyeOff size={16} color={Colors.text.tertiary} />
                ) : (
                  <Eye size={16} color={Colors.text.tertiary} />
                )}
              </Pressable>
            </View>
            <TextInput
              value={hfToken}
              onChangeText={setHfToken}
              placeholder="hf_..."
              placeholderTextColor={Colors.text.tertiary}
              secureTextEntry={!showHf}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <View style={styles.securityNote}>
              <ShieldCheck size={14} color={Colors.success[400]} />
              <Text style={styles.securityText}>
                Keys never leave your device. They are used only to call Groq and Hugging Face directly.
              </Text>
            </View>
          </Card>

          <PrimaryButton label="Save settings" onPress={onSaveAll} loading={saving} />

          <SectionTitle subtitle="Automatically delete old records and transcripts">
            Auto-Clean Scheduler
          </SectionTitle>
          <Card style={styles.card}>
            <View style={styles.fieldRow}>
              <CalendarClock size={18} color={Colors.accent[300]} />
              <Text style={styles.fieldLabel}>Delete records older than</Text>
            </View>
            <View style={styles.radioRow}>
              <RadioOption
                label="15 Days"
                selected={settings.autoCleanDays === 15}
                onSelect={() => onAutoCleanChange(15)}
              />
              <RadioOption
                label="30 Days"
                selected={settings.autoCleanDays === 30}
                onSelect={() => onAutoCleanChange(30)}
              />
            </View>
            <Text style={styles.helpText}>
              Alpha runs this check in the background. Records older than the selected window are permanently removed from local storage.
            </Text>
          </Card>

          <SectionTitle subtitle="Danger zone">Data Management</SectionTitle>
          <Card style={[styles.card, styles.dangerCard]}>
            <View style={styles.fieldRow}>
              <Trash2 size={18} color={Colors.error[400]} />
              <Text style={styles.fieldLabel}>Erase all call data</Text>
            </View>
            <Text style={styles.helpText}>
              {logs.length} record{logs.length === 1 ? '' : 's'} stored locally. This action cannot be undone.
            </Text>
            <Pressable onPress={onClearData} style={styles.dangerBtn}>
              <Trash2 size={14} color={Colors.text.inverse} />
              <Text style={styles.dangerBtnLabel}>Erase everything</Text>
            </Pressable>
          </Card>

          <Text style={styles.version}>Alpha · AI Call Assistant v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RadioOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.radio, selected && styles.radioSelected]}
    >
      <View style={[styles.radioDot, selected && styles.radioDotSelected]} />
      <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg[900] },
  scroll: { padding: 20, paddingBottom: 48 },
  header: { marginBottom: 22 },
  eyebrow: { ...Typography.caption, color: Colors.accent[300], letterSpacing: 1, textTransform: 'uppercase' },
  title: { ...Typography.h1, color: Colors.text.primary, marginTop: 4 },
  card: { padding: 16, marginBottom: 16 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  fieldLabel: { ...Typography.h3, color: Colors.text.primary },
  eyeBtn: { marginLeft: 'auto', padding: 4 },
  input: {
    ...Typography.body,
    color: Colors.text.primary,
    backgroundColor: Colors.bg[600],
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  autofillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(62,91,176,0.16)',
  },
  autofillLabel: { ...Typography.caption, color: Colors.accent[300], fontWeight: '600' },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(63,185,140,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(63,185,140,0.25)',
  },
  securityText: { flex: 1, ...Typography.caption, color: Colors.success[400] },
  radioRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  radio: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.bg[600],
  },
  radioSelected: {
    borderColor: Colors.accent[400],
    backgroundColor: 'rgba(62,91,176,0.16)',
  },
  radioDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.text.tertiary,
  },
  radioDotSelected: {
    borderColor: Colors.accent[300],
    backgroundColor: Colors.accent[500],
  },
  radioLabel: { ...Typography.body, color: Colors.text.secondary },
  radioLabelSelected: { color: Colors.text.primary, fontWeight: '600' },
  helpText: { ...Typography.bodySm, color: Colors.text.tertiary, marginTop: 6 },
  dangerCard: { borderColor: 'rgba(255,107,107,0.3)' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.error[500],
  },
  dangerBtnLabel: { ...Typography.body, color: Colors.text.inverse, fontWeight: '700' },
  version: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: 12,
  },
});
