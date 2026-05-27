/**
 * Entry router.
 *
 * Web: show the marketing landing page (this is the public face of the
 * product — it has to do the selling work that a Fortune 500 career-coach
 * SaaS site does). The in-app flow (welcome → consent → onboarding → mode)
 * still kicks off from the landing's "Open the app" CTA.
 *
 * Native (iOS/Android): the user opens the app, not the landing. Bootstrap
 * directly into welcome → consent → onboarding → last-used mode.
 */
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { getProfile } from '@/profile';
import Landing from './landing';

export default function Index() {
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return; // landing renders, no routing needed
    getProfile().then((p) => {
      if (!p.consentAcceptedAt || !p.ageConfirmed) setRoute('/welcome');
      else if (!p.onboarded || !p.lastMode) setRoute('/onboarding');
      else setRoute(`/${p.lastMode}`);
    });
  }, []);

  if (Platform.OS === 'web') return <Landing />;
  if (!route) return <View style={{ flex: 1, backgroundColor: '#F8F7F4' }} />;
  return <Redirect href={route as any} />;
}
