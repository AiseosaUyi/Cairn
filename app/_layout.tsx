/**
 * Root layout: load the real typefaces — Fraunces (the companion's warm
 * voice) + Nunito (friendly, credible UI). Never system-ui. Hold the splash
 * on warm canvas until ready.
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
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  useFonts,
} from '@expo-google-fonts/fraunces';
import {
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
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
        backgroundColor: '#FBF6EE',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 16,
      }}
    >
      <RNText
        style={{ fontSize: 26, fontWeight: '700', color: '#2A2622', textAlign: 'center' }}
      >
        Something hiccuped on our end
      </RNText>
      <RNText
        style={{ fontSize: 17, color: '#7A726A', textAlign: 'center', lineHeight: 26 }}
      >
        Nothing you did, and your data is safe. Let’s try that again.
      </RNText>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={{
          minHeight: 54,
          paddingHorizontal: 28,
          borderRadius: 18,
          backgroundColor: '#E8943A',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RNText style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>
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
