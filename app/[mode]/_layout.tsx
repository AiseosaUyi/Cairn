/**
 * Per-mode shell. mode-as-place: the active mode recolors the whole world.
 * Within a mode the user gets real app navigation (tabs). Switching MODES is
 * deliberate and lives in the You tab — never a tab itself (design lock).
 */
import { Redirect, Tabs, useLocalSearchParams } from 'expo-router';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { type } from '@/design/tokens';
import type { Mode } from '@/design/tokens';

const VALID: Mode[] = ['career', 'health'];

function Bar() {
  const { colors } = useTheme();
  const icon =
    (label: string, glyph: string) =>
    ({ focused }: { focused: boolean }) =>
      (
        <Text
          variant="caption"
          color={focused ? colors.accent : colors.inkSoft}
          style={{ fontFamily: type.family.uiSemibold, textAlign: 'center' }}
        >
          {glyph}
          {'\n'}
          {label}
        </Text>
      );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.hairline,
          height: 68,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: icon('You & me', '◆') }} />
      <Tabs.Screen name="garden" options={{ tabBarIcon: icon('Garden', '🌿') }} />
      <Tabs.Screen name="checkin" options={{ tabBarIcon: icon('Check-in', '✶') }} />
      <Tabs.Screen name="you" options={{ tabBarIcon: icon('You', '☰') }} />
    </Tabs>
  );
}

export default function ModeLayout() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  if (!VALID.includes(mode as Mode)) return <Redirect href="/onboarding" />;
  return (
    <ThemeProvider mode={mode as Mode}>
      <Bar />
    </ThemeProvider>
  );
}
