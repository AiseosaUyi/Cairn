/**
 * Legal/safety reader. One screen renders Privacy, Terms, or Disclaimer.
 * Reachable from consent and from Settings (store-review requirement: legal
 * must be in-app, not just a URL).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemeProvider } from '@/design/theme';
import { Text } from '@/design/Text';
import { space } from '@/design/tokens';
import { Button, Screen } from '@/components/ui';
import { LEGAL, LEGAL_TITLES, type LegalDoc } from '@/legal/content';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const router = useRouter();
  const key = (['privacy', 'terms', 'disclaimer'] as LegalDoc[]).includes(
    doc as LegalDoc,
  )
    ? (doc as LegalDoc)
    : 'privacy';

  return (
    <ThemeProvider mode="career">
      <Screen>
        <Text variant="h2">{LEGAL_TITLES[key]}</Text>
        {LEGAL[key].map((para, i) => (
          <Text key={i} variant="body" style={{ marginBottom: space.xs }}>
            {para}
          </Text>
        ))}
        <Button label="Done" variant="ghost" onPress={() => router.back()} />
      </Screen>
    </ThemeProvider>
  );
}
