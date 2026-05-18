/**
 * Welcome — the warm front door / in-app landing. Says what TrueSelf is in
 * one breath, links to legal, leads into consent. Replaces a marketing site
 * for store purposes; the Privacy/Terms URLs the stores require are these
 * in-app screens (also exposable as web routes via expo-router web).
 */
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { space } from '@/design/tokens';
import { Button, Card, Screen } from '@/components/ui';

function Inner() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Screen>
      <View style={{ gap: space.sm, marginTop: space['3xl'] }}>
        <Text variant="display">TrueSelf</Text>
        <Text variant="voice" soft>
          A warm companion that actually remembers you. It checks in, holds you
          to what you said you’d do, and grows a little garden of the things you
          got through — at your pace, never a streak you can lose.
        </Text>
      </View>

      <Card tone="wash">
        <Text variant="label">Two worlds, one companion</Text>
        <Text variant="body">
          Career — momentum, follow-through, the next real step. Health — a
          gentle guide through being unwell (navigation and support, never
          medical advice).
        </Text>
      </Card>

      <View style={{ flex: 1 }} />

      <Button label="Get started" onPress={() => router.push('/consent' as any)} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.lg }}>
        <Text
          variant="caption"
          color={colors.accent}
          onPress={() => router.push('/legal/privacy' as any)}
        >
          Privacy
        </Text>
        <Text
          variant="caption"
          color={colors.accent}
          onPress={() => router.push('/legal/terms' as any)}
        >
          Terms
        </Text>
        <Text
          variant="caption"
          color={colors.accent}
          onPress={() => router.push('/help' as any)}
        >
          Get help now
        </Text>
      </View>
    </Screen>
  );
}

export default function Welcome() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
