/**
 * Sign-in — email + password.
 *
 * Password-only post 2026-05-27 (was magic-link). After a successful
 * sign-in the router takes over: if profile_setup_complete is false →
 * /profile-setup; else if no companionId → /companion-picker; else
 * /career.
 *
 * "Forgot password" routes to /forgot-password which uses Supabase's
 * resetPasswordForEmail with `siteRoute('/reset-password')` so the
 * email link points at the public site URL, never localhost.
 *
 * The consent checkbox is shown for both first-timers and returning
 * users — cheap UI, and the timestamp gets refreshed on each successful
 * sign-in either way.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, space } from '@/design/tokens';
import { Rise, Screen } from '@/components/ui';
import { AuthErrorBanner, AuthField, AuthSubmit, ConsentCheckbox, PasswordField } from '@/components/auth';
import { signIn, useAuth } from '@/auth/useAuth';
import { getProfile, setProfile } from '@/profile';

function Inner() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, loading, enabled } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On successful sign-in, ask the profile what's next.
  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const p = await getProfile();
      if (!p.profileSetupComplete) router.replace('/profile-setup' as any);
      else if (!p.companionId) router.replace('/companion-picker?next=/career' as any);
      else router.replace(`/${p.lastMode ?? 'career'}` as any);
    })();
  }, [loading, user, router]);

  const validate = (): string | null => {
    if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email.';
    if (password.length === 0) return 'Enter your password.';
    if (!consent) return 'Please accept the Terms and confirm your age.';
    return null;
  };

  async function onSubmit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await signIn(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // Refresh the local consent stamp — the useEffect above handles
    // routing once the session arrives.
    await setProfile({
      ageConfirmed: true,
      consentAcceptedAt: new Date().toISOString(),
    });
  }

  if (!enabled) {
    return (
      <Screen tabSafe={false}>
        <BackBar />
        <Rise>
          <View style={{ gap: 6, marginTop: space.sm }}>
            <Text variant="display" style={{ fontSize: 32 }}>
              Sign-in isn't configured.
            </Text>
            <Text variant="body" soft style={{ marginTop: 4 }}>
              Cairn works fully without an account — your data is on this device.
              The operator hasn't enabled cloud sign-in on this build yet.
            </Text>
          </View>
        </Rise>
      </Screen>
    );
  }

  return (
    <Screen tabSafe={false}>
      <BackBar />
      <Rise>
        <View style={{ gap: 6, marginTop: space.sm }}>
          <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
            WELCOME BACK
          </Text>
          <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 40, lineHeight: 44, color: colors.ink }}>
            Sign{' '}
            <Text
              style={{
                fontFamily: 'InstrumentSerif_400Regular_Italic',
                color: colors.accent,
                fontSize: 40,
              }}
            >
              in.
            </Text>
          </Text>
        </View>
      </Rise>

      <Rise delay={60}>
        <View style={{ gap: space.md }}>
          <AuthField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <PasswordField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            autoComplete="current-password"
            textContentType="password"
          />

          <View style={{ alignItems: 'flex-end' }}>
            <Pressable
              onPress={() => router.push('/forgot-password' as any)}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text variant="caption" color={colors.accent} style={{ fontSize: 13, fontWeight: '600' }}>
                Forgot password?
              </Text>
            </Pressable>
          </View>

          <ConsentCheckbox
            checked={consent}
            onToggle={() => setConsent((v) => !v)}
            onLinkPress={(which) => router.push(`/legal/${which}` as any)}
          />

          <AuthErrorBanner message={error} />

          <AuthSubmit
            label="Sign in"
            loadingLabel="Signing in…"
            loading={busy}
            onPress={onSubmit}
          />
        </View>
      </Rise>

      <Rise delay={120}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            paddingVertical: space.md,
          }}
        >
          <Text variant="caption" soft style={{ fontSize: 13 }}>
            New here?
          </Text>
          <Pressable
            onPress={() => router.replace('/sign-up' as any)}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text variant="caption" color={colors.accent} style={{ fontSize: 13, fontWeight: '700' }}>
              Create an account
            </Text>
          </Pressable>
        </View>
      </Rise>
    </Screen>
  );
}

function BackBar() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={{
          width: 40,
          height: 40,
          borderRadius: layout.radius.full,
          backgroundColor: colors.card,
          borderColor: colors.hairline,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ArrowLeft size={18} color={colors.ink} strokeWidth={1.75} />
      </Pressable>
    </View>
  );
}

export default function SignIn() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
