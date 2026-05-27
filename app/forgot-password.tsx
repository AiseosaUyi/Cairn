/**
 * Forgot password — request a reset email.
 *
 * The redirect URL comes from `siteRoute('/reset-password')` in useAuth,
 * which prefers EXPO_PUBLIC_SITE_URL over window.location.origin so the
 * email link points at the canonical public URL — not the localhost the
 * user happened to request it from.
 */
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { ThemeProvider, useTheme } from '@/design/theme';
import { Text } from '@/design/Text';
import { layout, shadow, space } from '@/design/tokens';
import { Rise, Screen } from '@/components/ui';
import { AuthErrorBanner, AuthField, AuthSubmit } from '@/components/auth';
import { requestPasswordReset } from '@/auth/useAuth';

function Inner() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await requestPasswordReset(email);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSent(true);
  }

  return (
    <Screen tabSafe={false}>
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

      <Rise>
        <View style={{ gap: 6, marginTop: space.sm }}>
          <Text variant="caption" soft style={{ letterSpacing: 0.6, fontWeight: '600', fontSize: 11 }}>
            RESET PASSWORD
          </Text>
          <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 36, lineHeight: 40, color: colors.ink }}>
            We'll email you a{' '}
            <Text style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', color: colors.accent, fontSize: 36 }}>
              reset link.
            </Text>
          </Text>
          <Text variant="lede" soft style={{ marginTop: 4 }}>
            Enter the email on your account. We'll send a link that opens
            a reset page on this site — same one you're on now.
          </Text>
        </View>
      </Rise>

      {sent ? (
        <Rise delay={60}>
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
                EMAIL SENT
              </Text>
            </View>
            <Text
              color="#FFFFFF"
              style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 22, lineHeight: 26 }}
            >
              Check {email}.
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.7)">
              The link opens a page where you can set a new password.
              Didn't get it? Check spam, or wait a minute and try again.
            </Text>
          </View>
        </Rise>
      ) : (
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
            <AuthErrorBanner message={error} />
            <AuthSubmit
              label="Send reset link"
              loadingLabel="Sending…"
              loading={busy}
              onPress={onSubmit}
            />
          </View>
        </Rise>
      )}
    </Screen>
  );
}

export default function ForgotPassword() {
  return (
    <ThemeProvider mode="career">
      <Inner />
    </ThemeProvider>
  );
}
