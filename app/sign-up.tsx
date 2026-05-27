/**
 * Sign-up — full name + email + password + consent.
 *
 * After signUp() succeeds we check whether Supabase auto-confirmed the
 * email (the project's Auth settings control this):
 *   - Auto-confirm ON → session is created immediately → route to
 *     /profile-setup so the user finishes the post-sign-up details.
 *   - Auto-confirm OFF → no session yet; show a "check your email"
 *     state with the address. The confirmation link will land them
 *     on /sign-in, where the SDK auto-detects the session.
 *
 * The "Sign in instead" footer lets users swap if they came here by
 * mistake.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, shadow, space } from '@/design/tokens';
import { Screen, Rise } from '@/components/ui';
import { AuthErrorBanner, AuthField, AuthSubmit, ConsentCheckbox, PasswordField } from '@/components/auth';
import { signUp, useAuth } from '@/auth/useAuth';
import { setProfile } from '@/profile';

function Inner() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, loading, enabled } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-confirm path: a session shows up here right after signUp.
  useEffect(() => {
    if (!loading && user) router.replace('/profile-setup' as any);
  }, [loading, user, router]);

  const validate = (): string | null => {
    if (fullName.trim().length < 2) return 'Tell us your full name.';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
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

    // Persist consent + fullName locally first — even if email
    // confirmation is pending, we've captured these.
    await setProfile({
      fullName: fullName.trim(),
      ageConfirmed: true,
      consentAcceptedAt: new Date().toISOString(),
    });

    const res = await signUp(email, password, fullName);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // If user is set by now the useEffect above will redirect. Otherwise
    // we're in the email-confirmation-required path.
    setSent(true);
  }

  if (!enabled) {
    return (
      <Screen tabSafe={false}>
        <BackBar />
        <Rise>
          <View style={{ gap: 6, marginTop: space.sm }}>
            <Text variant="display" style={{ fontSize: 32 }}>
              Sign-up isn't configured.
            </Text>
            <Text variant="body" soft style={{ marginTop: 4 }}>
              Cairn works fully without an account — your data is on this device.
              The operator hasn't enabled cloud sign-up on this build yet.
            </Text>
          </View>
        </Rise>
      </Screen>
    );
  }

  if (sent) {
    return (
      <Screen tabSafe={false}>
        <BackBar />
        <Rise>
          <View
            style={{
              backgroundColor: colors.ink,
              borderRadius: layout.radius.card,
              padding: space.lg,
              gap: space.sm,
              ...shadow.raised,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Check size={16} color={colors.encourage} strokeWidth={2.25} />
              <Text
                variant="caption"
                color={colors.encourage}
                style={{ letterSpacing: 0.5, fontWeight: '700', fontSize: 11 }}
              >
                CONFIRM YOUR EMAIL
              </Text>
            </View>
            <Text
              color="#FFFFFF"
              style={{
                fontFamily: 'InstrumentSerif_400Regular',
                fontSize: 24,
                lineHeight: 28,
              }}
            >
              Check {email}.
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.7)">
              We sent you a confirmation link. Tap it from this device and
              you'll be signed in — back here automatically. Then we'll
              capture your profile and pick your companion.
            </Text>
            <Pressable
              onPress={() => router.replace('/sign-in' as any)}
              accessibilityRole="button"
              style={{
                alignSelf: 'flex-start',
                marginTop: space.xs,
                paddingHorizontal: space.md,
                paddingVertical: space.xs,
                borderRadius: layout.radius.full,
                backgroundColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <Text variant="caption" color="#FFFFFF" style={{ fontWeight: '600', fontSize: 12 }}>
                Go to sign in
              </Text>
            </Pressable>
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
            CREATE YOUR ACCOUNT
          </Text>
          <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 38, lineHeight: 42, color: colors.ink }}>
            Save your progress —{' '}
            <Text
              style={{
                fontFamily: 'InstrumentSerif_400Regular_Italic',
                color: colors.accent,
                fontSize: 38,
              }}
            >
              across every device.
            </Text>
          </Text>
        </View>
      </Rise>

      <Rise delay={60}>
        <View style={{ gap: space.md }}>
          <AuthField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Jane Doe"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
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
            placeholder="Min 8 characters"
            autoComplete="new-password"
            textContentType="newPassword"
            hint="At least 8 characters. Mix in something unguessable."
          />

          <ConsentCheckbox
            checked={consent}
            onToggle={() => setConsent((v) => !v)}
            onLinkPress={(which) => router.push(`/legal/${which}` as any)}
          />

          <AuthErrorBanner message={error} />

          <AuthSubmit
            label="Create account"
            loadingLabel="Creating…"
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
            Already have an account?
          </Text>
          <Pressable
            onPress={() => router.replace('/sign-in' as any)}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text variant="caption" color={colors.accent} style={{ fontSize: 13, fontWeight: '700' }}>
              Sign in
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

export default function SignUp() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
