/**
 * Entry router. Flow: welcome → consent (age + legal) → onboarding → mode.
 * mode-as-place: a returning, consented user lands straight in their last
 * mode's companion surface.
 */
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { getProfile } from '@/profile';

export default function Index() {
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    getProfile().then((p) => {
      if (!p.consentAcceptedAt || !p.ageConfirmed) setRoute('/welcome');
      else if (!p.onboarded || !p.lastMode) setRoute('/onboarding');
      else setRoute(`/${p.lastMode}`);
    });
  }, []);

  if (!route) return <View style={{ flex: 1, backgroundColor: '#FBF6EE' }} />;
  return <Redirect href={route as any} />;
}
