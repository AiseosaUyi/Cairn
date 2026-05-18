/**
 * Always-reachable crisis & support resources. Mental-health-adjacent apps
 * must surface help that is easy to find (store-review + ethics). Calm, never
 * alarming, never playful. Linked from every Settings tab and the companion
 * header.
 */
import { useRouter } from 'expo-router';
import { Linking, View } from 'react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { space } from '@/design/tokens';
import { Button, Card, Screen } from '@/components/ui';
import { hotlinesFor } from '@/safety/crisis';

function Inner() {
  const router = useRouter();
  const { colors } = useTheme();
  const all = hotlinesFor('unknown');
  return (
    <Screen>
      <Text variant="h2" color={colors.crisis}>
        If you need help now
      </Text>
      <Text variant="voice">
        TrueSelf is a companion, not an emergency service. If you are in danger
        or thinking about harming yourself, please reach a person now. You
        deserve real support and it is available.
      </Text>
      <Card>
        <Text variant="label" color={colors.crisis}>
          Immediate danger
        </Text>
        <Text variant="body">
          Contact your local emergency number right away.
        </Text>
      </Card>
      {all.map((h) => (
        <Card key={h.name}>
          <Text variant="label" color={colors.crisis}>
            {h.name} ({h.region})
          </Text>
          <Text variant="body">{h.contact}</Text>
          <Text variant="caption" soft>
            {h.note}
          </Text>
        </Card>
      ))}
      <Button
        label="More mental-health resources"
        variant="ghost"
        onPress={() =>
          Linking.openURL('https://findahelpline.com').catch(() => {})
        }
      />
      <View style={{ height: space.sm }} />
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

export default function Help() {
  return (
    <ThemeProvider mode="health">
      <Inner />
    </ThemeProvider>
  );
}
