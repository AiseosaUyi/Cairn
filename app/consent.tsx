/**
 * Consent gate (store-review requirement): age 17+ self-attestation +
 * explicit acceptance of Terms, Privacy, and the not-therapy disclaimer
 * before any data is entered. Cannot proceed without both.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, space } from '@/design/tokens';
import { Button, Card, Screen } from '@/components/ui';
import { setProfile } from '@/profile';
import { LEGAL, MIN_AGE } from '@/legal/content';

function Check({
  on,
  onToggle,
  children,
}: {
  on: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={onToggle}
      style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: layout.radius.chip,
          borderWidth: 2,
          borderColor: on ? colors.accent : colors.hairline,
          backgroundColor: on ? colors.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        {on && (
          <Text variant="label" color="#FFFFFF">
            ✓
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

function Inner() {
  const router = useRouter();
  const { colors } = useTheme();
  const [age, setAge] = useState(false);
  const [agree, setAgree] = useState(false);
  const ready = age && agree;

  async function accept() {
    if (!ready) return;
    await setProfile({
      ageConfirmed: true,
      consentAcceptedAt: new Date().toISOString(),
    });
    router.replace('/onboarding' as any);
  }

  return (
    <Screen>
      <Text variant="h2">Before we start</Text>

      <Card tone="wash">
        <Text variant="label">What TrueSelf is and isn’t</Text>
        {LEGAL.disclaimer.slice(0, 2).map((p, i) => (
          <Text key={i} variant="body">
            {p}
          </Text>
        ))}
        <Text
          variant="caption"
          color={colors.accent}
          onPress={() => router.push('/legal/disclaimer' as any)}
        >
          Read the full notice
        </Text>
      </Card>

      <Check on={age} onToggle={() => setAge(!age)}>
        <Text variant="body">I am at least {MIN_AGE} years old.</Text>
      </Check>

      <Check on={agree} onToggle={() => setAgree(!agree)}>
        <Text variant="body">
          I understand TrueSelf is a supportive AI companion, not therapy or
          medical care, and I accept the{' '}
          <Text
            variant="body"
            color={colors.accent}
            onPress={() => router.push('/legal/terms' as any)}
          >
            Terms
          </Text>{' '}
          and{' '}
          <Text
            variant="body"
            color={colors.accent}
            onPress={() => router.push('/legal/privacy' as any)}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </Check>

      <View style={{ flex: 1 }} />
      <Button label="I agree — continue" disabled={!ready} onPress={accept} />
      <Button
        label="Get help now"
        variant="ghost"
        onPress={() => router.push('/help' as any)}
      />
    </Screen>
  );
}

export default function Consent() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
