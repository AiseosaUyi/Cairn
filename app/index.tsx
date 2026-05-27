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
import { getProfile, type Profile } from '@/profile';
import { supabaseEnabled } from '@/data/supabase';
import { supabase } from '@/data/supabase';
import Landing from './landing';

/**
 * Pick the right next screen for a returning user based on profile state.
 *
 * Order matters:
 *   1. No consent yet → /welcome (3-slide carousel ends at /get-started)
 *   2. Signed-in but profile-setup not done → /profile-setup
 *   3. No companion picked → /companion-picker
 *   4. Otherwise → their last-used mode (defaults to /career)
 */
function nextRouteFor(p: Profile, signedIn: boolean): string {
  if (!p.consentAcceptedAt || !p.ageConfirmed) return '/welcome';
  if (signedIn && !p.profileSetupComplete) return '/profile-setup';
  if (!p.companionId) return '/companion-picker?next=/career';
  return `/${p.lastMode ?? 'career'}`;
}

export default function Index() {
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return; // landing renders, no routing needed
    (async () => {
      const p = await getProfile();
      let signedIn = false;
      if (supabaseEnabled()) {
        try {
          const { data } = await supabase().auth.getSession();
          signedIn = !!data.session;
        } catch {
          /* fall back to guest */
        }
      }
      setRoute(nextRouteFor(p, signedIn));
    })();
  }, []);

  if (Platform.OS === 'web') return <Landing />;
  if (!route) return <View style={{ flex: 1, backgroundColor: '#F8F7F4' }} />;
  return <Redirect href={route as any} />;
}
