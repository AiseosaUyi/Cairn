/**
 * Onboarding — warm hello. Name (optional), region (optional), an OPTIONAL
 * companion name (default: none — it stays "your companion" unless you name
 * it), then choose a world (mode-as-place).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, space, type Mode } from '@/design/tokens';
import { Button, Card, Screen } from '@/components/ui';
import { setProfile } from '@/profile';

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
  hint?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkSoft}
        accessibilityLabel={label}
        style={{
          minHeight: layout.controlHeight,
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: layout.radius.control,
          paddingHorizontal: space.md,
          color: colors.ink,
          fontFamily: 'Inter_400Regular',
          fontSize: 16,
          backgroundColor: colors.canvas,
        }}
      />
      {hint ? (
        <Text variant="caption" soft>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function Inner() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [coach, setCoach] = useState('');

  async function enter() {
    const c = coach.trim() || null;
    await setProfile({
      name: name.trim() || null,
      coachNames: { career: c, health: c },
      lastMode: 'career' as Mode,
      onboarded: true,
    });
    // Companion was already picked as a step inside the welcome carousel,
    // so this is just the small profile capture and we drop straight into
    // the app. No region collected — wasn't being used downstream.
    router.replace('/career' as any);
  }

  return (
    <Screen>
      <View style={{ gap: space.sm, marginTop: space.xl }}>
        <Text variant="display">Last thing.</Text>
        <Text variant="lede" soft>
          Both optional. Helps your companion remember you — and call you
          something if you'd like.
        </Text>
      </View>

      <Card>
        <Field label="What should I call you?" value={name} onChange={setName} placeholder="Your name (optional)" />
        <Field
          label="Want to name your companion?"
          value={coach}
          onChange={setCoach}
          placeholder="Leave blank for none"
          hint="Default is just “your companion.” Name it if you like — change anytime in Settings."
        />
      </Card>

      <View style={{ gap: space.sm }}>
        <Button label="Open the app" onPress={enter} />
      </View>
    </Screen>
  );
}

export default function Onboarding() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
