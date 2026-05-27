/**
 * Check-in tab — warm, never clinical. Big friendly pickers, kind copy.
 * Feeds mood/energy + the garden. No score, no judgement, no guilt.
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, space, type Mode } from '@/design/tokens';
import { Button, Card, Rise, Screen } from '@/components/ui';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { motion } from '@/design/tokens';
import { getStore } from '@/memory/store';
import { newId } from '@/memory/schema';
import { blendMood, transcriptSentiment } from '@/companion/state';

// Mood pickers are clean numeric squares with a selected-state fill.
// Emoji faces felt cute; the act of picking is the data, not the icon.
function Picker({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{label}</Text>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n;
          return (
            <MotiView
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label} ${n} of 5`}
              onTouchEnd={() => onChange(n)}
              animate={{ scale: on ? 1 : 0.98 }}
              transition={{ type: 'timing', duration: motion.duration.short, easing: Easing.out(Easing.quad) }}
              style={{
                flex: 1,
                minHeight: layout.controlHeight,
                borderRadius: layout.radius.control,
                backgroundColor: on ? colors.accent : colors.card,
                borderWidth: 1,
                borderColor: on ? colors.accent : colors.hairline,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="h3" color={on ? '#FFFFFF' : colors.ink}>
                {n}
              </Text>
            </MotiView>
          );
        })}
      </View>
      <Text variant="caption" soft>
        {label === 'Mood' ? '1 = struggling · 5 = good' : '1 = drained · 5 = full'}
      </Text>
    </View>
  );
}

export default function CheckIn() {
  const { mode } = useLocalSearchParams<{ mode: Mode }>();
  const { colors } = useTheme();
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setBusy(true);
    const blended = blendMood(mood, energy, transcriptSentiment(note));
    const store = await getStore();
    await store.addMood({
      id: newId(),
      mode,
      mood: blended.mood,
      energy: blended.energy,
      note: note.trim() || null,
      createdAt: Date.now(),
    });
    setBusy(false);
    setSaved(true);
  }

  if (saved) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: space.md }}>
          <Rise>
            <Text variant="h2">Got it. Thank you for being honest.</Text>
          </Rise>
          <Rise delay={80}>
            <Text variant="voice" soft>
              That’s logged and it’s part of your garden now — not a score, just
              the truth of today. Come back whenever. No streak, nothing owed.
            </Text>
          </Rise>
          <Rise delay={160}>
            <Button
              label="Check in again"
              variant="ghost"
              onPress={() => {
                setSaved(false);
                setMood(3);
                setEnergy(3);
                setNote('');
              }}
            />
          </Rise>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Rise>
        <View style={{ gap: space.xs }}>
          <Text variant="h2">How are you, really?</Text>
          <Text variant="voice" soft>
            Not the polite version. Just where you actually are today — that’s
            enough.
          </Text>
        </View>
      </Rise>
      <Rise delay={60}>
        <Card>
          <Picker label="Mood" value={mood} onChange={setMood} />
          <Picker label="Energy" value={energy} onChange={setEnergy} />
        </Card>
      </Rise>
      <Rise delay={120}>
        <View style={{ gap: space.xs }}>
          <Text variant="label">Want to say anything about today?</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional — a sentence is plenty"
            placeholderTextColor={colors.inkSoft}
            accessibilityLabel="Note about today"
            multiline
            style={{
              minHeight: 96,
              borderWidth: 1,
              borderColor: colors.hairline,
              borderRadius: layout.radius.control,
              padding: space.md,
              color: colors.ink,
              fontFamily: 'Inter_400Regular',
              fontSize: 16,
              backgroundColor: colors.card,
            }}
          />
        </View>
      </Rise>
      <Rise delay={180}>
        <Button label="Save today" busy={busy} onPress={submit} />
      </Rise>
    </Screen>
  );
}
