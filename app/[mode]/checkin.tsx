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
import { Button, Card, Screen } from '@/components/ui';
import { getStore } from '@/memory/store';
import { newId } from '@/memory/schema';
import { blendMood, transcriptSentiment } from '@/companion/state';

const FACE = ['😞', '🙁', '😐', '🙂', '😊'];

function Picker({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{label}</Text>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n;
          return (
            <View
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label} ${n} of 5`}
              onTouchEnd={() => onChange(n)}
              style={{
                flex: 1,
                minHeight: layout.controlHeight,
                borderRadius: layout.radius.control,
                backgroundColor: on ? colors.accent : colors.card,
                borderWidth: 1.5,
                borderColor: on ? colors.accent : colors.hairline,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="h3" color={on ? '#FFFFFF' : colors.ink}>
                {FACE[n - 1]}
              </Text>
            </View>
          );
        })}
      </View>
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
          <Text variant="h2">Got it. Thank you for being honest.</Text>
          <Text variant="voice" soft>
            That’s logged and it’s part of your garden now — not a score, just
            the truth of today. Come back whenever. No streak, nothing owed.
          </Text>
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
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <Text variant="h2">How are you, really?</Text>
        <Text variant="voice" soft>
          Not the polite version. Just where you actually are today — that’s
          enough.
        </Text>
      </View>
      <Card>
        <Picker label="Mood" value={mood} onChange={setMood} />
        <Picker label="Energy" value={energy} onChange={setEnergy} />
      </Card>
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
            borderWidth: 1.5,
            borderColor: colors.hairline,
            borderRadius: layout.radius.control,
            padding: space.md,
            color: colors.ink,
            fontFamily: 'Nunito_500Medium',
            fontSize: 17,
            backgroundColor: colors.card,
          }}
        />
      </View>
      <Button label="Save today" busy={busy} onPress={submit} />
    </Screen>
  );
}
