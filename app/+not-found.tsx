/** Edge case: unknown route. Warm, not a dead-end. */
import { Link } from 'expo-router';
import { ThemeProvider } from '@/design/theme';
import { Text } from '@/design/Text';
import { useTheme } from '@/design/theme';
import { Screen } from '@/components/ui';

function Inner() {
  const { colors } = useTheme();
  return (
    <Screen>
      <Text variant="h2">This page wandered off</Text>
      <Text variant="voice" soft>
        Nothing’s broken — that link just doesn’t lead anywhere. Let’s head back
        to your companion.
      </Text>
      <Link href={'/' as any}>
        <Text variant="label" color={colors.accent}>
          Take me home
        </Text>
      </Link>
    </Screen>
  );
}

export default function NotFound() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
