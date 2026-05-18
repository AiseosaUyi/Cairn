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
import { healthDomainAvailable } from '@/safety/healthGuardrails';

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
          borderWidth: 1.5,
          borderColor: colors.hairline,
          borderRadius: layout.radius.control,
          paddingHorizontal: space.md,
          color: colors.ink,
          fontFamily: 'Nunito_500Medium',
          fontSize: 17,
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
  const [region, setRegion] = useState<'NG' | 'US' | 'unknown'>('unknown');
  const healthOk = healthDomainAvailable();

  async function enter(mode: Mode) {
    if (mode === 'health' && !healthOk.ok) return;
    const c = coach.trim() || null;
    await setProfile({
      name: name.trim() || null,
      region,
      coachNames: { career: c, health: c },
      lastMode: mode,
      onboarded: true,
    });
    router.replace(`/${mode}` as any);
  }

  return (
    <Screen>
      <View style={{ gap: space.xs, marginTop: space.xl }}>
        <Text variant="display">Let’s set you up</Text>
        <Text variant="voice" soft>
          All optional. The more I know, the more I can actually remember.
        </Text>
      </View>

      <Card>
        <Field label="What should I call you?" value={name} onChange={setName} placeholder="Your name (optional)" />
        <Field
          label="Want to name your companion?"
          value={coach}
          onChange={setCoach}
          placeholder="Leave blank for none"
          hint="By default it’s just “your companion.” Give it a name if you like — you can change this anytime in Settings."
        />
        <Text variant="label" style={{ marginTop: space.sm }}>
          Where are you?
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {(['NG', 'US', 'unknown'] as const).map((r) => (
            <Button
              key={r}
              label={r === 'unknown' ? 'Skip' : r}
              variant={region === r ? 'primary' : 'ghost'}
              onPress={() => setRegion(r)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
        <Text variant="caption" soft>
          Only used to show the right local support. Never shared.
        </Text>
      </Card>

      <View style={{ gap: space.sm }}>
        <Text variant="h3">Which world shall we step into?</Text>
        <Button label="Career" onPress={() => enter('career')} />
        <Button
          label={healthOk.ok ? 'Health' : 'Health  ·  opening soon'}
          variant="soft"
          disabled={!healthOk.ok}
          onPress={() => enter('health')}
        />
        <Text variant="caption" soft>
          {healthOk.ok
            ? 'Switch worlds anytime in Settings. One at a time, on purpose.'
            : healthOk.notice}
        </Text>
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
