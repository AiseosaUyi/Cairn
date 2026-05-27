/**
 * Root layout: load the typefaces — Inter (UI, body, headings, buttons) +
 * Instrument Serif (companion voice + one display moment per screen). The
 * pair targets mature consumer polish (Apple Family / Headspace / Stripe
 * Atlas), warmth via palette + cadence rather than rounded letterforms.
 * Hold the splash on warm canvas until ready.
 *
 * Low-bandwidth note (DESIGN.md): @expo-google-fonts is the pragmatic Expo
 * choice; self-hosted woff2 is a tracked follow-up. Fallback stays graceful.
 */
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { InstallBanner } from '@/components/InstallBanner';
import { InstallModal } from '@/components/InstallModal';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      {/* PWA install affordances — both components self-gate (web only,
          right device class, not already installed, not dismissed) so
          mounting them globally is safe. */}
      <InstallBanner />
      <InstallModal />
    </>
  );
}

/**
 * Global crash boundary (edge case: unexpected runtime error). Self-contained
 * — no theme/font dependency, since the crash may be inside them. Warm, calm,
 * recoverable. expo-router auto-mounts an exported ErrorBoundary.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F8F7F4',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 16,
      }}
    >
      <RNText
        style={{ fontSize: 24, fontWeight: '700', color: '#0E0D0B', textAlign: 'center' }}
      >
        Something hiccuped on our end
      </RNText>
      <RNText
        style={{ fontSize: 16, color: '#5E5A52', textAlign: 'center', lineHeight: 24 }}
      >
        Nothing you did, and your data is safe. Let’s try that again.
      </RNText>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={{
          minHeight: 52,
          paddingHorizontal: 24,
          borderRadius: 8,
          backgroundColor: '#A24F33',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RNText style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 }}>
          Try again
        </RNText>
      </Pressable>
      {__DEV__ && (
        <RNText style={{ fontSize: 12, color: '#9A8F82', textAlign: 'center' }}>
          {String(error?.message ?? error)}
        </RNText>
      )}
    </View>
  );
}
